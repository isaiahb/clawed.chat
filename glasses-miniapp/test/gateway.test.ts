/**
 * GatewayClient integration test against a mock OpenClaw gateway.
 *
 * Spins up a real WebSocket server (Bun.serve) that speaks the v3 gateway
 * protocol — challenge → connect → hello-ok → chat.send → delta/final —
 * and asserts the client handshakes, streams, and surfaces status changes
 * exactly like a live OpenClaw would.
 *
 * Run: bun test
 */

import {describe, expect, test} from "bun:test"
import {GatewayClient, type ChatEvent, type GatewayStatus} from "../src/background/gateway"

const TEST_TOKEN = "test-token-123"

interface MockGateway {
  url: string
  received: Array<Record<string, any>>
  stop: () => void
}

/** Mock gateway: validates the connect handshake, then streams a canned
 * reply ("Hello " → "Hello from your lobster") for any chat.send. */
function startMockGateway(port: number, opts: {rejectAuth?: boolean} = {}): MockGateway {
  const received: Array<Record<string, any>> = []

  const server = Bun.serve({
    port,
    fetch(req, server) {
      if (server.upgrade(req)) return undefined as unknown as Response
      return new Response("ws only", {status: 400})
    },
    websocket: {
      open(ws) {
        ws.send(JSON.stringify({type: "event", event: "connect.challenge", payload: {nonce: "n-1"}}))
      },
      message(ws, raw) {
        const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString())
        received.push(msg)

        if (msg.method === "connect") {
          const token = msg.params?.auth?.token
          const clientId = msg.params?.client?.id
          if (opts.rejectAuth || token !== TEST_TOKEN || clientId !== "gateway-client") {
            ws.send(JSON.stringify({type: "res", id: msg.id, ok: false, error: "auth failed"}))
            return
          }
          ws.send(JSON.stringify({type: "res", id: msg.id, ok: true, payload: {type: "hello-ok", protocol: 3}}))
          return
        }

        if (msg.method === "chat.send") {
          const sessionKey = msg.params?.sessionKey
          // Ack the RPC
          ws.send(JSON.stringify({type: "res", id: msg.id, ok: true, payload: {dispatched: true}}))
          // Stream the reply
          const mkChat = (state: string, text: string) =>
            JSON.stringify({
              type: "event",
              event: "chat",
              payload: {
                state,
                sessionKey,
                runId: "run-1",
                message: {role: "assistant", content: [{type: "text", text}]},
              },
            })
          ws.send(mkChat("delta", "Hello "))
          ws.send(mkChat("delta", "Hello from your lobster"))
          ws.send(mkChat("final", "Hello from your lobster 🦞"))
        }
      },
    },
  })

  return {
    url: `ws://localhost:${port}`,
    received,
    stop: () => server.stop(true),
  }
}

function collectClient(url: string, token: string) {
  const chats: ChatEvent[] = []
  const statuses: GatewayStatus[] = []
  let resolveConnected: () => void
  let resolveFinal: () => void
  const connected = new Promise<void>((r) => (resolveConnected = r))
  const finalSeen = new Promise<void>((r) => (resolveFinal = r))

  const client = new GatewayClient({
    url,
    token,
    onStatus: (s) => {
      statuses.push(s)
      if (s === "connected") resolveConnected()
    },
    onChat: (e) => {
      chats.push(e)
      if (e.state === "final") resolveFinal()
    },
  })

  return {client, chats, statuses, connected, finalSeen}
}

describe("GatewayClient", () => {
  test("handshakes with token auth and streams a chat reply", async () => {
    const gw = startMockGateway(19101)
    const {client, chats, statuses, connected, finalSeen} = collectClient(gw.url, TEST_TOKEN)

    try {
      client.connect()
      await Promise.race([connected, timeout(3000, "connect")])

      expect(statuses).toContain("authenticating")
      expect(statuses).toContain("connected")
      expect(client.isConnected).toBe(true)

      // The connect request must use an allowed client id + carry the token
      const connectReq = gw.received.find((m) => m.method === "connect")
      expect(connectReq?.params?.client?.id).toBe("gateway-client")
      expect(connectReq?.params?.auth?.token).toBe(TEST_TOKEN)
      expect(connectReq?.params?.minProtocol).toBe(3)

      await client.sendChat("session-1", "hi there")
      await Promise.race([finalSeen, timeout(3000, "final chat event")])

      const deltas = chats.filter((c) => c.state === "delta")
      expect(deltas.length).toBe(2)
      expect(deltas[1]?.text).toBe("Hello from your lobster")
      const final = chats.find((c) => c.state === "final")
      expect(final?.text).toBe("Hello from your lobster 🦞")

      // chat.send carried the session key + idempotency key
      const sendReq = gw.received.find((m) => m.method === "chat.send")
      expect(sendReq?.params?.sessionKey).toBe("session-1")
      expect(sendReq?.params?.idempotencyKey).toBeTruthy()
    } finally {
      client.close()
      gw.stop()
    }
  })

  test("surfaces disconnected status when auth is rejected", async () => {
    const gw = startMockGateway(19102, {rejectAuth: true})
    const statuses: GatewayStatus[] = []
    let resolveDisconnected: () => void
    const disconnected = new Promise<void>((r) => (resolveDisconnected = r))

    const client = new GatewayClient({
      url: gw.url,
      token: "wrong-token",
      onStatus: (s) => {
        statuses.push(s)
        if (s === "disconnected") resolveDisconnected()
      },
      onChat: () => {},
    })

    try {
      client.connect()
      await Promise.race([disconnected, timeout(3000, "disconnected status")])
      expect(client.isConnected).toBe(false)
    } finally {
      client.close()
      gw.stop()
    }
  })

  test("rejects sendChat when not connected", async () => {
    const client = new GatewayClient({
      url: "ws://localhost:19999",
      token: TEST_TOKEN,
      onStatus: () => {},
      onChat: () => {},
    })
    expect(client.sendChat("s", "hello")).rejects.toThrow("Not connected")
    client.close()
  })
})

function timeout(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), ms))
}
