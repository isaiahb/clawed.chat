/**
 * OpenClaw Gateway WebSocket Proxy
 *
 * Ported from the demo branch's src/server/api/openclaw.ts.
 * Sits between the frontend and the OpenClaw Gateway, handling
 * the full challenge-response auth (including Ed25519 device identity)
 * server-side so the gateway token never reaches the browser.
 *
 * Frontend connects to /api/openclaw-ws (WebSocket upgrade).
 * This proxy opens a parallel WS to the real gateway, authenticates,
 * then transparently relays all messages both directions.
 *
 * Protocol:
 *   Frontend ←→ Proxy (this file) ←→ OpenClaw Gateway (ws://IP:18789)
 *
 * The frontend receives:
 *   - { type: "proxy.authenticated", protocol: 3 }  when auth succeeds
 *   - { type: "proxy.auth_failed", error: ... }      when auth fails
 *   - { type: "proxy.disconnected", code, reason }   when gateway drops
 *   - All other gateway messages are forwarded as-is (chat events, RPC responses, etc.)
 */

import type { ServerWebSocket } from "bun"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// ─── Config ──────────────────────────────────────────────────────────────────

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://136.117.21.95:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

// Gateway protocol constants
const CLIENT_ID = "gateway-client"
const CLIENT_MODE = "backend"
const ROLE = "operator"
const SCOPES = ["operator.admin"]
const PROTOCOL_VERSION = 3

// ─── Device Identity (Ed25519) ───────────────────────────────────────────────
//
// OpenClaw's v3 protocol optionally uses Ed25519 device identity for
// stronger auth. We generate a keypair on first run and persist it.
// This is the same approach the demo branch uses.

interface DeviceIdentity {
  deviceId: string
  publicKeyPem: string
  privateKeyPem: string
}

const IDENTITY_DIR = path.join(process.env.HOME || "/tmp", ".clawed-chat")
const IDENTITY_PATH = path.join(IDENTITY_DIR, "device-identity.json")

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url")
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem)
  const spki = key.export({ type: "spki", format: "der" })
  // Ed25519 SPKI prefix is 12 bytes, raw key is 32 bytes
  const ED25519_SPKI_PREFIX_LEN = 12
  if (spki.length === ED25519_SPKI_PREFIX_LEN + 32) {
    return spki.subarray(ED25519_SPKI_PREFIX_LEN)
  }
  return spki
}

function fingerprintPublicKey(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem)
  return crypto.createHash("sha256").update(raw).digest("hex")
}

function publicKeyRawBase64Url(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem))
}

function loadOrCreateDeviceIdentity(): DeviceIdentity {
  try {
    if (fs.existsSync(IDENTITY_PATH)) {
      const raw = fs.readFileSync(IDENTITY_PATH, "utf8")
      const parsed = JSON.parse(raw)
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === "string" &&
        typeof parsed.publicKeyPem === "string" &&
        typeof parsed.privateKeyPem === "string"
      ) {
        const derivedId = fingerprintPublicKey(parsed.publicKeyPem)
        return {
          deviceId: derivedId,
          publicKeyPem: parsed.publicKeyPem,
          privateKeyPem: parsed.privateKeyPem,
        }
      }
    }
  } catch {
    // Fall through to generate new identity
  }

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519")
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString()
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString()
  const deviceId = fingerprintPublicKey(publicKeyPem)

  // Persist to disk
  fs.mkdirSync(path.dirname(IDENTITY_PATH), { recursive: true, mode: 0o700 })
  const stored = {
    version: 1,
    deviceId,
    publicKeyPem,
    privateKeyPem,
    createdAtMs: Date.now(),
  }
  fs.writeFileSync(IDENTITY_PATH, JSON.stringify(stored, null, 2) + "\n", {
    mode: 0o600,
  })

  console.log(`[openclaw-proxy] Generated new device identity: ${deviceId.slice(0, 12)}...`)
  return { deviceId, publicKeyPem, privateKeyPem }
}

function signPayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem)
  const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key)
  return base64UrlEncode(sig)
}

// Load identity once at startup
let deviceIdentity: DeviceIdentity
try {
  deviceIdentity = loadOrCreateDeviceIdentity()
  console.log(`[openclaw-proxy] Device ID: ${deviceIdentity.deviceId.slice(0, 12)}...`)
} catch (err) {
  console.warn(`[openclaw-proxy] Device identity failed, using token-only auth:`, err)
  deviceIdentity = { deviceId: "", publicKeyPem: "", privateKeyPem: "" }
}

// ─── Build Connect Request ───────────────────────────────────────────────────

function buildConnectRequest(nonce: string): object {
  const signedAtMs = Date.now()
  const platform = process.platform

  const params: Record<string, unknown> = {
    minProtocol: PROTOCOL_VERSION,
    maxProtocol: PROTOCOL_VERSION,
    client: {
      id: CLIENT_ID,
      version: "1.0.0",
      platform,
      mode: CLIENT_MODE,
    },
    role: ROLE,
    scopes: SCOPES,
    caps: [],
    auth: {
      token: GATEWAY_TOKEN,
    },
  }

  // Add device identity if available (stronger auth)
  if (deviceIdentity.deviceId && deviceIdentity.privateKeyPem) {
    // Build v3 auth payload for signing
    const payloadParts = [
      "v3",
      deviceIdentity.deviceId,
      CLIENT_ID,
      CLIENT_MODE,
      ROLE,
      SCOPES.join(","),
      String(signedAtMs),
      GATEWAY_TOKEN,
      nonce,
      platform,
      "", // deviceFamily (empty)
    ]
    const payload = payloadParts.join("|")
    const signature = signPayload(deviceIdentity.privateKeyPem, payload)

    params.device = {
      id: deviceIdentity.deviceId,
      publicKey: publicKeyRawBase64Url(deviceIdentity.publicKeyPem),
      signature,
      signedAt: signedAtMs,
      nonce,
    }
  }

  return {
    type: "req",
    id: `connect-${Date.now()}`,
    method: "connect",
    params,
  }
}

