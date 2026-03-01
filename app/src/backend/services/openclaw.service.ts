/**
 * openclaw.service.ts — proxy chat to OpenClaw WebSocket gateway
 *
 * Handles communication with running OpenClaw instances.
 * Each OpenClaw VM runs a gateway at ws://<vm_ip>:18789 that accepts
 * messages via WebSocket and returns agent responses.
 *
 * For the hackathon, we use short-lived WebSocket connections (open, send, recv, close).
 * Production would want connection pooling per active instance.
 *
 * Also handles the sleep/wake flow:
 *   - If instance is sleeping, wake it first (via instance.service.ts)
 *   - Wait for gateway to become reachable
 *   - Then send the message
 *
 * Reference: https://docs.openclaw.ai
 */

// ─── Config ──────────────────────────────────────────────────────────────────

/** OpenClaw gateway port — default for all instances */
const GATEWAY_PORT = 18789

/** How long to wait for the gateway to respond before giving up */
const MESSAGE_TIMEOUT_MS = 60_000

/** How long to wait for gateway to become reachable after wake */
const WAKE_POLL_TIMEOUT_MS = 90_000

/** Interval between reachability checks during wake */
const WAKE_POLL_INTERVAL_MS = 3_000

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendMessageConfig {
  /** VM IP address of the OpenClaw instance */
  ip: string
  /** The user's message to send to the agent */
  message: string
  /** Optional channel identifier (defaults to "clawed.chat") */
  channel?: string
}

export interface AgentResponse {
  /** The agent's text response */
  text: string
  /** Whether the agent performed any actions (browsed, clicked, etc.) */
  hadActions: boolean
  /** Raw response data for debugging */
  raw?: unknown
}

// ─── Send Message ────────────────────────────────────────────────────────────

/**
 * Send a message to an OpenClaw instance and wait for the agent's response.
 *
 * Opens a short-lived WebSocket connection to the gateway, sends the message,
 * waits for the complete response, then closes the connection.
 */
export async function sendMessage(config: SendMessageConfig): Promise<AgentResponse> {
  const {ip, message, channel = "clawed.chat"} = config
  const wsUrl = `ws://${ip}:${GATEWAY_PORT}`

  // TODO: implement WebSocket communication with OpenClaw gateway
  //
  // The flow:
  //   1. Open WebSocket to ws://<ip>:18789
  //   2. Send a message in OpenClaw's gateway protocol format:
  //      {
  //        "type": "message",
  //        "channel": "clawed.chat",
  //        "content": message,
  //        "sender": { "name": "clawed.chat user" }
  //      }
  //   3. Listen for response messages from the agent
  //   4. Collect response parts until the agent signals completion
  //   5. Close the connection
  //   6. Return the aggregated response
  //
  // const ws = new WebSocket(wsUrl)
  //
  // return new Promise<AgentResponse>((resolve, reject) => {
  //   const timeout = setTimeout(() => {
  //     ws.close()
  //     reject(new Error(`[openclaw] message timeout after ${MESSAGE_TIMEOUT_MS}ms`))
  //   }, MESSAGE_TIMEOUT_MS)
  //
  //   let responseText = ""
  //   let hadActions = false
  //
  //   ws.addEventListener("open", () => {
  //     ws.send(JSON.stringify({
  //       type: "message",
  //       channel,
  //       content: message,
  //       sender: {name: "clawed.chat user"},
  //     }))
  //   })
  //
  //   ws.addEventListener("message", (event) => {
  //     const data = JSON.parse(event.data as string)
  //
  //     if (data.type === "response") {
  //       responseText += data.content || ""
  //     }
  //
  //     if (data.type === "action") {
  //       hadActions = true
  //     }
  //
  //     if (data.type === "done" || data.complete) {
  //       clearTimeout(timeout)
  //       ws.close()
  //       resolve({text: responseText, hadActions, raw: data})
  //     }
  //   })
  //
  //   ws.addEventListener("error", (err) => {
  //     clearTimeout(timeout)
  //     reject(new Error(`[openclaw] WebSocket error: ${err}`))
  //   })
  //
  //   ws.addEventListener("close", (event) => {
  //     clearTimeout(timeout)
  //     if (!responseText) {
  //       reject(new Error(`[openclaw] connection closed before response (code=${event.code})`))
  //     }
  //   })
  // })

  console.log(`[openclaw] sendMessage: ip=${ip} message="${message.slice(0, 50)}..." (stub)`)
  return {
    text: "TODO — proxy to OpenClaw gateway",
    hadActions: false,
  }
}

// ─── Health Check ────────────────────────────────────────────────────────────

/**
 * Check if an OpenClaw gateway is reachable and responding.
 * Used after waking a VM to confirm the gateway is up before sending messages.
 */
export async function isReachable(ip: string): Promise<boolean> {
  // TODO: implement health check
  //
  // Try opening a WebSocket and sending a ping:
  //   const ws = new WebSocket(`ws://${ip}:${GATEWAY_PORT}`)
  //   return new Promise<boolean>((resolve) => {
  //     const timeout = setTimeout(() => {
  //       ws.close()
  //       resolve(false)
  //     }, 5_000)
  //
  //     ws.addEventListener("open", () => {
  //       clearTimeout(timeout)
  //       ws.close()
  //       resolve(true)
  //     })
  //
  //     ws.addEventListener("error", () => {
  //       clearTimeout(timeout)
  //       resolve(false)
  //     })
  //   })

  console.log(`[openclaw] isReachable: ip=${ip} (stub — returning false)`)
  return false
}

// ─── Wait for Gateway ────────────────────────────────────────────────────────

/**
 * Poll until the OpenClaw gateway becomes reachable.
 * Used after waking a sleeping VM — the gateway takes ~30-45s to start.
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
