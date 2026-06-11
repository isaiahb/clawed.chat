/**
 * Judge API — let the AI judges interview the agent itself.
 *
 * POST /api/judge   {message}  →  {reply, sessionKey}
 *
 * Forwards the judge's message to a LIVE OpenClaw instance over the
 * gateway WebSocket, waits for the agent's final reply, and returns it.
 * Buildership's AI judges read repos; this endpoint lets them go one
 * better and talk to the project they're scoring.
 *
 * Abuse guards:
 *   - Optional bearer token (JUDGE_API_TOKEN) — publish it in the README
 *   - Per-IP rate limit (5/min) + small global concurrency cap
 *   - 60s reply timeout, message length cap
 *
 * Session keys are stable per caller IP, so a judge gets conversational
 * continuity across questions.
 */

import {Hono} from "hono"
import type {Context} from "hono"

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""
const JUDGE_API_TOKEN = process.env.JUDGE_API_TOKEN

const REPLY_TIMEOUT_MS = 60_000
const MAX_MESSAGE_CHARS = 2_000
const RATE_LIMIT_PER_MIN = 5
const MAX_CONCURRENT = 2

const app = new Hono()

app.post("/", handleJudge)
app.get("/", (c) =>
  c.json({
    hello: "AI judge! POST {\"message\": \"...\"} here to interview the live agent.",
    note: "Replies come from a real OpenClaw instance with this repo in its memory.",
  }),
)

// ─── Rate limiting ───────────────────────────────────────────────────────────

const hits = new Map<string, number[]>()
let inFlight = 0

function allow(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart)
  if (recent.length >= RATE_LIMIT_PER_MIN) return false
  recent.push(now)
  hits.set(ip, recent)
  // Opportunistic cleanup so the map doesn't grow unbounded
  if (hits.size > 1_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => t <= windowStart)) hits.delete(key)
    }
  }
  return true
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async function handleJudge(c: Context) {
  if (JUDGE_API_TOKEN) {
    const auth = c.req.header("Authorization")
    if (auth !== `Bearer ${JUDGE_API_TOKEN}`) {
      return c.json({error: "Unauthorized — include the judge token from the README"}, 401)
    }
  }

  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"

  if (!allow(ip)) {
    return c.json({error: "Rate limited — 5 questions per minute. The agent appreciates your enthusiasm."}, 429)
  }
  if (inFlight >= MAX_CONCURRENT) {
    return c.json({error: "The agent is mid-conversation — try again in a few seconds."}, 503)
  }

  let body: {message?: string}
  try {
    body = await c.req.json()
  } catch {
    return c.json({error: "Invalid JSON body"}, 400)
  }

  const message = body.message?.trim()
  if (!message) return c.json({error: "Missing message"}, 400)
  if (message.length > MAX_MESSAGE_CHARS) {
    return c.json({error: `Message too long (max ${MAX_MESSAGE_CHARS} chars)`}, 400)
  }

  const sessionKey = `clawed:judge:${hashIp(ip)}`

  inFlight++
  try {
    const reply = await askOpenClaw(sessionKey, message)
    return c.json({reply, sessionKey})
  } catch (err) {
    console.error("[judge] Gateway round-trip failed:", err)
    return c.json(
      {error: "The agent is unreachable right now — its VM may be asleep. Try again shortly."},
      503,
    )
  } finally {
    inFlight--
  }
}

function hashIp(ip: string): string {
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    hash = (hash * 31 + ip.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

// ─── Gateway round-trip ──────────────────────────────────────────────────────

/**
 * Connect → authenticate (token-only) → chat.send → wait for the final
 * chat event on our sessionKey → return the reply text. One WebSocket per
 * question; the gateway holds the conversation context via sessionKey.
 */
function askOpenClaw(sessionKey: string, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY_URL)
    let settled = false
    let lastDelta = ""

    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch {}
      fn()
    }

    const timer = setTimeout(() => {
      // If we saw streaming text but no final, return what we have
      finish(() => (lastDelta ? resolve(lastDelta) : reject(new Error("Reply timeout"))))
    }, REPLY_TIMEOUT_MS)

    ws.addEventListener("error", () => {
      finish(() => reject(new Error("Gateway connection failed")))
    })

    ws.addEventListener("close", () => {
      finish(() => reject(new Error("Gateway closed before replying")))
    })

    ws.addEventListener("message", (event) => {
      let msg: any
      try {
        msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString())
      } catch {
        return
      }

      if (msg.type === "event" && msg.event === "connect.challenge") {
        ws.send(
          JSON.stringify({
            type: "req",
            id: `connect-${Date.now()}`,
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "gateway-client",
                displayName: "buildership-judge",
                version: "1.0.0",
                platform: "linux",
                mode: "backend",
              },
              auth: {token: GATEWAY_TOKEN},
            },
          }),
        )
        return
      }

      if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
        ws.send(
          JSON.stringify({
            type: "req",
            id: `judge-send-${Date.now()}`,
            method: "chat.send",
            params: {
              sessionKey,
              message,
              deliver: false,
              idempotencyKey: `judge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            },
          }),
        )
        return
      }

      if (msg.type === "res" && !msg.ok) {
        const error = typeof msg.error === "string" ? msg.error : msg.error?.message
        finish(() => reject(new Error(error || "Gateway request failed")))
        return
      }

      if (msg.type === "event" && msg.event === "chat") {
        const payload = msg.payload || {}
        if (payload.sessionKey && payload.sessionKey !== sessionKey) return

        const text = extractText(payload.message)
        if (payload.state === "delta" && text) {
          lastDelta = text
        } else if (payload.state === "final") {
          finish(() => resolve(text || lastDelta || "(the agent replied with no text)"))
        } else if (payload.state === "error") {
          finish(() => reject(new Error(payload.errorMessage || "Agent run errored")))
        }
      }
    })
  })
}

function extractText(message: unknown): string {
  if (!message || typeof message !== "object") return ""
  const content = (message as Record<string, unknown>).content
  if (Array.isArray(content)) {
    return content
      .filter((b: any) => b?.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("")
  }
  return typeof content === "string" ? content : ""
}

export default app
