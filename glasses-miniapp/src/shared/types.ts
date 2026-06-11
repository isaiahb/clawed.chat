/**
 * Cross-boundary types shared between the background JSContext and the
 * UI WebView. Keep this file dependency-free — both bundles inline it.
 */

export type Role = "user" | "agent" | "system"

export interface ChatMessage {
  id: string
  role: Role
  text: string
  at: number
  /** "streaming" while deltas are arriving, "done" after final/error. */
  status: "streaming" | "done" | "error"
  /** Set when this message came from a vision (camera) query. */
  vision?: boolean
}

export type ConnectionStatus =
  | "unconfigured"
  | "connecting"
  | "authenticating"
  | "connected"
  | "disconnected"

export interface Settings {
  /** OpenClaw gateway WebSocket URL, e.g. ws://192.168.1.20:18789 */
  gatewayUrl: string
  /** Gateway auth token (token-only auth, no device pairing needed). */
  gatewayToken: string
  /** clawed.chat backend endpoint for camera → vision queries. */
  visionUrl: string
  /** Bearer token for the vision endpoint. */
  visionToken: string
  /** Wake word listening on/off. */
  wakeWordEnabled: boolean
}

/** Settings as exposed to the UI — secrets masked to presence flags. */
export interface PublicSettings {
  gatewayUrl: string
  gatewayTokenSet: boolean
  visionUrl: string
  visionTokenSet: boolean
  wakeWordEnabled: boolean
}

export interface StateSnapshot {
  messages: ChatMessage[]
  connection: ConnectionStatus
  settings: PublicSettings
  /** True while the controller is waiting for a follow-up utterance. */
  listening: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  gatewayUrl: "",
  gatewayToken: "",
  visionUrl: "https://clawed.chat/api/vision",
  visionToken: "",
  wakeWordEnabled: true,
}
