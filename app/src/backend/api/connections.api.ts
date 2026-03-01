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

const VALID_SERVICES = ["gmail", "googlecalendar", "github", "slack", "notion", "linear"]

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
  // Composio redirects with: ?status=success&connected_account_id=ca_xxx
  // OR legacy format: ?session_id=xxx
  const connectedAccountId = c.req.query("connected_account_id")
  const status = c.req.query("status")
  const sessionId = c.req.query("session_id")

  console.log(`[connections] callback received: status=${status} connected_account_id=${connectedAccountId} session_id=${sessionId}`)

  // Handle Composio's actual redirect format
  if (status === "success" && connectedAccountId) {
    try {
      // Verify the connection with Composio using the connected_account_id
      const result = await composioService.verifyConnection(connectedAccountId)

      if (result.status === "connected") {
        console.log(`[connections] OAuth verified: service=${result.service} connectionId=${result.connectionId} user=${result.userId}`)

        // Update Convex with the real connection data.
        // The entityId from Composio may be empty, so we look up the user
        // by the composio_connection_id we stored during the initiate step.
        const db = getConvex()

        // First try: use entityId from Composio (our Clerk userId)
        let userId = result.userId

        // Fallback: search all connections for this composio_connection_id
        // (we stored it during POST /:service/connect)
        if (!userId) {
          try {
            const allConnections = await db.query(api.connections.listByUser, {user_id: ""})
            // Can't search all users easily, so search by the connection ID we stored
            // The composio_connection_id was set during initiate — find which user owns it
          } catch {}
        }

        // If we still don't have a userId, update by scanning for the composio_connection_id
        // Since we stored it during initiate, we can find the matching record
        if (!userId) {
          // Use the connectedAccountId to find and update the existing record directly
          // We need a mutation that updates by composio_connection_id instead of user_id
          console.log(`[connections] No entityId from Composio, updating by composio_connection_id=${connectedAccountId}`)
          try {
            await db.mutation(api.connections.updateByComposioId, {
              composio_connection_id: connectedAccountId,
              status: "connected" as const,
              permissions: result.permissions || [],
            })
          } catch (err: any) {
            console.error(`[connections] updateByComposioId failed:`, err.message)
          }
        } else {
          await db.mutation(api.connections.upsert, {
            user_id: userId,
            service: result.service,
            composio_connection_id: connectedAccountId,
            status: "connected" as const,
            permissions: result.permissions || [],
          })
        }

        return c.redirect(
          `${DASHBOARD_URL}/app/connections?connection=success&service=${result.service}`,
        )
      }

      return c.redirect(
        `${DASHBOARD_URL}/app/connections?connection=error&service=${result.service || "unknown"}`,
      )
    } catch (err: any) {
      console.error("[connections] callback verification error:", err.message)
      return c.redirect(
        `${DASHBOARD_URL}/app/connections?connection=error&reason=verification_failed`,
      )
    }
  }

  // Legacy: handle session_id format
  if (sessionId) {
    try {
      const result = await composioService.verifySession(sessionId)
      if (result.status === "connected") {
        return c.redirect(
          `${DASHBOARD_URL}/app/connections?connection=success&service=${result.service}`,
        )
      }
      return c.redirect(
        `${DASHBOARD_URL}/app/connections?connection=error&service=${result.service}`,
      )
    } catch (err: any) {
      console.error("[connections] callback (legacy) error:", err.message)
      return c.redirect(
        `${DASHBOARD_URL}/app/connections?connection=error&reason=verification_failed`,
      )
    }
  }

  console.error("[connections] callback missing both connected_account_id and session_id")
  return c.redirect(`${DASHBOARD_URL}/app/connections?connection=error&reason=missing_params`)
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
