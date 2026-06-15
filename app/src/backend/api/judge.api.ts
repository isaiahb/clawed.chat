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
import {askOpenClaw} from "../services/openclaw-gateway"

const JUDGE_API_TOKEN = process.env.JUDGE_API_TOKEN

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

export default app
