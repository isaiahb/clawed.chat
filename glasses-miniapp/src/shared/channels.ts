/** Typed UI <-> background channel registry. */

import type {Settings, StateSnapshot} from "./types"

export interface Channels {
  // UI → background
  "ui:talk": Record<string, never> // toggle push-to-talk (mirror of the glasses button)
  "ui:photo": Record<string, never> // user taps "what do you see" → capture + send a photo
  "ui:clear": Record<string, never> // clear local chat transcript for demo resets
  "ui:save-settings": Partial<Settings>
  "ui:request-state": Record<string, never>

  // background → UI
  "state:snapshot": StateSnapshot
}

declare global {
  // eslint-disable-next-line no-var
  var mentra: import("@mentra/miniapp/ui").MentraTyped<Channels>
}
