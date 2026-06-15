/**
 * WebView entry point. All hardware access goes through the typed channel
 * bus to the background layer — zero direct native access here.
 */

import {createRoot} from "react-dom/client"
import {MentraProvider} from "@mentra/miniapp/ui"
import "../shared/channels"
import {App} from "./App"
import "./styles.css"

const root = document.getElementById("root")
if (!root) {
  throw new Error("Missing #root element in index.html")
}

createRoot(root).render(
  <MentraProvider>
    <App />
  </MentraProvider>,
)

// MUST call mentra.ready() so the host flushes buffered session.ui.send calls.
mentra.ready()
