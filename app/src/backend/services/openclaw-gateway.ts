/**
 * OpenClaw gateway round-trip — connect → chat.send → await the agent's reply.
 *
 * Shared by /api/judge (interview the agent) and /api/vision (the agent
 * answers about what the glasses saw). One WebSocket per call; the gateway
 * holds conversation context via sessionKey. v4 protocol, token auth,
 * operator.admin scope (required for chat.send).
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""
const REPLY_TIMEOUT_MS = 60_000

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

/** A brand-new session's first agent turn is sometimes a "waking up" meta
 * reply instead of answering. Detect it so we can re-ask on the now-warm
 * session. A real answer won't match these phrases. */
const COLD_START_RE = /just came online|who am i\??|who are you\??|i('?m| am) (now )?online/i

/**
 * Ask the OpenClaw agent and return a real answer. If the first reply is the
 * cold-start greeting (fresh session), re-ask once on the same (now warm)
 * session. Rejects on connection/auth/timeout failure.
 */
export async function askOpenClaw(sessionKey: string, message: string): Promise<string> {
  const first = await askOpenClawOnce(sessionKey, message)
  if (COLD_START_RE.test(first) && first.length < 160) {
    try {
      return await askOpenClawOnce(sessionKey, message)
    } catch {
      return first
    }
  }
  return first
}

/** One connect → chat.send → reply round-trip (no warm-up retry). */
function askOpenClawOnce(sessionKey: string, message: string): Promise<string> {
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
      finish(() => (lastDelta ? resolve(lastDelta) : reject(new Error("Reply timeout"))))
    }, REPLY_TIMEOUT_MS)

    ws.addEventListener("error", () => finish(() => reject(new Error("Gateway connection failed"))))
    ws.addEventListener("close", () => finish(() => reject(new Error("Gateway closed before replying"))))

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
              minProtocol: 4,
              maxProtocol: 4,
              client: {id: "gateway-client", displayName: "clawed-backend", version: "1.0.0", platform: "linux", mode: "backend"},
              role: "operator",
              scopes: ["operator.admin"],
              caps: [],
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
            id: `send-${Date.now()}`,
            method: "chat.send",
            params: {
              sessionKey,
              message,
              deliver: false,
              idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
        // Dedicated WS per call — any chat event is our reply (don't filter by sessionKey).
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
