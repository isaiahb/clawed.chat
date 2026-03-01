/**
 * openclaw.service.ts — send messages to OpenClaw via Gateway RPC
 *
 * Handles communication with running OpenClaw instances.
 * Each OpenClaw VM runs a gateway at ws://<vm_ip>:18789.
 *
 * Inbound messages (user → agent):
 *   We open a WebSocket to the gateway and send a JSON-RPC call
 *   to the built-in `chat.send` method (same as OpenClaw's webchat UI).
 *   This triggers OpenClaw's auto-reply system.
 *
 * Outbound messages (agent → user):
 *   Responses come back asynchronously via our channel plugin,
 *   which HTTP POSTs to /api/openclaw/outbound. See openclaw.api.ts.
 *
 * Reference: Design Doc 10, Design Doc 11
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/** OpenClaw gateway port — default for all instances */
const GATEWAY_PORT = 18789

/** How long to wait for the RPC ack before giving up */
const RPC_TIMEOUT_MS = 15_000

/** How long to wait for gateway to become reachable after wake */
const WAKE_POLL_TIMEOUT_MS = 90_000

/** Interval between reachability checks during wake */
const WAKE_POLL_INTERVAL_MS = 3_000

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendMessageConfig {
  /** VM IP address (or tunnel URL for local instances) */
  ip: string
  /** OpenClaw Gateway auth token */
  token: string
  /** The user's text message */
  text: string
  /** User ID — used as the peerId for session routing */
  userId: string
  /** Where the message came from */
  source: "web" | "glasses" | "desktop"
}

export interface SendMessageResult {
  /** Whether the RPC was acknowledged by the gateway */
  dispatched: boolean
  /** The session key assigned by OpenClaw */
  sessionKey?: string
}

// ─── Send Message ────────────────────────────────────────────────────────────

/**
 * Send a message to an OpenClaw instance via Gateway RPC.
 *
 * Uses the built-in `chat.send` method — the same one OpenClaw's
 * webchat UI uses. This triggers the auto-reply pipeline which
 * eventually calls our channel plugin's `sendText` with the response.
 *
 * The response comes back asynchronously via HTTP POST to
 * /api/openclaw/outbound — this function only waits for the
 * initial RPC acknowledgment (not the full agent response).
 */
export async function sendMessage(config: SendMessageConfig): Promise<SendMessageResult> {
  const {ip, token, text, userId, source} = config
  const wsUrl = `ws://${ip}:${GATEWAY_PORT}`

  // Session key ties the conversation to a specific user + channel
  // Using a single session key per user means context is shared
  // across web, glasses, and desktop (Design Doc 10 decision)
  const sessionKey = `clawed:default:${userId}`
  const idempotencyKey = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise<SendMessageResult>((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let settled = false

    const cleanup = () => {
      if (!settled) {
        settled = true
        try { ws.close() } catch {}
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`[openclaw] RPC timeout after ${RPC_TIMEOUT_MS}ms`))
    }, RPC_TIMEOUT_MS)

    ws.addEventListener("open", () => {
      // Step 1: Authenticate with the gateway
      ws.send(JSON.stringify({
        method: "connect",
        params: {
          token,
          client: {
            id: userId,
            displayName: `${source}:${userId}`,
            type: "clawed-chat",
          },
        },
      }))

      // Step 2: Send the message via chat.send
      // This is the same RPC the webchat UI uses
      ws.send(JSON.stringify({
        method: "chat.send",
        params: {
          sessionKey,
          message: text,
          idempotencyKey,
        },
      }))
    })

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(String(event.data))

        // Look for the chat.send acknowledgment
        // OpenClaw responds with {ok: true, runId, status: "started"}
        if (data.ok === true || data.result?.ok === true) {
          clearTimeout(timeout)
          cleanup()
          resolve({
            dispatched: true,
            sessionKey,
          })
          return
        }

        // Handle explicit errors
        if (data.ok === false || data.error) {
          const errorMsg = data.error?.message ?? data.message ?? JSON.stringify(data)
          clearTimeout(timeout)
          cleanup()
          reject(new Error(`[openclaw] RPC error: ${errorMsg}`))
          return
        }
      } catch {
        // Ignore non-JSON messages (e.g. binary frames, pings)
      }
    })

    ws.addEventListener("error", (err) => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error(`[openclaw] WebSocket error connecting to ${wsUrl}: ${err}`))
    })

    ws.addEventListener("close", (event) => {
      clearTimeout(timeout)
      if (!settled) {
        settled = true
        // If we closed cleanly right after sending, treat as success
        // (some gateways close after RPC response)
        if (event.code === 1000) {
          resolve({dispatched: true, sessionKey})
        } else {
          reject(new Error(
            `[openclaw] connection closed unexpectedly (code=${event.code}, reason=${event.reason})`,
          ))
        }
      }
    })
  })
}

// ─── Health Check ────────────────────────────────────────────────────────────

/**
 * Check if an OpenClaw gateway is reachable and responding.
 * Used after waking a VM to confirm the gateway is up before sending messages.
 *
 * Tries an HTTP request to the gateway's health endpoint.
 * 200 = healthy, 401/429 = server is up (just needs auth or is rate limited).
 */
export async function isReachable(ip: string): Promise<boolean> {
  try {
    const res = await fetch(`http://${ip}:${GATEWAY_PORT}/health`, {
      signal: AbortSignal.timeout(5_000),
    })
    // 200 = healthy, 401 = up but needs auth, 429 = up but rate limited
    return res.status === 200 || res.status === 401 || res.status === 429
  } catch {
    return false
  }
}

// ─── Wait for Gateway ────────────────────────────────────────────────────────

/**
 * Poll until the OpenClaw gateway becomes reachable.
 * Used after waking a sleeping VM or after provisioning a new one.
 *
 * Native OpenClaw on Bun starts in ~3s, but the full VM boot
 * cycle (GCP start → systemd → gateway ready) takes longer.
 *
 * Throws if the gateway doesn't come up within WAKE_POLL_TIMEOUT_MS.
 */
export async function waitForGateway(ip: string): Promise<void> {
  const deadline = Date.now() + WAKE_POLL_TIMEOUT_MS
  let attempts = 0

  console.log(`[openclaw] waiting for gateway at ${ip}:${GATEWAY_PORT}...`)

  while (Date.now() < deadline) {
    attempts++
    const reachable = await isReachable(ip)

    if (reachable) {
      console.log(`[openclaw] gateway reachable after ${attempts} attempts`)
      return
    }

    await sleep(WAKE_POLL_INTERVAL_MS)
  }

  throw new Error(
    `[openclaw] gateway at ${ip}:${GATEWAY_PORT} not reachable after ${WAKE_POLL_TIMEOUT_MS}ms (${attempts} attempts)`,
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
