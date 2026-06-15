/**
 * RelayClient — the miniapp's connection to the clawed relay (role=glasses).
 * Forwards opaque JSON envelopes to/from the connector running next to the
 * user's OpenClaw. Auto-reconnects with backoff.
 */

export interface RelayMessage {
  type: string
  [k: string]: unknown
}

export interface RelayHandlers {
  onStatus: (s: "connecting" | "waiting" | "disconnected") => void
  onMessage: (m: RelayMessage) => void
}

export class RelayClient {
  private ws: WebSocket | null = null
  private closed = false
  private backoff = 2_000

  constructor(
    private url: string,
    private handlers: RelayHandlers,
  ) {}

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(): void {
    this.closed = false
    this.open()
  }

  close(): void {
    this.closed = true
    try {
      this.ws?.close()
    } catch {}
    this.ws = null
  }

  send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(obj))
      } catch {}
    }
  }

  private open(): void {
    this.handlers.onStatus("connecting")
    let ws: WebSocket
    try {
      ws = new WebSocket(this.url)
    } catch {
      this.handlers.onStatus("disconnected")
      this.schedule()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.backoff = 2_000
      this.handlers.onStatus("waiting")
    }
    ws.onmessage = (e: MessageEvent) => {
      let m: RelayMessage
      try {
        m = JSON.parse(typeof e.data === "string" ? e.data : String(e.data))
      } catch {
        return
      }
      this.handlers.onMessage(m)
    }
    ws.onclose = () => {
      this.ws = null
      this.handlers.onStatus("disconnected")
      this.schedule()
    }
    ws.onerror = () => {
      // close fires after error; reconnect handled there.
    }
  }

  private schedule(): void {
    if (this.closed) return
    setTimeout(() => this.open(), this.backoff)
    this.backoff = Math.min(this.backoff * 2, 15_000)
  }
}
