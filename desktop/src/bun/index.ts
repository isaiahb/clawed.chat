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

new BrowserWindow({
  title: "Clawed",
  url,
  frame: {
    width: 520,
    height: 680,
    x: 200,
    y: 100,
  },
})

console.log("[desktop] Clawed desktop app launched")
