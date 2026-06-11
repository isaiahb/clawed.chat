/**
 * LLM Proxy API — OpenAI-compatible proxy for managed instances
 *
 * POST /v1/chat/completions   → proxies to Anthropic (via OpenAI-compat format)
 * GET  /v1/models             → returns available models
 *
 * When a user deploys with "Use clawed.chat credits" instead of BYOK,
 * the VM's OpenClaw is configured to point at this proxy as its base URL.
 * The VM sends requests here with its instance token as the "API key".
 * We verify the token, then forward to Anthropic using OUR key.
 *
 * The VM never sees the real Anthropic API key.
 *
 * Reference: OpenClaw supports custom baseUrl per provider — see
 * .repos/openclaw/docs/providers/claude-max-api-proxy.md
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {isNebiusConfigured, nebiusRawCompletion, NEBIUS_TEXT_MODEL, NEBIUS_VISION_MODEL} from "../services/nebius.service"

const app = new Hono()

// ─── Config ──────────────────────────────────────────────────────────────────

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_VERSION = "2023-06-01"

/** Models we expose through the proxy */
const AVAILABLE_MODELS = [
  {id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5"},
  {id: "claude-haiku-4", name: "Claude Haiku 4"},
  // Nebius Token Factory open models (exposed when NEBIUS_API_KEY is set)
  ...(isNebiusConfigured()
    ? [
        {id: NEBIUS_TEXT_MODEL, name: `${NEBIUS_TEXT_MODEL} (Nebius)`},
        {id: NEBIUS_VISION_MODEL, name: `${NEBIUS_VISION_MODEL} (Nebius)`},
      ]
    : []),
]

/** Claude models route to Anthropic (format conversion); everything else
 * passes through to Nebius verbatim — both sides speak OpenAI format. */
function isClaudeModel(model: string | undefined): boolean {
  return !model || model.startsWith("claude")
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/v1/chat/completions", handleChatCompletion)
app.get("/v1/models", handleListModels)
app.get("/health", (c) => c.json({status: "ok"}))

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /v1/chat/completions — OpenAI-compatible chat completions endpoint.
 *
 * OpenClaw sends requests in OpenAI format. We convert to Anthropic Messages
 * API format, forward to Anthropic with our key, then convert back.
 *
 * Supports streaming (SSE) when stream: true is set.
 */
async function handleChatCompletion(c: Context) {
  // Verify the instance token from the Authorization header
  const instanceToken = extractBearerToken(c)
  if (!instanceToken) {
    return c.json({error: {message: "Missing or invalid Authorization header", type: "auth_error"}}, 401)
  }

  // TODO: Verify instanceToken matches an active instance in Convex
  // For hackathon demo, we accept any non-empty token
  // const instance = await convex.query("instances:getByToken", {token: instanceToken})
  // if (!instance) return c.json({error: {message: "Invalid instance token"}}, 401)

  try {
    const body = await c.req.json()
    const {model, messages, stream, max_tokens, temperature, top_p, stop} = body

    // ─── Nebius pass-through (OpenAI ↔ OpenAI, no conversion) ───────────
    if (!isClaudeModel(model) && isNebiusConfigured()) {
      const nebiusRes = await nebiusRawCompletion(body)
      if (!nebiusRes.ok) {
        const errText = await nebiusRes.text().catch(() => "")
        console.error(`[llm-proxy] Nebius error (${nebiusRes.status}):`, errText.slice(0, 300))
        return c.json({error: {message: `Upstream error: ${nebiusRes.status}`, type: "upstream_error"}}, 502)
      }
      return new Response(nebiusRes.body, {
        headers: stream
          ? {"Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive"}
          : {"Content-Type": "application/json"},
      })
    }

    if (!ANTHROPIC_API_KEY) {
      return c.json({error: {message: "LLM proxy not configured — missing ANTHROPIC_API_KEY", type: "server_error"}}, 500)
    }

    // Map OpenAI model IDs to Anthropic model IDs
    const anthropicModel = mapToAnthropicModel(model)

    // Convert OpenAI messages format to Anthropic format
    const {system, anthropicMessages} = convertMessages(messages)

    // Build Anthropic request
    const anthropicBody: Record<string, unknown> = {
      model: anthropicModel,
      messages: anthropicMessages,
      max_tokens: max_tokens || 4096,
    }

    if (system) anthropicBody.system = system
    if (temperature !== undefined) anthropicBody.temperature = temperature
    if (top_p !== undefined) anthropicBody.top_p = top_p
    if (stop) anthropicBody.stop_sequences = Array.isArray(stop) ? stop : [stop]

    // ─── Streaming ───────────────────────────────────────────────────────

    if (stream) {
      anthropicBody.stream = true

      const anthropicRes = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(anthropicBody),
      })

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text()
        console.error(`[llm-proxy] Anthropic error (${anthropicRes.status}):`, errText)
        return c.json({error: {message: `Upstream error: ${anthropicRes.status}`, type: "upstream_error"}}, 502)
      }

      // Stream Anthropic SSE → convert to OpenAI SSE format
      const requestId = `chatcmpl-${Date.now()}`

      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            const reader = anthropicRes.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            try {
              while (true) {
                const {done, value} = await reader.read()
                if (done) break

                buffer += decoder.decode(value, {stream: true})
                const lines = buffer.split("\n")
                buffer = lines.pop() || ""

                for (const line of lines) {
                  if (!line.startsWith("data: ")) continue
                  const data = line.slice(6).trim()
                  if (!data || data === "[DONE]") continue

                  try {
                    const event = JSON.parse(data)

                    // Convert Anthropic stream events to OpenAI format
                    if (event.type === "content_block_delta" && event.delta?.text) {
                      const openaiChunk = {
                        id: requestId,
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: model,
                        choices: [{
                          index: 0,
                          delta: {content: event.delta.text},
                          finish_reason: null,
                        }],
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`))
                    }

                    if (event.type === "message_stop") {
                      const stopChunk = {
                        id: requestId,
                        object: "chat.completion.chunk",
                        created: Math.floor(Date.now() / 1000),
                        model: model,
                        choices: [{
                          index: 0,
                          delta: {},
                          finish_reason: "stop",
                        }],
                      }
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`))
                      controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                    }
                  } catch {
                    // Skip malformed events
                  }
                }
              }
            } catch (err) {
              console.error("[llm-proxy] Stream error:", err)
            } finally {
              controller.close()
            }
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        },
      )
    }

    // ─── Non-streaming ───────────────────────────────────────────────────

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthropicBody),
    })

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}))
      const errMsg = (errBody as any)?.error?.message ?? `Upstream error: ${anthropicRes.status}`
      console.error(`[llm-proxy] Anthropic error (${anthropicRes.status}):`, errMsg)
      return c.json({error: {message: errMsg, type: "upstream_error"}}, 502)
    }

    const anthropicData = await anthropicRes.json() as any

    // Convert Anthropic response to OpenAI format
    const responseText = anthropicData.content
      ?.filter((block: any) => block.type === "text")
      ?.map((block: any) => block.text)
      ?.join("") ?? ""

    const openaiResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: responseText,
        },
        finish_reason: anthropicData.stop_reason === "end_turn" ? "stop" : (anthropicData.stop_reason ?? "stop"),
      }],
      usage: {
        prompt_tokens: anthropicData.usage?.input_tokens ?? 0,
        completion_tokens: anthropicData.usage?.output_tokens ?? 0,
        total_tokens: (anthropicData.usage?.input_tokens ?? 0) + (anthropicData.usage?.output_tokens ?? 0),
      },
    }

    return c.json(openaiResponse)
  } catch (err: any) {
    console.error("[llm-proxy] Error:", err.message)
    return c.json({error: {message: "Internal proxy error", type: "server_error"}}, 500)
  }
}

