/**
 * browseruse.service.ts — Browser Use Cloud session lifecycle
 *
 * Manages stealth browser sessions via Browser Use Cloud API.
 * Each OpenClaw instance gets its own browser session with:
 *   - CDP WebSocket URL (plugged into openclaw.json browser.profiles.browseruse.cdpUrl)
 *   - Live URL (embedded as iframe in dashboard for "watch your agent" view)
 *
 * Browser Use is the hackathon host — this is a MUST integration.
 *
 * Reference: https://docs.cloud.browser-use.com/guides/browser-api
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const BROWSER_USE_API_KEY = process.env.BROWSER_USE_API_KEY || ""
const BROWSER_USE_API = "https://api.browser-use.com/api/v1"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrowserSession {
  /** Browser Use session/browser ID */
  browserId: string
  /** CDP WebSocket URL — plug into openclaw.json browser.profiles.browseruse.cdpUrl */
  cdpUrl: string
  /** Live view URL — embed as iframe in dashboard */
  liveUrl: string
}

interface BrowserUseCreateResponse {
  browser_id: string
  cdp_url: string
  live_url: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    "Authorization": `Bearer ${BROWSER_USE_API_KEY}`,
    "Content-Type": "application/json",
  }
}

// ─── Create Session ──────────────────────────────────────────────────────────

/**
 * Create a new Browser Use Cloud browser session.
 *
 * Returns the CDP URL (for OpenClaw) and live URL (for dashboard iframe).
 * Proxy defaults to US — can be changed per instance later.
 */
export async function createSession(proxyCountry: string = "us"): Promise<BrowserSession> {
  // TODO: uncomment when Browser Use API key is configured
  //
  // const res = await fetch(`${BROWSER_USE_API}/browsers`, {
  //   method: "POST",
  //   headers: headers(),
  //   body: JSON.stringify({
  //     proxy_country_code: proxyCountry,
  //   }),
  // })
  //
  // if (!res.ok) {
  //   const text = await res.text()
  //   throw new Error(`[browseruse] failed to create session: ${res.status} ${text}`)
  // }
  //
  // const data: BrowserUseCreateResponse = await res.json()
  //
  // console.log(`[browseruse] session created: id=${data.browser_id}`)
  //
  // return {
  //   browserId: data.browser_id,
  //   cdpUrl: data.cdp_url,
  //   liveUrl: data.live_url,
  // }

  console.log(`[browseruse] createSession: proxy=${proxyCountry} (stub)`)
  return {
    browserId: "stub-browser-id",
    cdpUrl: "wss://stub.browser-use.com/browser?apiKey=stub",
    liveUrl: "https://stub.browser-use.com/live/stub",
  }
}

// ─── Get Session ─────────────────────────────────────────────────────────────

/**
 * Get details for an existing browser session.
 * Useful for refreshing the live_url or checking session health.
 */
export async function getSession(browserId: string): Promise<BrowserSession | null> {
  // TODO: uncomment when Browser Use API key is configured
  //
  // const res = await fetch(`${BROWSER_USE_API}/browsers/${browserId}`, {
  //   headers: headers(),
  // })
  //
  // if (res.status === 404) return null
  //
  // if (!res.ok) {
  //   const text = await res.text()
  //   throw new Error(`[browseruse] failed to get session ${browserId}: ${res.status} ${text}`)
  // }
  //
  // const data: BrowserUseCreateResponse = await res.json()
  //
  // return {
  //   browserId: data.browser_id,
  //   cdpUrl: data.cdp_url,
  //   liveUrl: data.live_url,
  // }

  console.log(`[browseruse] getSession: id=${browserId} (stub)`)
  return null
}

// ─── Destroy Session ─────────────────────────────────────────────────────────

/**
 * Destroy a browser session. Called when an OpenClaw instance is destroyed
 * or when a session needs to be recycled.
 *
 * Safe to call multiple times — silently succeeds if session already gone.
 */
export async function destroySession(browserId: string): Promise<void> {
  // TODO: uncomment when Browser Use API key is configured
  //
  // const res = await fetch(`${BROWSER_USE_API}/browsers/${browserId}`, {
  //   method: "DELETE",
  //   headers: headers(),
  // })
  //
  // if (!res.ok && res.status !== 404) {
  //   const text = await res.text()
  //   throw new Error(`[browseruse] failed to destroy session ${browserId}: ${res.status} ${text}`)
  // }
  //
  // console.log(`[browseruse] session destroyed: id=${browserId}`)

  console.log(`[browseruse] destroySession: id=${browserId} (stub)`)
}

// ─── Build CDP URL ───────────────────────────────────────────────────────────

/**
 * Build the CDP URL string for openclaw.json configuration.
 * Browser Use provides this directly in the create response,
 * but this helper constructs it from an API key if needed.
 */
export function buildCdpUrl(apiKey?: string): string {
  const key = apiKey || BROWSER_USE_API_KEY
  return `wss://api.browser-use.com/browser?apiKey=${key}`
}
