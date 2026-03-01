/**
 * composio.service.ts — Composio SDK wrapper for OAuth integrations
 *
 * Handles creating, verifying, and revoking OAuth connections
 * for external services (Gmail, Google Calendar, GitHub) via Composio.
 *
 * This lets the OpenClaw agent perform fast API actions (send email,
 * check calendar, create PR) instead of slow browser automation.
 *
 * Reference: Design Doc 04
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY

/** Maps our internal service names to Composio app names + auth config env vars */
const SERVICE_MAP: Record<string, {app: string, authConfigEnv: string}> = {
  gmail: {
    app: "gmail",
    authConfigEnv: "COMPOSIO_GMAIL_AUTH_CONFIG",
  },
  googlecalendar: {
    app: "googlecalendar",
    authConfigEnv: "COMPOSIO_GCAL_AUTH_CONFIG",
  },
  github: {
    app: "github",
    authConfigEnv: "COMPOSIO_GITHUB_AUTH_CONFIG",
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConnectionSession {
  redirectUrl: string
  sessionId: string
}

export interface VerifiedConnection {
  connectionId: string
  service: string
  status: "connected" | "error"
  permissions: string[]
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates a new OAuth connection session via Composio.
 *
 * Returns a redirect URL the frontend should send the user to.
 * After the user completes OAuth, Composio redirects back to
 * our /api/connections/callback endpoint.
 *
 * @param userId - Clerk user ID (used as Composio entity ID)
 * @param service - Internal service name (gmail, googlecalendar, github)
 * @returns Redirect URL and session ID
 */
export async function createConnection(userId: string, service: string): Promise<ConnectionSession> {
  assertConfigured()

  const serviceConfig = SERVICE_MAP[service.toLowerCase()]
  if (!serviceConfig) {
    throw new Error(`[composio] unsupported service: ${service}`)
  }

  const authConfigId = process.env[serviceConfig.authConfigEnv]
  if (!authConfigId) {
    throw new Error(`[composio] missing env var ${serviceConfig.authConfigEnv}`)
  }

  const callbackUrl = `${process.env.PUBLIC_URL}/api/connections/callback`

  // TODO: Replace with actual Composio SDK call
  // import {Composio} from "@composio/core"
  //
  // const client = new Composio({apiKey: COMPOSIO_API_KEY})
  // const session = await client.connectedAccounts.initiate({
  //   appName: serviceConfig.app,
  //   authConfigId,
  //   entityId: userId,
  //   redirectUrl: callbackUrl,
  // })
  //
  // return {
  //   redirectUrl: session.redirectUrl,
  //   sessionId: session.connectedAccountId,
  // }

  console.log(`[composio] createConnection: user=${userId} service=${service} (stub)`)
  return {
    redirectUrl: `https://composio.dev/stub?entity=${userId}&app=${serviceConfig.app}`,
    sessionId: "session_stub_" + Date.now(),
  }
}

/**
 * Verifies an OAuth session after the user is redirected back.
 *
 * Called from /api/connections/callback to confirm the connection
 * was successful and retrieve connection details.
 *
 * @param sessionId - The session/connection ID from the callback URL
 */
export async function verifySession(sessionId: string): Promise<VerifiedConnection> {
  assertConfigured()

  // TODO: Replace with actual Composio SDK call
  // const client = new Composio({apiKey: COMPOSIO_API_KEY})
  // const account = await client.connectedAccounts.get({connectedAccountId: sessionId})
  //
  // return {
  //   connectionId: account.id,
  //   service: account.appName,
  //   status: account.status === "ACTIVE" ? "connected" : "error",
  //   permissions: account.scopes ?? [],
  // }

  console.log(`[composio] verifySession: sessionId=${sessionId} (stub)`)
  return {
    connectionId: "conn_stub_" + Date.now(),
    service: "unknown",
    status: "connected",
    permissions: [],
  }
}

/**
 * Revokes an active connection on Composio's side.
 *
 * @param connectionId - The Composio connected account ID to revoke
 */
export async function revokeConnection(connectionId: string): Promise<void> {
  assertConfigured()

  // TODO: Replace with actual Composio SDK call
  // const client = new Composio({apiKey: COMPOSIO_API_KEY})
  // await client.connectedAccounts.delete({connectedAccountId: connectionId})

  console.log(`[composio] revokeConnection: connectionId=${connectionId} (stub)`)
}

/**
 * Lists available actions for a connected service.
 *
 * This is useful for telling OpenClaw what tools/skills are available
 * for a given user's connected services.
 *
 * @param connectionId - The Composio connected account ID
 * @param service - The service name to filter actions for
 */
export async function listActions(connectionId: string, service: string): Promise<string[]> {
  assertConfigured()

  // TODO: Replace with actual Composio SDK call
  // const client = new Composio({apiKey: COMPOSIO_API_KEY})
  // const actions = await client.actions.list({
  //   connectedAccountId: connectionId,
  //   appName: service,
  // })
  // return actions.map((a) => a.name)

  console.log(`[composio] listActions: connection=${connectionId} service=${service} (stub)`)
  return []
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
