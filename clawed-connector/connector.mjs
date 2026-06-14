#!/usr/bin/env node
/**
 * Clawed Connector — bridges the clawed relay (your glasses miniapp) to your
 * LOCAL OpenClaw gateway. Runs next to OpenClaw on your Mac (so it can reach
 * the loopback gateway); connects OUT to the public relay (so the glasses
 * never need to reach your Mac directly).
 *
 *   glasses miniapp ──(relay, role=glasses)──► clawed.chat relay ◄──(role=agent)── THIS ──► ws://127.0.0.1:18789 (OpenClaw/Kimi)
 *
 * Flow:
 *   glasses → {type:"stt", text}            → chat.send to OpenClaw → reply → {type:"speak", text}
 *   glasses → {type:"photo", photoUrl, q?}  → Nebius vision describes → fed to OpenClaw → reply → {type:"speak"}
 *
 * No npm deps — Node 22+ global WebSocket + fetch. Run with `node connector.mjs`.
 * Config via env (auto-loaded from ../app/.env if present):
 *   CLAWED_PAIR (pair code, must match the miniapp) · OPENCLAW_GATEWAY_TOKEN
 *   CLAWED_RELAY (default wss://api.clawed.chat/api/relay)
 *   LOCAL_GATEWAY (default ws://127.0.0.1:18789)
 *   NEBIUS_API_KEY · NEBIUS_VISION_MODEL (for photos)
 */

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

// ── tiny .env loader (../app/.env) ───────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
try {
  const envText = readFileSync(join(__dir, "../app/.env"), "utf8")
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
} catch {}

const PAIR = process.env.CLAWED_PAIR || "clawed-demo"
const RELAY = process.env.CLAWED_RELAY || "wss://api.clawed.chat/api/relay"
const GATEWAY = process.env.LOCAL_GATEWAY || "ws://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""
const NEBIUS_KEY = process.env.NEBIUS_API_KEY || ""
const NEBIUS_BASE = process.env.NEBIUS_API_BASE || "https://api.studio.nebius.com/v1"
const VISION_MODEL = process.env.NEBIUS_VISION_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct"
const SESSION_KEY = "clawed:glasses:live"
const REPLY_TIMEOUT_MS = 60_000

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

// ── OpenClaw gateway round-trip (v4, token auth, operator scope) ─────────────
function extractText(message) {
  if (!message || typeof message !== "object") return ""
  const c = message.content
  if (Array.isArray(c)) return c.filter((b) => b?.type === "text" && b.text).map((b) => b.text).join("")
  return typeof c === "string" ? c : ""
}

const COLD_START_RE = /just came online|who am i\??|who are you\??|i('?m| am) (now )?online/i

function askOnce(message) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(GATEWAY)
    let settled = false, lastDelta = ""
    const finish = (fn) => { if (settled) return; settled = true; clearTimeout(t); try { ws.close() } catch {} ; fn() }
    const t = setTimeout(() => finish(() => (lastDelta ? resolve(lastDelta) : reject(new Error("reply timeout")))), REPLY_TIMEOUT_MS)
    ws.onerror = () => finish(() => reject(new Error("gateway connect failed")))
    ws.onclose = () => finish(() => reject(new Error("gateway closed")))
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(typeof e.data === "string" ? e.data : e.data.toString()) } catch { return }
      if (m.type === "event" && m.event === "connect.challenge") {
        ws.send(JSON.stringify({ type: "req", id: "c", method: "connect", params: {
          minProtocol: 4, maxProtocol: 4,
          client: { id: "gateway-client", displayName: "clawed-connector", version: "1.0.0", platform: "darwin", mode: "backend" },
          role: "operator", scopes: ["operator.admin"], caps: [], auth: { token: GATEWAY_TOKEN },
        }}))
      } else if (m.type === "res" && m.ok && m.payload?.type === "hello-ok") {
        ws.send(JSON.stringify({ type: "req", id: "s", method: "chat.send", params: {
          sessionKey: SESSION_KEY, message, deliver: false, idempotencyKey: String(Date.now()),
        }}))
      } else if (m.type === "res" && !m.ok) {
        const err = typeof m.error === "string" ? m.error : m.error?.message
        finish(() => reject(new Error(err || "gateway request failed")))
      } else if (m.type === "event" && m.event === "chat") {
        const txt = extractText(m.payload?.message)
        if (m.payload?.state === "delta" && txt) lastDelta = txt
        else if (m.payload?.state === "final") finish(() => resolve(txt || lastDelta || "(no reply)"))
        else if (m.payload?.state === "error") finish(() => reject(new Error(m.payload?.errorMessage || "agent error")))
      }
    }
  })
}

async function askOpenClaw(message) {
  const first = await askOnce(message)
  if (COLD_START_RE.test(first) && first.length < 160) {
    try { return await askOnce(message) } catch { return first }
  }
  return first
}

// ── Nebius vision (describe a glasses photo) ─────────────────────────────────
async function describePhoto(photoUrl, question) {
  const res = await fetch(`${NEBIUS_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${NEBIUS_KEY}` },
    body: JSON.stringify({
      model: VISION_MODEL, max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: photoUrl } },
        { type: "text", text: `Describe what's in this image in 1-2 sentences, focused on: ${question}` },
      ]}],
    }),
  })
  if (!res.ok) throw new Error(`vision ${res.status}`)
  const d = await res.json()
  return d.choices?.[0]?.message?.content?.trim() || "(couldn't see it)"
}

// ── Relay client (role=agent) ────────────────────────────────────────────────
function connectRelay() {
  const url = `${RELAY}?role=agent&pair=${encodeURIComponent(PAIR)}`
  log(`connecting to relay as agent (pair=${PAIR})…`)
  const ws = new WebSocket(url)
  const speak = (text) => ws.send(JSON.stringify({ type: "speak", text }))

  ws.onopen = () => log("relay connected — waiting for the glasses to pair")
  ws.onclose = () => { log("relay closed; reconnecting in 2s"); setTimeout(connectRelay, 2000) }
  ws.onerror = () => {}
  ws.onmessage = async (e) => {
    let m; try { m = JSON.parse(typeof e.data === "string" ? e.data : e.data.toString()) } catch { return }
    if (m.type === "paired") return log("👓 glasses paired")
    if (m.type === "peer_gone") return log("👓 glasses disconnected")

    if (m.type === "stt" && m.text) {
      log(`🎙  user: ${m.text}`)
      try { const reply = await askOpenClaw(m.text); log(`🦞 claw: ${reply}`); speak(reply) }
      catch (err) { log("ask failed:", err.message); speak("Sorry, I couldn't reach my brain just now.") }
    } else if (m.type === "photo" && (m.photoUrl || m.dataUrl)) {
      const q = m.question || "What am I looking at?"
      log(`📷 photo received; q=${q}`)
      try {
        const desc = await describePhoto(m.photoUrl || m.dataUrl, q)
        const reply = await askOpenClaw(`Through your smart-glasses camera you can see: ${desc}\n\nThe user asked: "${q}"\n\nAnswer in 1-2 conversational sentences, to be read aloud.`)
        log(`🦞 claw: ${reply}`); speak(reply)
      } catch (err) { log("photo flow failed:", err.message); speak("I couldn't make out what you're looking at.") }
    }
  }
}

log(`Clawed Connector — relay=${RELAY} pair=${PAIR} gateway=${GATEWAY}`)
if (!GATEWAY_TOKEN) log("⚠ no OPENCLAW_GATEWAY_TOKEN — gateway auth will fail")
connectRelay()
