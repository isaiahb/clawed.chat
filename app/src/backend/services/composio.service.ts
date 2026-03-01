/**
 * composio.service.ts — Composio SDK wrapper for OAuth integrations
 *
 * Handles creating, verifying, and revoking OAuth connections
 * for external services (Gmail, Google Calendar, GitHub) via Composio.
 *
 * This lets the OpenClaw agent perform fast API actions (send email,
 * check calendar, create PR) instead of slow browser automation.
 *
 * Uses the real @composio/core SDK (v0.6.x).
 *
 * Reference: Design Doc 04
 */

// @composio/core is loaded lazily — the server can start even if the package
// isn't installed (e.g. on a VM where it failed to install).
// All usage goes through getClient() which does the dynamic import.

type ComposioClient = any

// ─── Config ──────────────────────────────────────────────────────────────────

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY

/** Maps our internal service names to Composio toolkit slugs + auth config env vars */
const SERVICE_MAP: Record<string, {toolkit: string; authConfigEnv: string}> = {
  gmail: {
    toolkit: "gmail",
    authConfigEnv: "COMPOSIO_GMAIL_AUTH_CONFIG",
  },
  googlecalendar: {
    toolkit: "googlecalendar",
    authConfigEnv: "COMPOSIO_GCAL_AUTH_CONFIG",
  },
  github: {
    toolkit: "github",
    authConfigEnv: "COMPOSIO_GITHUB_AUTH_CONFIG",
  },
  slack: {
    toolkit: "slack",
    authConfigEnv: "COMPOSIO_SLACK_AUTH_CONFIG",
  },
  notion: {
    toolkit: "notion",
    authConfigEnv: "COMPOSIO_NOTION_AUTH_CONFIG",
  },
  linear: {
    toolkit: "linear",
    authConfigEnv: "COMPOSIO_LINEAR_AUTH_CONFIG",
  },
}

// ─── Singleton Client ────────────────────────────────────────────────────────

let _client: ComposioClient | null = null

