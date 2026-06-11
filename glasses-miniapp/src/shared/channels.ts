/**
 * Typed channel registry — single source of truth for the names + payload
 * shapes that flow between the background JSContext and the UI WebView.
 */

import type {Settings, StateSnapshot} from "./types"

export interface Channels {
  // UI → background
  "chat:send": {text: string}
  "chat:clear": Record<string, never>
  "vision:ask": {question: string}
  "settings:save": Partial<Settings>
  "state:request": Record<string, never>

  // background → UI
  "state:snapshot": StateSnapshot
}

declare global {
  // eslint-disable-next-line no-var
  var mentra: import("@mentra/miniapp/ui").MentraTyped<Channels>
}
