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

const app = new Hono()

app.post("/", handleVision)

const VISION_SYSTEM = `You are the eyes of a personal AI agent on smart glasses.
The user is looking at something and asked a question about it.
Reply with STRICT JSON, nothing else:
{"answer": "<1-3 conversational sentences, written to be read aloud>",
 "identified": "<short name of the main subject, e.g. 'Alcatraz Island' or 'Bosch dishwasher heat pump'>",
 "searchQuery": "<a web search query that would meaningfully improve the answer with live facts, or null if none would>"}`

const SYNTHESIS_SYSTEM = `You are a personal AI agent speaking into your user's ear through smart glasses.
Combine what you saw with the live web results into ONE conversational answer, 1-3 sentences, no markdown, written to be read aloud. Lead with the most useful fact.`

async function handleVision(c: Context) {
  if (VISION_API_TOKEN) {
    const auth = c.req.header("Authorization")
    if (auth !== `Bearer ${VISION_API_TOKEN}`) {
      return c.json({error: "Unauthorized"}, 401)
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

  const res = await fetch(photoUrl)
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