/**
 * GET /v1/models — returns available models in OpenAI format.
 * OpenClaw calls this to discover what models are available.
 */
async function handleListModels(c: Context) {
  return c.json({
    object: "list",
    data: AVAILABLE_MODELS.map((m) => ({
      id: m.id,
      object: "model",
      created: 1700000000,
      owned_by: "clawed-chat",
      permission: [],
      root: m.id,
      parent: null,
    })),
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract Bearer token from Authorization header */
function extractBearerToken(c: Context): string | null {
  const auth = c.req.header("Authorization")
  if (!auth || !auth.startsWith("Bearer ")) return null
  const token = auth.slice(7).trim()
  return token || null
}

/** Map OpenAI-style model IDs to Anthropic model IDs */
function mapToAnthropicModel(model: string): string {
  const map: Record<string, string> = {
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
    "claude-sonnet-4-5-20250514": "claude-sonnet-4-5-20250514",
    "claude-haiku-4": "claude-haiku-4-20250414",
    "claude-haiku-4-20250414": "claude-haiku-4-20250414",
    "claude-opus-4": "claude-opus-4-20250514",
  }
  // If the model is in our map, use the mapped value
  // Otherwise pass through (in case Anthropic adds new models)
  return map[model] ?? model
}

/**
 * Convert OpenAI messages format to Anthropic Messages API format.
 *
 * OpenAI format: [{role: "system", content: "..."}, {role: "user", content: "..."}]
 * Anthropic format: system is a top-level param, messages only has user/assistant
 */
function convertMessages(messages: Array<{role: string, content: string}>): {
  system: string | undefined
  anthropicMessages: Array<{role: string, content: string}>
} {
  let system: string | undefined
  const anthropicMessages: Array<{role: string, content: string}> = []

  for (const msg of messages) {
    if (msg.role === "system") {
      // Anthropic takes system as a top-level parameter, not in messages
      system = system ? `${system}\n\n${msg.content}` : msg.content
    } else if (msg.role === "user" || msg.role === "assistant") {
      anthropicMessages.push({role: msg.role, content: msg.content})
    }
    // Skip tool/function messages for now
  }

  // Anthropic requires messages to start with a user message
  // If first message is assistant, prepend an empty user message
  if (anthropicMessages.length > 0 && anthropicMessages[0]?.role === "assistant") {
    anthropicMessages.unshift({role: "user", content: "(continuing conversation)"})
  }

  return {system, anthropicMessages}
}

export default app
