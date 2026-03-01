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

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", listConnections)
app.post("/:service/connect", initiateConnection)
app.get("/callback", handleCallback)
app.delete("/:connectionId", disconnectConnection)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET / — returns all active connections for the current user.
 *
 * Response: { connections: [{ service, status, connected_at, permissions }] }
 */
async function listConnections(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  // TODO: Fetch from Convex `connections` table by user_id
  // const connections = await convex.query("connections:listByUser", {user_id: auth.userId})
  //
  // return c.json({
  //   connections: connections.map((conn) => ({
  //     id: conn._id,
  //     service: conn.service,
  //     status: conn.status,
  //     connected_at: conn.connected_at,
  //     permissions: conn.permissions,
  //   })),
  // })

  return c.json({connections: []})
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

  const validServices = ["gmail", "googlecalendar", "github"]
  if (!validServices.includes(service)) {
    return c.json({error: `Unsupported service. Must be one of: ${validServices.join(", ")}`}, 400)
  }

  // TODO: Use ComposioService to create a connection session
  // const redirectUrl = await ComposioService.createConnection(auth.userId, service)
  //
  // TODO: Optionally record a "pending" connection in Convex
  //
  // return c.json({redirect_url: redirectUrl})

  return c.json({redirect_url: "https://composio.dev/stub-redirect"})
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
    return c.json({error: "Missing session_id"}, 400)
  }

  // TODO: Verify the session with ComposioService
  // const result = await ComposioService.verifySession(sessionId)
  //
  // TODO: Update Convex `connections` table
  // await convex.mutation("connections:upsert", {
  //   user_id: result.userId,
  //   service: result.service,
  //   composio_connection_id: result.connectionId,
  //   status: "connected",
  //   connected_at: Date.now(),
  //   permissions: result.permissions,
  // })

  // Redirect back to the dashboard with a success indicator
  return c.redirect("/?connection=success")
}

/**
 * DELETE /:connectionId — disconnect an active integration.
 *
 * Revokes the connection on Composio's side and updates our database.
 */
async function disconnectConnection(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const connectionId = c.req.param("connectionId")

  // TODO: Verify user owns this connection
  // TODO: Revoke on Composio's side
  // await ComposioService.revokeConnection(connectionId)
  //
  // TODO: Update Convex status to "disconnected"
  // await convex.mutation("connections:updateStatus", {
  //   id: connectionId,
  //   status: "disconnected",
  // })

  return c.json({success: true})
}

export default app