// ─── Proxy State ─────────────────────────────────────────────────────────────

interface ProxyClient {
  gateway: WebSocket | null
  bufferedMessages: string[]
  gatewayReady: boolean
  authenticated: boolean
}

const clients = new Map<ServerWebSocket<unknown>, ProxyClient>()

// ─── Gateway Connection ──────────────────────────────────────────────────────

function connectToGateway(clientWs: ServerWebSocket<unknown>) {
  const gw = new WebSocket(GATEWAY_URL)

  gw.addEventListener("open", () => {
    console.log("[openclaw-proxy] Gateway WS open, waiting for challenge...")
  })

  gw.addEventListener("message", (event) => {
    const raw = typeof event.data === "string" ? event.data : event.data.toString()

    try {
      const msg = JSON.parse(raw)

      // Intercept connect.challenge — handle auth server-side
      if (msg.type === "event" && msg.event === "connect.challenge") {
        const nonce = msg.payload?.nonce || ""
        console.log("[openclaw-proxy] Received connect.challenge, authenticating...")

        const connectReq = buildConnectRequest(nonce)
        gw.send(JSON.stringify(connectReq))
        return
      }

      // Intercept hello-ok response — mark as authenticated
      if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
        console.log("[openclaw-proxy] Authenticated with Gateway ✓")
        const client = clients.get(clientWs)
        if (client) {
          client.authenticated = true
          client.gatewayReady = true

          // Flush buffered messages from the frontend
          for (const buffered of client.bufferedMessages) {
            gw.send(buffered)
          }
          client.bufferedMessages = []
        }

        // Notify frontend that auth succeeded
        try {
          clientWs.send(
            JSON.stringify({
              type: "proxy.authenticated",
              protocol: msg.payload.protocol,
            })
          )
        } catch {}
        return
      }

      // Intercept auth failure
      if (msg.type === "res" && !msg.ok) {
        const client = clients.get(clientWs)
        if (client && !client.authenticated) {
          console.error("[openclaw-proxy] Auth failed:", msg.error)
          try {
            clientWs.send(
              JSON.stringify({
                type: "proxy.auth_failed",
                error: msg.error || "Authentication failed",
              })
            )
          } catch {}
          return
        }
      }
    } catch {
      // Not JSON, just forward as-is
    }

    // Forward everything else to the frontend client
    try {
      clientWs.send(raw)
    } catch (err) {
      console.error("[openclaw-proxy] Error forwarding to client:", err)
    }
  })

  gw.addEventListener("close", (event) => {
    console.log(`[openclaw-proxy] Gateway disconnected: ${event.code} ${event.reason}`)
    try {
      clientWs.send(
        JSON.stringify({
          type: "proxy.disconnected",
          code: event.code,
          reason: event.reason,
        })
      )
    } catch {}
  })

  gw.addEventListener("error", (err) => {
    console.error("[openclaw-proxy] Gateway error:", err)
  })

  const client = clients.get(clientWs)
  if (client) {
    client.gateway = gw
  }
}

// ─── Exported WebSocket Handlers ─────────────────────────────────────────────
//
// These are used by Bun.serve() websocket handlers.
// Wire them up in the server entry point:
//
//   import { openclawWebSocket } from "./api/openclaw-proxy"
//
//   Bun.serve({
//     websocket: openclawWebSocket,
//     fetch(req, server) {
//       if (new URL(req.url).pathname === "/api/openclaw-ws") {
//         server.upgrade(req)
//         return
//       }
//       // ... rest of routing
//     }
//   })

export const openclawWebSocket = {
  open(ws: ServerWebSocket<unknown>) {
    clients.set(ws, {
      gateway: null,
      bufferedMessages: [],
      gatewayReady: false,
      authenticated: false,
    })
    console.log("[openclaw-proxy] Client connected, opening Gateway connection...")
    connectToGateway(ws)
  },

  message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
    const client = clients.get(ws)
    if (!client) return

    const data = typeof message === "string" ? message : message.toString()

    // Buffer messages until authenticated with gateway
    if (!client.authenticated || !client.gateway) {
      client.bufferedMessages.push(data)
      return
    }

    // Forward to gateway
    if (client.gateway.readyState === WebSocket.OPEN) {
      client.gateway.send(data)
    } else {
      client.bufferedMessages.push(data)
    }
  },

  close(ws: ServerWebSocket<unknown>, code: number, _reason: string) {
    console.log(`[openclaw-proxy] Client disconnected: ${code}`)
    const client = clients.get(ws)
    if (client?.gateway) {
      try {
        client.gateway.close()
      } catch {}
    }
    clients.delete(ws)
  },
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function checkGatewayHealth(): Promise<{
  connected: boolean
  url: string
}> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(GATEWAY_URL)
      const timeout = setTimeout(() => {
        ws.close()
        resolve({ connected: false, url: GATEWAY_URL })
      }, 3000)

      ws.addEventListener("open", () => {
        clearTimeout(timeout)
        ws.close()
        resolve({ connected: true, url: GATEWAY_URL })
      })

      ws.addEventListener("error", () => {
        clearTimeout(timeout)
        resolve({ connected: false, url: GATEWAY_URL })
      })
    } catch {
      resolve({ connected: false, url: GATEWAY_URL })
    }
  })
}
