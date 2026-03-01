/**
 * Connections API — Composio OAuth flows for external integrations
 *
 * GET /                        → list user's active connections
 * POST /:service/connect       → generate Composio redirect URL for OAuth
 * GET /callback                → handle OAuth redirect back from Composio
 * DELETE /:connectionId        → disconnect an active integration
 *
 * Reference: Design Doc 04
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"
import * as composioService from "../services/composio.service"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[connections] CONVEX_URL not configured")
  }
  return convex
}

// ─── Config ──────────────────────────────────────────────────────────────────

const VALID_SERVICES = ["gmail", "googlecalendar", "github"]

const DASHBOARD_URL = process.env.PUBLIC_URL || "https://clawed.chat"

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", listConnections)
app.post("/:service/connect", initiateConnection)
app.get("/callback", handleCallback)
app.delete("/:connectionId", disconnectConnection)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET / — returns all active connections for the current user.
 *
 * Response: { connections: [{ id, service, status, connected_at, permissions }] }
 */
async function listConnections(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  try {
    const db = getConvex()
    const connections = await db.query(api.connections.listByUser, {user_id: auth.userId})

    return c.json({
      connections: connections.map((conn) => ({
        id: conn._id,
        service: conn.service,
        status: conn.status,
        composio_connection_id: conn.composio_connection_id,
        connected_at: conn.connected_at,
        permissions: conn.permissions,
      })),
    })
  } catch (err: any) {
    console.error("[connections] listConnections error:", err.message)
    return c.json({error: "Failed to fetch connections"}, 500)
  }
}

/**
 * POST /:service/connect — kicks off an OAuth flow via Composio.
 *
 * Supported services: gmail, googlecalendar, github
 *
 * Returns a redirect URL the frontend should navigate the user to.
 * After the user completes OAuth, Composio redirects back to GET /callback.
 */
async function initiateConnection(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const service = c.req.param("service")

  if (!VALID_SERVICES.includes(service)) {
    return c.json(
      {error: `Unsupported service. Must be one of: ${VALID_SERVICES.join(", ")}`},
      400,
    )
  }

  try {
    // 1. Create OAuth session via Composio
    const session = await composioService.createConnection(auth.userId, service)

    // 2. Record a "pending" connection in Convex so we can track OAuth in-flight
    const db = getConvex()
    await db.mutation(api.connections.upsert, {
      user_id: auth.userId,
      service,
      composio_connection_id: session.sessionId,
      status: "disconnected" as const,
      permissions: [],
    })

    console.log(`[connections] initiated OAuth for ${service}, user=${auth.userId}`)

    return c.json({redirect_url: session.redirectUrl})
  } catch (err: any) {
    console.error(`[connections] initiateConnection error (${service}):`, err.message)

    // Surface Composio config errors clearly
    if (err.message?.includes("COMPOSIO_API_KEY")) {
      return c.json({error: "Composio integration is not configured on the server"}, 500)
    }
    if (err.message?.includes("missing env var")) {
      return c.json({error: `OAuth config for ${service} is not set up`}, 500)
    }

    return c.json({error: "Failed to initiate connection"}, 500)
  }
}

/**
 * GET /callback — Composio redirects here after the user completes OAuth.
 *
 * Query params from Composio include session/connection identifiers.
 * We verify with the Composio SDK, then update the Convex connections table.
 * Finally, redirect the user back to the dashboard.
 */
async function handleCallback(c: Context) {
  const sessionId = c.req.query("session_id")

  if (!sessionId) {
    console.error("[connections] callback missing session_id")
    return c.redirect(`${DASHBOARD_URL}/app/connections?connection=error&reason=missing_session`)
  }

  try {
    // 1. Verify the session with Composio
    const result = await composioService.verifySession(sessionId)

    // 2. Update the Convex connections table
    //    We need to find the right user — the session maps back to an entity (our userId).
    //    For now, we look up by composio_connection_id (the sessionId we stored during initiate).
    const db = getConvex()

    // Try to find existing pending connection by composio session id
    // Since we stored the sessionId as composio_connection_id during initiate,
    // we search all connections. In production, we'd store the mapping more robustly.
    // For now, upsert by the verified service + use a header/cookie for user identification.

    // Note: In the callback flow, we don't have auth context (user is redirected from Composio).
    // The sessionId is our link back to the user. We stored it as composio_connection_id
    // in the initiate step, so we can search for it.

    // Update the connection with real Composio data
    // Since Composio's entity ID is our userId, we can use that
    if (result.status === "connected") {
      console.log(`[connections] OAuth verified: service=${result.service} connectionId=${result.connectionId}`)

      // We can't easily query by composio_connection_id without an index,
      // so we redirect with params and let the frontend trigger the update.
      return c.redirect(
        `${DASHBOARD_URL}/app/connections?connection=success&service=${result.service}&composio_id=${result.connectionId}`,
      )
    }

    return c.redirect(
      `${DASHBOARD_URL}/app/connections?connection=error&service=${result.service}`,
    )
  } catch (err: any) {
    console.error("[connections] callback verification error:", err.message)
    return c.redirect(
      `${DASHBOARD_URL}/app/connections?connection=error&reason=verification_failed`,
    )
  }
}

/**
 * DELETE /:connectionId — disconnect an active integration.
 *
 * Revokes the connection on Composio's side and removes from our database.
 */
async function disconnectConnection(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const connectionId = c.req.param("connectionId")

  try {
    const db = getConvex()

    // 1. Fetch the connection to verify ownership and get Composio ID
    const connection = await db.query(api.connections.get, {
      id: connectionId as any, // Convex ID type
    })

    if (!connection) {
      return c.json({error: "Connection not found"}, 404)
    }

    if (connection.user_id !== auth.userId) {
      return c.json({error: "Not your connection"}, 403)
    }

    // 2. Revoke on Composio's side (best-effort — don't fail if Composio is down)
    try {
      await composioService.revokeConnection(connection.composio_connection_id)
    } catch (err: any) {
      console.warn(
        `[connections] Composio revoke failed for ${connection.composio_connection_id}:`,
        err.message,
      )
      // Continue anyway — we still want to remove from our DB
    }

    // 3. Remove from Convex
    await db.mutation(api.connections.remove, {
      id: connectionId as any,
    })

    console.log(
      `[connections] disconnected ${connection.service} for user ${auth.userId}`,
    )

    return c.json({success: true, service: connection.service})
  } catch (err: any) {
    console.error(`[connections] disconnectConnection error:`, err.message)
    return c.json({error: "Failed to disconnect"}, 500)
  }
}

export default app
