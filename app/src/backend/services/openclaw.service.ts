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
 * Auth flow (challenge-response):
 *   1. Client opens WebSocket → gateway sends `connect.challenge` event with a nonce
 *   2. Client sends `connect` RPC request with the nonce + auth token
 *   3. Gateway responds with `connect.ready` event (or RPC ok:true for connect)
 *   4. Client can now send `chat.send` and other RPC calls
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
 * Handles the full challenge-response auth flow:
 *   1. Open WS → receive connect.challenge with nonce
 *   2. Send connect RPC with nonce + token → wait for auth success
 *   3. Send chat.send RPC → wait for ack
 *
 * The agent's response comes back asynchronously via HTTP POST to
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
    let authenticated = false
    let rpcIdCounter = 1

    // Track pending RPC requests by their ID
    const pendingRpcs = new Map<number, {
      resolve: (value: any) => void
      reject: (error: Error) => void
    }>()

    const cleanup = () => {
      if (!settled) {
        settled = true
        // Reject all pending RPCs
        for (const [, pending] of pendingRpcs) {
          pending.reject(new Error("[openclaw] connection closed with pending RPCs"))
        }
        pendingRpcs.clear()
        try { ws.close() } catch {}
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`[openclaw] RPC timeout after ${RPC_TIMEOUT_MS}ms`))
    }, RPC_TIMEOUT_MS)

    /** Send a JSON-RPC request and return a promise for the response */
    function sendRpc(method: string, params: Record<string, unknown>): Promise<any> {
      const id = rpcIdCounter++
      return new Promise((rpcResolve, rpcReject) => {
        pendingRpcs.set(id, {resolve: rpcResolve, reject: rpcReject})
        const frame = JSON.stringify({id, method, params})
        ws.send(frame)
      })
    }

    /** Handle the connect flow after receiving the challenge nonce */
    async function handleConnect(nonce: string) {
      try {
        // Send the connect RPC with nonce + auth token
        // This mirrors what the OpenClaw client SDK does in sendConnect()
        const connectParams: Record<string, unknown> = {
          nonce,
          auth: {
            token,
          },
          role: "operator",
          scopes: ["operator.admin"],
          signedAtMs: Date.now(),
          client: {
            id: userId,
            displayName: `${source}:${userId}`,
            type: "clawed-chat",
          },
          platform: "linux",
          supportedEncodings: ["json"],
        }

        await sendRpc("connect", connectParams)
        authenticated = true

        // Now send the chat message
        const chatResult = await sendRpc("chat.send", {
          sessionKey,
          message: text,
          idempotencyKey,
        })

        clearTimeout(timeout)
        cleanup()
        resolve({
          dispatched: true,
          sessionKey,
        })
      } catch (err: any) {
        clearTimeout(timeout)
        cleanup()
        reject(new Error(`[openclaw] RPC failed: ${err.message}`))
      }
    }

    ws.addEventListener("open", () => {
      // Don't send anything on open — wait for the connect.challenge event
      // The gateway will send it automatically
    })

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(String(event.data))

        // ── Handle events (type: "event") ──────────────────────────────
        if (data.type === "event") {
          // Challenge-response: gateway sends nonce, we respond with connect RPC
          if (data.event === "connect.challenge") {
            const nonce = data.payload?.nonce
            if (!nonce) {
              clearTimeout(timeout)
              cleanup()
              reject(new Error("[openclaw] connect.challenge missing nonce"))
              return
            }
            handleConnect(nonce)
            return
          }

          // Ignore other events (tick, chat:user-message, etc.)
          return
        }

        // ── Handle RPC responses (have an id field) ────────────────────
        if (typeof data.id === "number") {
          const pending = pendingRpcs.get(data.id)
          if (!pending) return

          // Skip "accepted" intermediate status — wait for "final" or ok/error
          if (data.payload?.status === "accepted") return

          pendingRpcs.delete(data.id)

          if (data.ok === true) {
            pending.resolve(data.payload)
          } else {
            const errorMsg = data.error?.message ?? data.payload?.message ?? "unknown RPC error"
            pending.reject(new Error(errorMsg))
          }
          return
        }

        // ── Handle legacy response format (no id) ─────────────────────
        if (data.ok === true && !authenticated) {
          // Might be a connect ack in some gateway versions
          authenticated = true
          return
        }

        if (data.ok === false || data.error) {
          const errorMsg = data.error?.message ?? data.message ?? JSON.stringify(data)
          clearTimeout(timeout)
          cleanup()
          reject(new Error(`[openclaw] gateway error: ${errorMsg}`))
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
        // Reject remaining pending RPCs
        for (const [, pending] of pendingRpcs) {
          pending.reject(new Error(`[openclaw] connection closed (code=${event.code})`))
        }
        pendingRpcs.clear()

        // If we closed cleanly right after sending, treat as success
        if (event.code === 1000 && authenticated) {
          resolve({dispatched: true, sessionKey})
        } else {
          reject(new Error(
            `[openclaw] connection closed unexpectedly (code=${event.code}, reason=${event.reason || "none"})`,
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
 * Tries an HTTP request to the gateway root.
 * 200 = healthy, 401 = up (needs auth), 404 = up (root returns 404), 429 = rate limited.
 */
export async function isReachable(ip: string): Promise<boolean> {
  try {
    const res = await fetch(`http://${ip}:${GATEWAY_PORT}/`, {
      signal: AbortSignal.timeout(5_000),
    })
    // 200 = healthy, 401 = up but needs auth, 404 = up (gateway root), 429 = rate limited
    return res.status === 200 || res.status === 401 || res.status === 404 || res.status === 429
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
