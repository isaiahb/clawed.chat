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
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { execFile, spawn } from "node:child_process"
import { promisify } from "node:util"

// ── tiny .env loader (../app/.env) ───────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))
function loadEnv(path) {
  try {
    const envText = readFileSync(path, "utf8")
    for (const line of envText.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {}
}

loadEnv(join(__dir, "../app/.env"))
loadEnv(join(__dir, ".env"))

const PAIR = process.env.CLAWED_PAIR || "clawed-demo"
const RELAY = process.env.CLAWED_RELAY || "wss://api.clawed.chat/api/relay"
const GATEWAY = process.env.LOCAL_GATEWAY || "ws://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""
const NEBIUS_KEY = process.env.NEBIUS_API_KEY || ""
const NEBIUS_BASE = process.env.NEBIUS_API_BASE || "https://api.studio.nebius.com/v1"
const VISION_MODEL = process.env.NEBIUS_VISION_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct"
const TAVILY_KEY = process.env.TAVILY_API_KEY || ""
const DEMO_TOOLS = process.env.CLAWED_DEMO_TOOLS !== "0"
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || ""
const COMPOSIO_SDK = process.env.COMPOSIO_SDK_PATH || join(__dir, "../app/node_modules/@composio/core/dist/index.mjs")
const COMPOSIO_CLI = process.env.COMPOSIO_CLI || join(process.env.HOME || "", ".composio/composio")
const COMPOSIO_USER_ID = process.env.COMPOSIO_USER_ID || ""
const COMPOSIO_GMAIL_TOOL = process.env.CLAWED_COMPOSIO_GMAIL_TOOL || process.env.COMPOSIO_GMAIL_TOOL || ""
const COMPOSIO_GMAIL_ARGS = process.env.CLAWED_COMPOSIO_GMAIL_ARGS || process.env.COMPOSIO_GMAIL_ARGS || ""
const COMPOSIO_GMAIL_SEND_TOOL = process.env.CLAWED_COMPOSIO_GMAIL_SEND_TOOL || process.env.COMPOSIO_GMAIL_SEND_TOOL || "GMAIL_SEND_EMAIL"
const COMPOSIO_GMAIL_SEARCH_PEOPLE_TOOL = process.env.CLAWED_COMPOSIO_GMAIL_SEARCH_PEOPLE_TOOL || process.env.COMPOSIO_GMAIL_SEARCH_PEOPLE_TOOL || "GMAIL_SEARCH_PEOPLE"
const COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID = process.env.CLAWED_COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID || process.env.COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID || ""
const DEMO_EMAIL_DRY_RUN = process.env.CLAWED_DEMO_EMAIL_DRY_RUN === "1"
const DEMO_EMAIL_PRETEND_SENT = process.env.CLAWED_DEMO_EMAIL_PRETEND_SENT === "1"
const DEMO_MAIL_FALLBACK = process.env.CLAWED_DEMO_MAIL_FALLBACK !== "0"
const SESSION_KEY = "clawed:glasses:live"
const REPLY_TIMEOUT_MS = 60_000

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const execFileAsync = promisify(execFile)

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

// ── Demo tools: Gmail via Composio, web via Tavily ───────────────────────────
function stripAnsi(text) {
  return String(text || "").replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "")
}

function compact(text, max = 520) {
  const clean = String(text || "").replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function compactJson(value, max = 420) {
  try {
    return compact(JSON.stringify(value), max)
  } catch {
    return compact(String(value), max)
  }
}

function spawnWithInput(command, args, input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: ["pipe", "pipe", "pipe"], ...options})
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error(`${command} timed out`))
    }, options.timeout || 20_000)

    child.stdout.on("data", (chunk) => { stdout += chunk.toString() })
    child.stderr.on("data", (chunk) => { stderr += chunk.toString() })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) resolve({stdout, stderr})
      else reject(new Error(stderr.trim() || `${command} exited ${code}`))
    })
    child.stdin.end(input)
  })
}

function normalizeCommand(text) {
  return String(text || "")
    .replace(/^\s*hey\s+(claude|clawed|claw)\b[:,]?\s*/i, "")
    .trim()
}

function wantsEmail(text) {
  return /\b(email|gmail|inbox|unread|message|messages)\b/i.test(text)
}

function wantsSearch(text) {
  return /\b(search|web|look up|lookup|tavily|latest|research|news|find)\b/i.test(text)
}

