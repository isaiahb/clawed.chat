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
 * API Reference: https://docs.browser-use.com/cloud/guides/browser-api
 * SDK: browser-use-sdk (we use raw fetch for fewer deps)
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

interface BrowserUseGetResponse {
  browser_id: string
  cdp_url: string
  live_url: string
  status?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertConfigured(): void {
  if (!BROWSER_USE_API_KEY) {
    throw new Error(
      "[browseruse] BROWSER_USE_API_KEY is not set. " +
      "Get your key from https://cloud.browser-use.com/settings",
    )
  }
}

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
 *
 * The created browser session persists until explicitly destroyed or until
 * it times out on Browser Use's side (typically 15-30 min idle).
 */
export async function createSession(proxyCountry: string = "us"): Promise<BrowserSession> {
  assertConfigured()

  console.log(`[browseruse] creating session with proxy=${proxyCountry}`)

  const res = await fetch(`${BROWSER_USE_API}/browsers`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      proxy_country_code: proxyCountry,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)")
    throw new Error(`[browseruse] failed to create session: ${res.status} ${text}`)
  }

  const data: BrowserUseCreateResponse = await res.json()

  if (!data.browser_id || !data.cdp_url || !data.live_url) {
    throw new Error(
      `[browseruse] unexpected response shape: ${JSON.stringify(data)}`,
    )
  }

  console.log(`[browseruse] session created: id=${data.browser_id} live_url=${data.live_url}`)

  return {
    browserId: data.browser_id,
    cdpUrl: data.cdp_url,
    liveUrl: data.live_url,
  }
}

// ─── Get Session ─────────────────────────────────────────────────────────────

/**
 * Get details for an existing browser session.
 * Useful for refreshing the live_url or checking session health.
 *
 * Returns null if the session doesn't exist (404).
 */
export async function getSession(browserId: string): Promise<BrowserSession | null> {
  assertConfigured()

  const res = await fetch(`${BROWSER_USE_API}/browsers/${browserId}`, {
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
  })

  if (res.status === 404) {
    console.log(`[browseruse] session not found: id=${browserId}`)
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "(no body)")
    throw new Error(`[browseruse] failed to get session ${browserId}: ${res.status} ${text}`)
  }

  const data: BrowserUseGetResponse = await res.json()

  return {
    browserId: data.browser_id,
    cdpUrl: data.cdp_url,
    liveUrl: data.live_url,
  }
}

// ─── Check Session Health ────────────────────────────────────────────────────

/**
 * Quick health check — does the session still exist and is it reachable?
 *
 * Returns true if the session is alive, false if it's gone or errored.
 * Does NOT throw on failure — always returns a boolean.
 */
export async function isSessionAlive(browserId: string): Promise<boolean> {
  try {
    assertConfigured()

    const res = await fetch(`${BROWSER_USE_API}/browsers/${browserId}`, {
      headers: headers(),
      signal: AbortSignal.timeout(5_000),
    })

    return res.ok
  } catch {
    return false
  }
}

// ─── Destroy Session ─────────────────────────────────────────────────────────

/**
 * Destroy a browser session. Called when an OpenClaw instance is destroyed
 * or when a session needs to be recycled.
 *
 * Safe to call multiple times — silently succeeds if session already gone.
 */
export async function destroySession(browserId: string): Promise<void> {
  assertConfigured()

  console.log(`[browseruse] destroying session: id=${browserId}`)

  const res = await fetch(`${BROWSER_USE_API}/browsers/${browserId}`, {
    method: "DELETE",
    headers: headers(),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "(no body)")
    throw new Error(`[browseruse] failed to destroy session ${browserId}: ${res.status} ${text}`)
  }

  console.log(`[browseruse] session destroyed: id=${browserId}`)
}

// ─── Create or Recycle ───────────────────────────────────────────────────────

/**
 * Ensures a browser session exists for an instance.
 *
 * If an existing browserId is provided and still alive, returns it.
 * Otherwise, creates a new session. Useful for the deploy/start flow
 * where we want to be idempotent.
 *
 * @param existingBrowserId - Optional existing browser session to check first
 * @param proxyCountry - Proxy country code for new sessions
 */
export async function ensureSession(
  existingBrowserId?: string | null,
  proxyCountry: string = "us",
): Promise<BrowserSession> {
  // Try to reuse existing session
  if (existingBrowserId) {
    try {
      const existing = await getSession(existingBrowserId)
      if (existing) {
        console.log(`[browseruse] reusing existing session: id=${existingBrowserId}`)
        return existing
      }
    } catch (err: any) {
      console.warn(`[browseruse] failed to check existing session ${existingBrowserId}:`, err.message)
    }
  }

  // Create a new session
  return createSession(proxyCountry)
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
