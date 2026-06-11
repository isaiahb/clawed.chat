/**
 * GatewayClient — direct WebSocket client for the OpenClaw Gateway.
 *
 * This is the "no middleman" path: the phone connects straight to the
 * user's own OpenClaw gateway (LAN or cloud) and performs the v3
 * token-auth handshake itself. Mirrors the handshake in
 * app/src/backend/api/openclaw-proxy.ts, minus device identity
 * (token-only auth — no Ed25519 pairing required).
 *
 * Protocol:
 *   ← {type:"event", event:"connect.challenge", payload:{nonce}}
 *   → {type:"req", id, method:"connect", params:{..., auth:{token}}}
 *   ← {type:"res", ok:true, payload:{type:"hello-ok", protocol:3}}
 *   then:
 *   → {type:"req", id, method:"chat.send", params:{sessionKey, message, ...}}
 *   ← {type:"event", event:"chat", payload:{state, message, runId, ...}}
 */

const PROTOCOL_VERSION = 3
const REQUEST_TIMEOUT_MS = 30_000
const RECONNECT_BASE_MS = 2_000
const RECONNECT_MAX_MS = 30_000

export interface ChatEvent {
  state: "delta" | "final" | "error" | "aborted"
  text?: string
  runId?: string
  sessionKey?: string
}

export type GatewayStatus = "connecting" | "authenticating" | "connected" | "disconnected"

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export interface GatewayClientOptions {
  url: string
  token: string
  onChat: (event: ChatEvent) => void
  onStatus: (status: GatewayStatus) => void
}

function extractText(message: unknown): string | undefined {
  if (!message || typeof message !== "object") return undefined
  const content = (message as Record<string, unknown>).content
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && (block as Record<string, unknown>).type === "text") {
        const text = (block as Record<string, unknown>).text
        if (typeof text === "string" && text) return text
      }
    }
  }
  if (typeof content === "string" && content) return content
  return undefined
}

export class GatewayClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private reqCounter = 0
  private authenticated = false
  private closedByUser = false
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private opts: GatewayClientOptions) {}

  get isConnected(): boolean {
    return this.authenticated && this.ws?.readyState === WebSocket.OPEN
  }

  connect(): void {
    this.closedByUser = false
    this.open()
  }

  close(): void {
    this.closedByUser = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.rejectAllPending(new Error("Connection closed"))
    try {
      this.ws?.close()
    } catch {}
    this.ws = null
    this.authenticated = false
  }

  /** Send a chat message. Replies stream back through onChat. */
  async sendChat(sessionKey: string, text: string): Promise<void> {
    await this.request("chat.send", {
      sessionKey,
      message: text,
      deliver: false,
      idempotencyKey: this.nextId(),
    })
  }

  async abortChat(sessionKey: string): Promise<void> {
    await this.request("chat.abort", {sessionKey})
  }

  request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected to gateway"))
        return
      }
      const id = this.nextId()
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Gateway request ${method} timed out`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(id, {resolve, reject, timer})
      this.ws.send(JSON.stringify({type: "req", id, method, params}))
    })
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private nextId(): string {
    return `glasses-${Date.now()}-${++this.reqCounter}`
  }

  private open(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    this.opts.onStatus("connecting")
    this.authenticated = false

    let ws: WebSocket
    try {
      ws = new WebSocket(this.opts.url)
    } catch (err) {
      this.opts.onStatus("disconnected")
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onmessage = (event: MessageEvent) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data)
      this.handleMessage(raw)
    }
    ws.onclose = () => {
      this.authenticated = false
      this.rejectAllPending(new Error("Gateway connection closed"))
      this.opts.onStatus("disconnected")
      this.ws = null
      this.scheduleReconnect()
    }
    ws.onerror = () => {
      // onclose fires after onerror; reconnect is handled there.
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_MS)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.open(), delay)
  }

  private rejectAllPending(err: Error): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer)
      p.reject(err)
    }
    this.pending.clear()
  }

  private handleMessage(raw: string): void {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    // Auth challenge → answer with token-only connect request
    if (msg.type === "event" && msg.event === "connect.challenge") {
      this.opts.onStatus("authenticating")
      this.ws?.send(
        JSON.stringify({
          type: "req",
          id: `connect-${Date.now()}`,
          method: "connect",
          params: {
            minProtocol: PROTOCOL_VERSION,
            maxProtocol: PROTOCOL_VERSION,
            client: {
              // Must be one of OpenClaw's GATEWAY_CLIENT_IDS — arbitrary ids are
              // rejected by ConnectParamsSchema (see openclaw.service.ts notes).
              id: "gateway-client",
              displayName: "clawed-glasses",
              version: "1.0.0",
              platform: "mentraos",
              mode: "backend",
            },
            role: "operator",
            scopes: ["operator.admin"],
            caps: [],
            auth: {token: this.opts.token},
          },
        }),
      )
      return
    }

    if (msg.type === "res") {
      const payload = msg.payload as Record<string, unknown> | undefined

      // hello-ok → authenticated
      if (msg.ok && payload?.type === "hello-ok") {
        this.authenticated = true
        this.reconnectAttempts = 0
        this.opts.onStatus("connected")
        return
      }

      // Auth rejection arrives as a failed res before we're authenticated
      if (!msg.ok && !this.authenticated) {
        this.opts.onStatus("disconnected")
        return
      }

      // Pending RPC response
      const pending = this.pending.get(msg.id as string)
      if (pending) {
        clearTimeout(pending.timer)
        this.pending.delete(msg.id as string)
        if (msg.ok) {
          pending.resolve(msg.payload)
        } else {
          const error = msg.error as string | {message?: string} | undefined
          const text = typeof error === "string" ? error : error?.message || "Request failed"
          pending.reject(new Error(text))
        }
      }
      return
    }

    // Streaming chat events
    if (msg.type === "event" && msg.event === "chat") {
      const payload = (msg.payload || {}) as Record<string, unknown>
      const state = payload.state as ChatEvent["state"]
      if (state === "delta" || state === "final" || state === "aborted") {
        this.opts.onChat({
          state,
          text: extractText(payload.message),
          runId: payload.runId as string | undefined,
          sessionKey: payload.sessionKey as string | undefined,
        })
      } else if (state === "error") {
        this.opts.onChat({
          state: "error",
          text: (payload.errorMessage as string) || "Something went wrong",
          runId: payload.runId as string | undefined,
          sessionKey: payload.sessionKey as string | undefined,
        })
      }
    }
  }
}
