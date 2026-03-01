import {BrowserWindow, Updater} from "electrobun/bun"

const defaultHmrUrl = "http://localhost:5174"

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel()
  const requestedHmrUrl = process.env.CLAWED_DESKTOP_HMR_URL || ""

  if (channel === "dev" && requestedHmrUrl) {
    try {
      await fetch(requestedHmrUrl, {method: "HEAD"})
      console.log(`[desktop] HMR enabled at ${requestedHmrUrl}`)
      return requestedHmrUrl
    } catch {
      console.log(`[desktop] HMR URL not reachable: ${requestedHmrUrl}`)
    }
  }

  if (channel === "dev" && process.env.CLAWED_DESKTOP_AUTO_HMR === "1") {
    try {
      await fetch(defaultHmrUrl, {method: "HEAD"})
      console.log(`[desktop] Auto HMR enabled at ${defaultHmrUrl}`)
      return defaultHmrUrl
    } catch {
      console.log("[desktop] Auto HMR port not reachable, using bundled view")
    }
  }

  return "views://mainview/index.html"
}

const url = await getMainViewUrl()

const mainWindow = new BrowserWindow({
  title: "Clawed",
  url,
  frame: {
    width: 520,
    height: 680,
    x: 200,
    y: 100,
  },
})

// Intercept navigation to external URLs and open them in the system browser.
// ElectroBun's WKWebView doesn't open new windows by default, so we catch
// any navigation away from our app and redirect it to the OS.
mainWindow.webview.on("will-navigate", (event: any) => {
  // ElectroBun event shape: { data: { detail: '{"url":"...","allowed":true}' } }
  let target: string | undefined

  try {
    const detail = typeof event?.data?.detail === "string"
      ? JSON.parse(event.data.detail)
      : event?.data?.detail
    target = detail?.url
  } catch {
    // fallback: try other shapes
    target = event?.url ?? event?.data?.url
  }

  if (!target) {
    console.log(`[desktop] will-navigate: no URL in event`)
    return
  }

  // Allow navigation within our own app (HMR dev server or bundled views)
  if (
    target.startsWith("http://localhost:") ||
    target.startsWith("views://") ||
    target.startsWith("about:")
  ) {
    return
  }

  // Everything else (clawed.chat, clerk auth, etc.) opens in system browser
  console.log(`[desktop] Opening in system browser: ${target}`)
  Bun.spawn(["open", target])
})

console.log("[desktop] Clawed desktop app launched")