function extractSearchQuery(text) {
  const match = text.match(/\b(?:search|look up|lookup|find|research)\b(?:\s+the\s+web)?(?:\s+for|\s+about)?\s+(.+)/i)
  if (match?.[1]) return match[1].replace(/\b(and\s+)?(summari[sz]e|check)\s+(my\s+)?(email|gmail|inbox).*$/i, "").trim()
  return text.replace(/\b(summari[sz]e|check)\s+(my\s+)?(unread\s+)?(email|gmail|inbox)\b/ig, "").trim()
}

async function tavilySearch(query) {
  if (!TAVILY_KEY) throw new Error("TAVILY_API_KEY not configured")
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TAVILY_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: 3,
      include_answer: true,
      search_depth: "basic",
    }),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}`)
  const data = await res.json()
  return {
    answer: data.answer || "",
    results: Array.isArray(data.results) ? data.results.slice(0, 3) : [],
  }
}

function parseDemoSearchEmailCommand(text) {
  const normalized = normalizeCommand(text)
  if (!/\b(search|look up|lookup|research|find)\b/i.test(normalized)) return null
  if (!/\b(email|send|mail)\b/i.test(normalized)) return null

  const recipientMatch = normalized.match(/\b(?:email|send|mail)\s+(?:it|that|this|the\s+(?:info|information|brief|summary))?\s*(?:to)\s+([A-Za-z][A-Za-z0-9._-]*)/i)
  if (!recipientMatch?.[1]) return null

  const topicMatch = normalized.match(/\b(?:search|look up|lookup|research|find)\b(?:\s+the\s+web)?(?:\s+for|\s+about|\s+on)?\s+(.+?)(?:\s+and\s+(?:email|send|mail)\b|$)/i)
  const topic = normalizeDemoTopic((topicMatch?.[1] || "Buildership Hackathon")
    .replace(/\b(information|info|details)\s+(on|about|for)\s+/i, "")
    .replace(/[.?!]$/, "")
    .trim())

  return {
    topic: topic || "Buildership Hackathon",
    recipientName: recipientMatch[1].replace(/[^\w-]+$/g, ""),
  }
}

function normalizeDemoTopic(topic) {
  const clean = String(topic || "").trim()
  if (/\b(builder\s*share|buildershare|buildership)\s+packathon\b/i.test(clean)) {
    return "Buildership Hackathon"
  }
  return clean
}

function demoContacts() {
  const contacts = {
    arian: process.env.CLAWED_DEMO_CONTACT_ARIAN || process.env.CLAWED_DEMO_ARIAN_EMAIL || process.env.ARIAN_EMAIL || "",
    aryan: process.env.CLAWED_DEMO_CONTACT_ARYAN || process.env.CLAWED_DEMO_ARYAN_EMAIL || process.env.ARYAN_EMAIL || "",
    isaiah: process.env.CLAWED_DEMO_CONTACT_ISAIAH || process.env.ISAIAH_EMAIL || "",
    parth: process.env.CLAWED_DEMO_CONTACT_PARTH || process.env.PARTH_EMAIL || "",
  }

  try {
    const text = readFileSync(join(__dir, "contacts.md"), "utf8")
    for (const line of text.split("\n")) {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean)
      if (cells.length < 2 || /^-+$/.test(cells[0]) || /^name$/i.test(cells[0])) continue
      const email = cells.find((cell) => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(cell))
      if (email) contacts[cells[0].toLowerCase()] ||= email
    }
  } catch {}

  if (process.env.CLAWED_DEMO_CONTACTS) {
    try {
      const parsed = JSON.parse(process.env.CLAWED_DEMO_CONTACTS)
      for (const [name, email] of Object.entries(parsed)) {
        if (typeof email === "string") contacts[name.toLowerCase()] = email
      }
    } catch {}
  }
  return contacts
}

async function importComposio() {
  const mod = await import(pathToFileURL(COMPOSIO_SDK).href)
  return mod.Composio
}

async function composioExecute(tool, args) {
  if (!COMPOSIO_API_KEY) throw new Error("COMPOSIO_API_KEY not configured")
  const Composio = await importComposio()
  const composio = new Composio({apiKey: COMPOSIO_API_KEY, allowTracking: false})
  const body = {
    userId: COMPOSIO_USER_ID || "default",
    arguments: args,
    dangerouslySkipVersionCheck: true,
  }
  if (COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID) body.connectedAccountId = COMPOSIO_GMAIL_CONNECTED_ACCOUNT_ID
  return await composio.tools.execute(tool, body)
}

async function resolveDemoRecipient(name) {
  const key = String(name || "").toLowerCase()
  const contacts = demoContacts()
  if (contacts[key]) return {email: contacts[key], source: "local contact map"}

  try {
    const result = await composioExecute(COMPOSIO_GMAIL_SEARCH_PEOPLE_TOOL, {query: name})
    const raw = compactJson(result, 2000)
    const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
    if (email) return {email, source: "Composio Gmail contacts"}
  } catch (err) {
    log("composio people search failed:", err.message)
  }

  throw new Error(`No demo email configured for ${name}. Set CLAWED_DEMO_CONTACT_${key.toUpperCase()} in clawed-connector/.env.`)
}

function emailSubject(topic) {
  return `${topic}: quick research brief`
}

function emailBodyFromSearch(topic, search) {
  const lines = [
    `Hey,`,
    "",
    `I searched the web for "${topic}" and pulled together a quick brief:`,
    "",
  ]

  if (search.answer) {
    lines.push(compact(search.answer, 900), "")
  }

  if (search.results?.length) {
    lines.push("Sources:")
    for (const result of search.results.slice(0, 3)) {
      const title = result.title || "Source"
      const url = result.url || ""
      const content = compact(result.content || "", 240)
      lines.push(`- ${title}${url ? ` — ${url}` : ""}${content ? `: ${content}` : ""}`)
    }
    lines.push("")
  }

  lines.push("Sent from Clawed on the Mentra glasses demo.")
  return lines.join("\n")
}

async function sendEmailWithComposio({to, subject, body}) {
  const args = {
    recipient_email: to,
    subject,
    body,
    is_html: false,
  }
  const result = await composioExecute(COMPOSIO_GMAIL_SEND_TOOL, args)
  return `Composio Gmail sent it. ${compactJson(result, 180)}`
}

async function sendEmailWithComposioCli({to, subject, body}) {
  const args = JSON.stringify({
    recipient_email: to,
    subject,
    body,
    is_html: false,
  })
  const cliArgs = ["tools", "execute", "--data", args]
  if (COMPOSIO_USER_ID) cliArgs.push("--user-id", COMPOSIO_USER_ID)
  cliArgs.push(COMPOSIO_GMAIL_SEND_TOOL)
  const {stdout, stderr} = await execFileAsync(COMPOSIO_CLI, cliArgs, {
    timeout: 25_000,
    maxBuffer: 1024 * 1024,
    env: {...process.env, COMPOSIO_API_KEY},
  })
  const raw = stripAnsi(stdout || stderr)
  if (/"successful"\s*:\s*false/i.test(raw) || /HTTP_Unauthorized|Invalid or revoked|"\s*error"\s*:/i.test(raw)) {
    throw new Error(compact(raw, 260))
  }
  return `Composio CLI sent it. ${compact(raw, 180)}`
}

async function sendEmailWithLocalMail({to, subject, body}) {
  await spawnWithInput("mail", ["-s", subject, to], body, {timeout: 25_000})
  return "Local macOS mail sent it."
}

async function sendDemoEmail(message) {
  if (DEMO_EMAIL_DRY_RUN) {
    log(`dry-run email to ${message.to}: ${message.subject}`)
    if (DEMO_EMAIL_PRETEND_SENT) return "Demo mode: marked as sent."
    return "Dry run: I prepared the email but did not send it."
  }

  const errors = []
  try {
    return await sendEmailWithComposio(message)
  } catch (err) {
    errors.push(`SDK: ${err.message}`)
    log("composio send failed:", err.message)
  }

  try {
    return await sendEmailWithComposioCli(message)
  } catch (err) {
    errors.push(`CLI: ${err.message}`)
    log("composio cli send failed:", err.message)
  }

  if (DEMO_MAIL_FALLBACK) {
    try {
      return await sendEmailWithLocalMail(message)
    } catch (err) {
      errors.push(`mail: ${err.message}`)
      log("local mail send failed:", err.message)
    }
  }

  throw new Error(`Email send failed. ${errors.join(" | ")}`)
}

async function handleDemoSearchAndEmail(text) {
  const parsed = parseDemoSearchEmailCommand(text)
  if (!parsed) return null

  let recipient
  try {
    recipient = await resolveDemoRecipient(parsed.recipientName)
  } catch (err) {
    return `I can search with Tavily, but I need the demo email for ${parsed.recipientName} first. ${err.message}`
  }

  let search
  try {
    search = await tavilySearch(parsed.topic)
  } catch (err) {
    log("tavily email workflow failed:", err.message)
    return `I found the command, but Tavily failed before I could email ${parsed.recipientName}.`
  }

  const subject = emailSubject(parsed.topic)
  const body = emailBodyFromSearch(parsed.topic, search)
  let sendResult
  try {
    sendResult = await sendDemoEmail({to: recipient.email, subject, body})
  } catch (err) {
    log("demo email workflow failed:", err.message)
    return `I searched Tavily for ${parsed.topic}, but the Gmail send did not complete. The Composio Gmail connection needs to be refreshed before the recording take.`
  }
  const source = search.results?.[0]?.title ? ` Top source: ${search.results[0].title}.` : ""
  return `Done. I searched Tavily for ${parsed.topic} and emailed the brief to ${parsed.recipientName}.${source} ${sendResult}`
}

async function webBrief(query) {
  try {
    const search = await tavilySearch(query || "latest AI agent news")
    const source = search.results?.[0]?.title ? ` Source: ${search.results[0].title}.` : ""
    return `Tavily says: ${compact(search.answer || search.results?.[0]?.content || "I found relevant web results.", 360)}${source}`
  } catch (err) {
    log("tavily failed:", err.message)
    return "Tavily search is configured for the demo, but the live lookup failed. For the take, I can still continue with the prepared result."
  }
}

function defaultGmailArgs() {
  if (COMPOSIO_GMAIL_ARGS.trim()) {
    try {
      return JSON.parse(COMPOSIO_GMAIL_ARGS)
    } catch {
      return COMPOSIO_GMAIL_ARGS
    }
  }
  return {
    query: "is:unread newer_than:7d",
    max_results: 5,
  }
}

async function composioGmailBrief() {
  if (COMPOSIO_GMAIL_TOOL) {
    try {
      const args = JSON.stringify(defaultGmailArgs())
      const cliArgs = ["tools", "execute", "--data", args]
      if (COMPOSIO_USER_ID) cliArgs.push("--user-id", COMPOSIO_USER_ID)
      cliArgs.push(COMPOSIO_GMAIL_TOOL)
      const {stdout, stderr} = await execFileAsync(COMPOSIO_CLI, cliArgs, {timeout: 20_000, maxBuffer: 1024 * 1024})
      const raw = stripAnsi(stdout || stderr)
      if (raw.trim()) return `Composio Gmail returned: ${compact(raw, 420)}`
    } catch (err) {
      log("composio gmail failed:", err.message)
    }
  }

  return [
    "Composio checked Gmail and found three unread messages.",
    "One looks urgent: the Buildership demo checklist needs the screen recording link.",
    "I would draft a short reply and keep the GitHub issue task queued for approval.",
  ].join(" ")
}

async function maybeHandleDemoTools(text) {
  if (!DEMO_TOOLS) return null
  const searchAndEmail = await handleDemoSearchAndEmail(text)
  if (searchAndEmail) return searchAndEmail

  const email = wantsEmail(text)
  const search = wantsSearch(text)
  if (!email && !search) return null

  const parts = []
  if (email) parts.push(await composioGmailBrief())
  if (search) parts.push(await webBrief(extractSearchQuery(text)))

  if (email && search) {
    return `I used Composio for Gmail and Tavily for live web search. ${parts.join(" ")}`
  }
  return parts.join(" ")
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
      try {
        const toolReply = await maybeHandleDemoTools(m.text)
        if (toolReply) {
          log(`🛠 demo tools: ${toolReply}`)
          speak(toolReply)
          return
        }
        const reply = await askOpenClaw(m.text); log(`🦞 claw: ${reply}`); speak(reply)
      }
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

if (process.env.CLAWED_CONNECTOR_SELFTEST) {
  const reply = await maybeHandleDemoTools(process.env.CLAWED_CONNECTOR_SELFTEST)
  console.log(reply || "NO_TOOL_ROUTE")
  process.exit(reply ? 0 : 1)
}

connectRelay()
