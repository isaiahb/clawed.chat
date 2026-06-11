/**
 * Nebius Token Factory — OpenAI-compatible inference.
 *
 * Used for:
 *   - Agent reasoning via the LLM proxy (open models, our key, VM never sees it)
 *   - Vision queries from the glasses miniapp (camera frame → description/answer)
 *
 * Endpoint + models are env-overridable so we can switch models without a deploy:
 *   NEBIUS_API_KEY       — required to enable Nebius routing
 *   NEBIUS_API_BASE      — default https://api.studio.nebius.com/v1
 *   NEBIUS_TEXT_MODEL    — default moonshotai/Kimi-K2-Instruct
 *   NEBIUS_VISION_MODEL  — default Qwen/Qwen2.5-VL-72B-Instruct
 */

const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY
const NEBIUS_API_BASE = process.env.NEBIUS_API_BASE || "https://api.studio.nebius.com/v1"

export const NEBIUS_TEXT_MODEL = process.env.NEBIUS_TEXT_MODEL || "moonshotai/Kimi-K2-Instruct"
export const NEBIUS_VISION_MODEL = process.env.NEBIUS_VISION_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct"

export function isNebiusConfigured(): boolean {
  return Boolean(NEBIUS_API_KEY)
}

type ContentBlock =
  | {type: "text"; text: string}
  | {type: "image_url"; image_url: {url: string}}

export interface NebiusMessage {
  role: "system" | "user" | "assistant"
  content: string | ContentBlock[]
}

export interface NebiusChatOptions {
  model?: string
  maxTokens?: number
  temperature?: number
}

/**
 * Raw pass-through to Nebius chat completions — body and response stay in
 * OpenAI format. Used by the LLM proxy for streaming relays.
 */
export async function nebiusRawCompletion(body: Record<string, unknown>): Promise<Response> {
  if (!NEBIUS_API_KEY) throw new Error("NEBIUS_API_KEY not configured")
  return fetch(`${NEBIUS_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NEBIUS_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
}

/** Non-streaming completion → assistant text. */
export async function nebiusChat(messages: NebiusMessage[], opts: NebiusChatOptions = {}): Promise<string> {
  const res = await nebiusRawCompletion({
    model: opts.model || NEBIUS_TEXT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.6,
    stream: false,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`Nebius error ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{message?: {content?: string}}>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error("Nebius returned an empty completion")
  return text
}

/**
 * Vision completion — image (URL or data URL) + question → answer text.
 */
export async function nebiusVision(
  imageUrl: string,
  question: string,
  opts: NebiusChatOptions & {system?: string} = {},
): Promise<string> {
  const messages: NebiusMessage[] = []
  if (opts.system) messages.push({role: "system", content: opts.system})
  messages.push({
    role: "user",
    content: [
      {type: "image_url", image_url: {url: imageUrl}},
      {type: "text", text: question},
    ],
  })
  return nebiusChat(messages, {...opts, model: opts.model || NEBIUS_VISION_MODEL})
}