async function getClient(): Promise<ComposioClient> {
  if (!_client) {
    assertConfigured()
    try {
      const { Composio } = await import("@composio/core")
      _client = new Composio({
        apiKey: COMPOSIO_API_KEY!,
        allowTracking: false,
      })
    } catch (err: any) {
      throw new Error(
        `[composio] Failed to load @composio/core: ${err.message}. ` +
        `Run 'bun add @composio/core' to install it.`
      )
    }
  }
  return _client
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConnectionSession {
  redirectUrl: string
  sessionId: string
}

export interface VerifiedConnection {
  connectionId: string
  service: string
  userId: string
  status: "connected" | "error"
  permissions: string[]
}

export interface UserConnection {
  id: string
  service: string
  status: "connected" | "disconnected" | "expired" | "error"
  connectedAt?: number
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a new OAuth connection via Composio's `connectedAccounts.link()`.
 *
 * Returns a redirect URL the frontend should send the user to.
 * After the user completes OAuth, Composio redirects back to
 * our /api/connections/callback endpoint with the connection ID.
 *
 * @param userId - Clerk user ID (used as Composio entity/user ID)
 * @param service - Internal service name (gmail, googlecalendar, github)
 * @returns Redirect URL and session/connection ID
 */
export async function createConnection(userId: string, service: string): Promise<ConnectionSession> {
  const serviceConfig = SERVICE_MAP[service.toLowerCase()]
  if (!serviceConfig) {
    throw new Error(`[composio] unsupported service: ${service}`)
  }

  const authConfigId = process.env[serviceConfig.authConfigEnv]
  if (!authConfigId) {
    throw new Error(`[composio] missing env var ${serviceConfig.authConfigEnv}`)
  }

  const callbackUrl = `${process.env.PUBLIC_URL || "https://clawed.chat"}/api/connections/callback`

  const client = await getClient()

  console.log(
    `[composio] creating connection: user=${userId} service=${service} authConfig=${authConfigId}`,
  )

  // Use the `link` method which generates a Composio Connect link.
  // The user visits this URL, completes OAuth, and is redirected back
  // to our callbackUrl with session_id in the query params.
  const connectionRequest = await client.connectedAccounts.link(
    userId,
    authConfigId,
    {
      callbackUrl,
    },
  )

  const redirectUrl = connectionRequest.redirectUrl
  const sessionId = connectionRequest.id

  if (!redirectUrl) {
    throw new Error(`[composio] no redirect URL returned for service=${service}`)
  }

  console.log(
    `[composio] connection initiated: sessionId=${sessionId} redirectUrl=${redirectUrl.substring(0, 80)}...`,
  )

  return {
    redirectUrl,
    sessionId,
  }
}

/**
 * Verifies an OAuth session after the user is redirected back.
 *
 * Waits for the Composio connection to become active (polls with timeout),
 * then returns the verified connection details.
 *
 * @param sessionId - The connection request ID from the callback URL
 * @param timeoutMs - Max time to wait for connection to become active (default: 30s)
 */
export async function verifySession(
  sessionId: string,
  timeoutMs: number = 30_000,
): Promise<VerifiedConnection> {
  const client = await getClient()

  console.log(`[composio] verifying session: sessionId=${sessionId}`)

  try {
    // Wait for the connection to complete (polls internally)
    const account = await client.connectedAccounts.waitForConnection(
      sessionId,
      timeoutMs,
    )

    // Extract toolkit slug as our service name
    const toolkitSlug = (account as any).toolkit?.slug
      ?? (account as any).appName
      ?? reverseServiceLookup(account)
      ?? "unknown"

    // Map Composio status to our status
    const isActive = (account as any).status === "ACTIVE"
      || (account as any).isDisabled === false

    console.log(
      `[composio] session verified: id=${(account as any).id} toolkit=${toolkitSlug} active=${isActive}`,
    )

    return {
      connectionId: (account as any).id ?? sessionId,
      service: toolkitSlug,
      userId: (account as any).entityId ?? (account as any).userId ?? "",
      status: isActive ? "connected" : "error",
      permissions: extractPermissions(account),
    }
  } catch (err: any) {
    console.error(`[composio] verifySession failed: ${err.message}`)

    // If we timed out or got an error, try to at least get the current state
    try {
      const account = await client.connectedAccounts.get(sessionId)
      const toolkitSlug = (account as any).toolkit?.slug ?? "unknown"

      return {
        connectionId: (account as any).id ?? sessionId,
        service: toolkitSlug,
        userId: (account as any).entityId ?? "",
        status: "error",
        permissions: [],
      }
    } catch {
      // Complete failure — return error stub
      return {
        connectionId: sessionId,
        service: "unknown",
        userId: "",
        status: "error",
        permissions: [],
      }
    }
  }
}

/**
 * Verify a connection using Composio's connected_account_id.
 * This is the format Composio uses in its OAuth callback redirect:
 *   ?status=success&connected_account_id=ca_xxx
 */
export async function verifyConnection(
  connectedAccountId: string,
): Promise<VerifiedConnection> {
  const client = await getClient()

  console.log(`[composio] verifying connection: connectedAccountId=${connectedAccountId}`)

  try {
    const account = await client.connectedAccounts.get(connectedAccountId)

    const toolkitSlug = (account as any).toolkit?.slug
      ?? (account as any).appName
      ?? reverseServiceLookup(account)
      ?? "unknown"

    const isActive = (account as any).status === "ACTIVE"
      || (account as any).isDisabled === false

    console.log(
      `[composio] connection verified: id=${(account as any).id} toolkit=${toolkitSlug} active=${isActive} entity=${(account as any).entityId}`,
    )

    return {
      connectionId: (account as any).id ?? connectedAccountId,
      service: toolkitSlug,
      userId: (account as any).entityId ?? (account as any).userId ?? "",
      status: isActive ? "connected" : "error",
      permissions: extractPermissions(account),
    }
  } catch (err: any) {
    console.error(`[composio] verifyConnection failed: ${err.message}`)
    return {
      connectionId: connectedAccountId,
      service: "unknown",
      userId: "",
      status: "error",
      permissions: [],
    }
  }
}


/**
 * Revokes an active connection on Composio's side.
 *
 * @param connectionId - The Composio connected account ID to revoke
 */
export async function revokeConnection(connectionId: string): Promise<void> {
  const client = await getClient()

  console.log(`[composio] revoking connection: connectionId=${connectionId}`)

  await client.connectedAccounts.delete(connectionId)

  console.log(`[composio] connection revoked: connectionId=${connectionId}`)
}

/**
 * Lists all connected accounts for a user across all services.
 *
 * @param userId - Clerk user ID (Composio entity ID)
 * @returns Array of user connections with status
 */
export async function listUserConnections(userId: string): Promise<UserConnection[]> {
  const client = await getClient()

  const response = await client.connectedAccounts.list({
    userIds: [userId],
  })

  const items = (response as any).items ?? (response as any).data ?? []

  return items.map((account: any) => {
    const toolkitSlug = account.toolkit?.slug ?? account.appName ?? "unknown"
    const status = mapStatus(account.status, account.isDisabled)

    return {
      id: account.id,
      service: toolkitSlug,
      status,
      connectedAt: account.createdAt
        ? new Date(account.createdAt).getTime()
        : undefined,
    }
  })
}

/**
 * Gets a single connected account by ID.
 *
 * @param connectionId - The Composio connected account ID
 */
export async function getConnection(connectionId: string): Promise<VerifiedConnection | null> {
  const client = await getClient()

  try {
    const account = await client.connectedAccounts.get(connectionId)

    const toolkitSlug = (account as any).toolkit?.slug ?? "unknown"
    const isActive = (account as any).status === "ACTIVE"
      || (account as any).isDisabled === false

    return {
      connectionId: (account as any).id ?? connectionId,
      service: toolkitSlug,
      userId: (account as any).entityId ?? "",
      status: isActive ? "connected" : "error",
      permissions: extractPermissions(account),
    }
  } catch (err: any) {
    if (err.message?.includes("not found") || err.code === "CONNECTED_ACCOUNT_NOT_FOUND") {
      return null
    }
    throw err
  }
}

/**
 * Lists available tools/actions for a connected service.
 *
 * This is useful for telling OpenClaw what tools/skills are available
 * for a given user's connected services.
 *
 * @param userId - Clerk user ID (Composio entity ID)
 * @param service - The service name to filter tools for
 */
export async function listActions(userId: string, service: string): Promise<string[]> {
  const serviceConfig = SERVICE_MAP[service.toLowerCase()]
  if (!serviceConfig) {
    return []
  }

  const client = await getClient()

  try {
    const tools = await client.tools.getRawComposioTools({
      toolkits: [serviceConfig.toolkit],
    })

    return Array.isArray(tools)
      ? tools.map((t: any) => t.name ?? t.slug ?? String(t)).filter(Boolean)
      : []
  } catch (err: any) {
    console.warn(`[composio] listActions failed for ${service}: ${err.message}`)
    return []
  }
}

/**
 * Refreshes a connection's credentials (useful for expired OAuth tokens).
 *
 * @param connectionId - The Composio connected account ID
 */
export async function refreshConnection(connectionId: string): Promise<boolean> {
  const client = await getClient()

  try {
    await client.connectedAccounts.refresh(connectionId)
    console.log(`[composio] connection refreshed: ${connectionId}`)
    return true
  } catch (err: any) {
    console.warn(`[composio] refresh failed for ${connectionId}: ${err.message}`)
    return false
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertConfigured(): void {
  if (!COMPOSIO_API_KEY) {
    throw new Error(
      "[composio] COMPOSIO_API_KEY is not set. " +
      "Get your key from https://composio.dev → Dashboard → API Keys",
    )
  }
}

/**
 * Maps Composio account status to our internal status type.
 */
function mapStatus(
  composioStatus?: string,
  isDisabled?: boolean,
): "connected" | "disconnected" | "expired" | "error" {
  if (isDisabled) return "disconnected"

  switch (composioStatus?.toUpperCase()) {
    case "ACTIVE":
      return "connected"
    case "INITIATED":
    case "INITIATING":
    case "INACTIVE":
      return "disconnected"
    case "EXPIRED":
      return "expired"
    case "FAILED":
    case "DELETED":
      return "error"
    default:
      return "disconnected"
  }
}

/**
 * Try to reverse-map a Composio account back to our service name.
 */
function reverseServiceLookup(account: any): string | null {
  const slug = account?.toolkit?.slug ?? account?.appName ?? ""
  const lower = slug.toLowerCase()

  for (const [service, config] of Object.entries(SERVICE_MAP)) {
    if (config.toolkit === lower) return service
  }

  return lower || null
}

/**
 * Extract permission/scope strings from a Composio account response.
 * The shape varies by auth type — we normalize to a flat string array.
 */
function extractPermissions(account: any): string[] {
  // Try various locations where scopes might live
  const scopes =
    account?.scopes ??
    account?.connectionData?.scopes ??
    account?.toolkit?.scopes ??
    []

  if (Array.isArray(scopes)) {
    return scopes.map((s: any) => (typeof s === "string" ? s : s?.name ?? String(s)))
  }

  if (typeof scopes === "string") {
    return scopes.split(/[,\s]+/).filter(Boolean)
  }

  return []
}
