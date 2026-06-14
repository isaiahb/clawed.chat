/**
 * Clawed relay — the broker between an OpenClaw (the `clawed` plugin) and a
 * MentraOS miniapp, paired by a short code.
 *
 *   OpenClaw plugin ──(role=agent)──►  RELAY  ◄──(role=glasses)── miniapp
 *
 * Both sides connect to /api/relay?role=<agent|glasses>&pair=<code>. The relay
 * is deliberately dumb: it forwards every message from one peer to the other
 * verbatim. The speak/stt/photo semantics live in the plugin + miniapp, not
 * here — that keeps the broker robust and protocol-agnostic.
 *
 * Message envelopes the two ends exchange (relay just passes them through):
 *   agent → glasses : {type:"speak", text} · {type:"request_photo"} · {type:"display", text}
 *   glasses → agent : {type:"stt", text} · {type:"photo", dataUrl} · {type:"hello"}
 *   relay → both    : {type:"paired"} · {type:"peer_gone"}
 */

import type {ServerWebSocket} from "bun"

export type RelayRole = "agent" | "glasses"

export interface RelayData {
  kind: "relay"
  role: RelayRole
  pair: string
}

interface Pair {
  agent?: ServerWebSocket<RelayData>
  glasses?: ServerWebSocket<RelayData>
}

const pairs = new Map<string, Pair>()

function peerOf(ws: ServerWebSocket<RelayData>): ServerWebSocket<RelayData> | undefined {
  const p = pairs.get(ws.data.pair)
  if (!p) return undefined
  return ws.data.role === "agent" ? p.glasses : p.agent
}

function send(ws: ServerWebSocket<RelayData> | undefined, obj: unknown): void {
  if (!ws || ws.readyState !== 1) return
  try {
    ws.send(JSON.stringify(obj))
  } catch {}
}

/** Bun websocket handlers for relay sockets (dispatched by ws.data.kind). */
export const relayWebSocket = {
  open(ws: ServerWebSocket<RelayData>) {
    const {pair, role} = ws.data
    const p = pairs.get(pair) ?? {}
    // Replace any stale socket for this role
    if (p[role] && p[role] !== ws) {
      try {
        p[role]!.close()
      } catch {}
    }
    p[role] = ws
    pairs.set(pair, p)
    console.log(`[relay] ${role} joined pair=${pair} (agent=${!!p.agent} glasses=${!!p.glasses})`)

    // If both sides are present, tell each the peer is live.
    if (p.agent && p.glasses) {
      send(p.agent, {type: "paired"})
      send(p.glasses, {type: "paired"})
    }
  },

  message(ws: ServerWebSocket<RelayData>, raw: string | Buffer) {
    const peer = peerOf(ws)
    if (!peer) {
      // Peer not connected yet — let the sender know.
      send(ws, {type: "peer_gone"})
      return
    }
    // Forward verbatim (string or binary).
    try {
      peer.send(raw)
    } catch {}
  },

  close(ws: ServerWebSocket<RelayData>) {
    const p = pairs.get(ws.data.pair)
    if (!p) return
    if (p[ws.data.role] === ws) p[ws.data.role] = undefined
    const peer = ws.data.role === "agent" ? p.glasses : p.agent
    send(peer, {type: "peer_gone"})
    if (!p.agent && !p.glasses) pairs.delete(ws.data.pair)
    console.log(`[relay] ${ws.data.role} left pair=${ws.data.pair}`)
  },
}

/**
 * Parse a relay upgrade request. Returns the RelayData to attach at
 * server.upgrade(req, {data}), or null if the params are invalid.
 */
export function parseRelayUpgrade(request: Request): RelayData | null {
  const url = new URL(request.url)
  if (url.pathname !== "/api/relay") return null
  const role = url.searchParams.get("role")
  const pair = url.searchParams.get("pair")?.trim()
  if ((role !== "agent" && role !== "glasses") || !pair || pair.length < 4 || pair.length > 64) {
    return null
  }
  return {kind: "relay", role, pair}
}
