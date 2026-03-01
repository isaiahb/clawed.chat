import {BrowserWindow, Updater} from "electrobun/bun"

const DEV_SERVER_PORT = 5173
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel()
  if (channel === "dev") {
    try {
      await fetch(DEV_SERVER_URL, {method: "HEAD"})
      console.log(`[desktop] HMR enabled at ${DEV_SERVER_URL}`)
      return DEV_SERVER_URL
    } catch {
      console.log("[desktop] Vite dev server not running, falling back to bundled view")
    }
  }

  return "views://mainview/index.html"
}

const url = await getMainViewUrl()

new BrowserWindow({
  title: "Clawed Desktop Mock",
  url,
  frame: {
    width: 1320,
    height: 860,
    x: 120,
    y: 80,
  },
})

console.log("[desktop] Clawed desktop mock launched")
