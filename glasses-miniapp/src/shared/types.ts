/** Shared, dependency-free types for both the background JSContext and UI. */

export type Role = "you" | "claw" | "system"

export interface ChatLine {
  id: string
  role: Role
  text: string
}

export type ConnState =
  | "unpaired" // no pair code yet
  | "connecting" // dialing the relay
  | "waiting" // connected to relay, agent (your OpenClaw) not joined yet
  | "paired" // both ends connected — ready
  | "disconnected"

export interface Settings {
  /** Pairing code — must match the connector running next to your OpenClaw. */
  pairCode: string
  /** Relay base URL. */
  relayUrl: string
}

export interface PublicSettings {
  pairCode: string
  relayUrl: string
}

export interface StateSnapshot {
  lines: ChatLine[]
  conn: ConnState
  listening: boolean
  settings: PublicSettings
}

export const DEFAULT_SETTINGS: Settings = {
  pairCode: "clawed-demo",
  relayUrl: "wss://api.clawed.chat/api/relay",
}
