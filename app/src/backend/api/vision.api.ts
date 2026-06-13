/**
 * Vision API — the glasses' eyes.
 *
 * POST /api/vision
 *   {photoUrl, mimeType?, question}
 *   → {answer, identified?, sources?: [{title, url}]}
 *
 * Pipeline: camera frame → Nebius vision model (identify + answer) →
 * optional Tavily live-web lookup when the model asks for one → Nebius
 * synthesizes a short spoken-ready answer with the fresh facts.
 *
 * Auth: bearer token checked against VISION_API_TOKEN when set (the
 * miniapp ships the token in its settings). No Clerk — the caller is a
 * phone-side JS context, not a browser session.
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {isNebiusConfigured, nebiusChat, nebiusVision} from "../services/nebius.service"
import {isTavilyConfigured, tavilySearch} from "../services/tavily.service"

const VISION_API_TOKEN = process.env.VISION_API_TOKEN
const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const RATE_LIMIT_PER_MIN = 10

const app = new Hono()

app.post("/", handleVision)

// Per-IP rate limit — the /demo page calls this without a bearer token,
// so the public surface is bounded even when VISION_API_TOKEN is unset.
const hits = new Map<string, number[]>()

function allowVision(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - 60_000
  const recent = (hits.get(ip) ?? []).filter((t) => t > windowStart)
  if (recent.length >= RATE_LIMIT_PER_MIN) return false
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 1_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => t <= windowStart)) hits.delete(key)
    }
  }
  return true
}

const VISION_SYSTEM = `You are the eyes of a personal AI agent on smart glasses.
The user is looking at something and asked a question about it.
Reply with STRICT JSON, nothing else:
{"answer": "<1-3 conversational sentences, written to be read aloud>",
 "identified": "<short name of the main subject, e.g. 'Alcatraz Island' or 'Bosch dishwasher heat pump'>",
 "searchQuery": "<a web search query that would meaningfully improve the answer with live facts, or null if none would>"}`

const SYNTHESIS_SYSTEM = `You are a personal AI agent speaking into your user's ear through smart glasses.
Combine what you saw with the live web results into ONE conversational answer, 1-3 sentences, no markdown, written to be read aloud. Lead with the most useful fact.`

async function handleVision(c: Context) {
  // Bearer token (miniapp) bypasses the rate limit; anonymous demo
  // traffic is rate-limited per IP instead of rejected.
  const auth = c.req.header("Authorization")
  const hasValidToken = VISION_API_TOKEN ? auth === `Bearer ${VISION_API_TOKEN}` : false

  if (!hasValidToken) {
    const ip =
      c.req.header("cf-connecting-ip") ||
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    if (!allowVision(ip)) {
      return c.json({error: "Rate limited — 10 looks per minute. Blink less."}, 429)
    }
  }

  if (!isNebiusConfigured()) {
    return c.json({error: "Vision not configured — missing NEBIUS_API_KEY"}, 503)
  }

  let body: {photoUrl?: string; mimeType?: string; question?: string}
  try {
    body = await c.req.json()
  } catch {
    return c.json({error: "Invalid JSON body"}, 400)
  }

  const {photoUrl, mimeType, question} = body
  if (!photoUrl || !question) {
    return c.json({error: "Missing photoUrl or question"}, 400)
  }

  try {
    // Fetch the frame server-side (the photo URL may be short-lived or
    // unreachable from Nebius) and inline it as a data URL.
    const imageDataUrl = await fetchAsDataUrl(photoUrl, mimeType)

    // 1. Look — identify + draft answer + decide if live facts would help
    const raw = await nebiusVision(imageDataUrl, question, {system: VISION_SYSTEM, maxTokens: 500})
    const parsed = parseVisionJson(raw)

    // 2. Look it up — live web context via Tavily, when worth it
    if (parsed.searchQuery && isTavilyConfigured()) {
      try {
        const search = await tavilySearch(parsed.searchQuery, {maxResults: 4})
        const sources = search.results.slice(0, 3).map((r) => ({title: r.title, url: r.url}))

        // 3. Say it — fold fresh facts into one spoken-ready answer
        const context = [
          search.answer ? `Synthesized answer: ${search.answer}` : "",
          ...search.results.map((r) => `- ${r.title}: ${r.content.slice(0, 240)}`),
        ]
          .filter(Boolean)
          .join("\n")

        const answer = await nebiusChat(
          [
            {role: "system", content: SYNTHESIS_SYSTEM},
            {
              role: "user",
              content: `I looked at: ${parsed.identified ?? "the scene"}\nMy first impression: ${parsed.answer}\nThe user asked: ${question}\n\nLive web results for "${parsed.searchQuery}":\n${context}`,
            },
          ],
          {maxTokens: 300},
        )

        return c.json({answer: answer.trim(), identified: parsed.identified, sources})
      } catch (err) {
        console.error("[vision] Tavily lookup failed, returning vision-only answer:", err)
      }
    }

    return c.json({answer: parsed.answer, identified: parsed.identified})
  } catch (err) {
    console.error("[vision] Pipeline failed:", err)
    return c.json({error: "Vision pipeline failed"}, 502)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchAsDataUrl(photoUrl: string, mimeType?: string): Promise<string> {
  if (photoUrl.startsWith("data:")) return photoUrl

  // Some hosts (e.g. Wikimedia) reject fetches without a UA. Glasses/demo
  // frames arrive as data: URLs and skip this path entirely.
  const res = await fetch(photoUrl, {
    headers: {"User-Agent": "clawed.chat-vision/1.0 (+https://clawed.chat)"},
  })
  if (!res.ok) throw new Error(`Photo fetch failed: ${res.status}`)

  const contentLength = Number(res.headers.get("content-length") || 0)
  if (contentLength > MAX_PHOTO_BYTES) throw new Error("Photo too large")

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength > MAX_PHOTO_BYTES) throw new Error("Photo too large")

  const type = mimeType || res.headers.get("content-type") || "image/jpeg"
  return `data:${type};base64,${buf.toString("base64")}`
}

function parseVisionJson(raw: string): {answer: string; identified?: string; searchQuery?: string} {
  try {
    // Strip code fences if the model added them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const parsed = JSON.parse(cleaned) as {answer?: string; identified?: string; searchQuery?: string | null}
    if (parsed.answer) {
      return {
        answer: parsed.answer,
        identified: parsed.identified || undefined,
        searchQuery: parsed.searchQuery || undefined,
      }
    }
  } catch {
    // Model ignored the JSON contract — its raw text is still a usable answer
  }
  return {answer: raw.trim()}
}

export default app
