/**
 * clawed.chat — Fullstack Entry Point
 *
 * SECURITY: The OpenClaw WebSocket proxy (/api/openclaw-ws) verifies
 * the Clerk session cookie before upgrading. Only the OWNER_CLERK_ID
 * account can connect to the shared gateway. Everyone else gets 403.
 *
 * Dev:  bun dev        → runtime bundling + HMR
 * Prod: bun run start  → development: false, cached minified bundles
 *
 * The server always runs from source (Bun handles TS natively).
 * bunfig.toml configures plugins (tailwind, react-dedupe) and env inlining.
 *
 * Routing priority in Bun.serve:
 *   1. Exact/specific routes in `routes` (e.g. "/api/*", "/assets/*")
 *   2. Wildcard catch-all "/*" for SPA HTML bundling
 *   3. `fetch()` is the fallback for anything not matched by `routes`
 *
 * Since Bun matches more-specific routes before less-specific wildcards,
 * "/api/*" will match before "/*", so Hono gets all API traffic while
 * the HTML bundler handles everything else (SPA client-side routing).
 */

import { ClawedChat } from "./backend/ClawedChat"
import { api } from "./backend/api"
import { createMentraAuthRoutes } from "@mentra/sdk"
import { openclawWebSocket } from "./backend/api/openclaw-proxy"
import { relayWebSocket, parseRelayUpgrade } from "./backend/api/relay"
import { createClerkClient } from "@clerk/backend"
import indexHtml from "./frontend/index.html"

// Configuration from environment
const PORT = parseInt(process.env.PORT || "80", 10)
const PACKAGE_NAME = process.env.PACKAGE_NAME
const API_KEY = process.env.MENTRAOS_API_KEY
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY
const OWNER_CLERK_ID = process.env.OWNER_CLERK_ID || ""
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || ""
const CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || process.env.BUN_PUBLIC_CLERK_PUBLISHABLE_KEY || ""

// Clerk server-side client for verifying session tokens on WebSocket upgrade
const clerk = CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: CLERK_SECRET_KEY, publishableKey: CLERK_PUBLISHABLE_KEY })
  : null

// Validate required environment variables
if (!PACKAGE_NAME) {
  console.error("PACKAGE_NAME environment variable is not set")
  process.exit(1)
}

if (!API_KEY) {
  console.error("MENTRAOS_API_KEY environment variable is not set")
  process.exit(1)
}

// Initialize App (extends Hono via AppServer)
const app = new ClawedChat({
  packageName: PACKAGE_NAME,
  apiKey: API_KEY,
  port: PORT,
  cookieSecret: COOKIE_SECRET,
})

// Mount Mentra auth routes for frontend token exchange
app.route(
  "/api/mentra/auth",
  createMentraAuthRoutes({
    apiKey: API_KEY,
    packageName: PACKAGE_NAME,
    cookieSecret: COOKIE_SECRET || "",
  }),
)

// Mount API routes
// @ts-ignore - Hono type compatibility
app.route("/api", api)

// Start the SDK app (registers SDK routes, checks version)
await app.start()

const isDevelopment = process.env.NODE_ENV === "development"

console.log(`clawed.chat running at http://localhost:${PORT} (${isDevelopment ? "development" : "production"})`)

// Serve static assets — resolved once at startup
const publicPath = `${process.cwd()}/src/public/assets`

// One websocket handler, dispatched by the tag set at upgrade time:
//   relay sockets (ws.data.kind === "relay") → the clawed broker
//   everything else                          → the OpenClaw proxy
const combinedWebSocket = {
  open(ws: any) {
    ws.data?.kind === "relay" ? relayWebSocket.open(ws) : openclawWebSocket.open(ws)
  },
  message(ws: any, msg: any) {
    ws.data?.kind === "relay" ? relayWebSocket.message(ws, msg) : openclawWebSocket.message(ws, msg)
  },
  close(ws: any, code: number, reason: string) {
    ws.data?.kind === "relay" ? relayWebSocket.close(ws) : openclawWebSocket.close(ws, code, reason)
  },
}

// Start Bun server
Bun.serve({
  port: PORT,
  idleTimeout: 120,
  development: isDevelopment ? { hmr: true, console: true } : false,
  // WebSocket handlers: clawed relay + OpenClaw proxy (dispatched by tag)
  websocket: combinedWebSocket,
  routes: {
    // ── Backend routes (more-specific, matched before "/*") ──────────
    //
    // Bun's router matches more-specific patterns first:
    //   "/api/*" beats "/*" for any path starting with /api/
    //   "/mentra/*" beats "/*" for any path starting with /mentra/
    //
    // All backend traffic is forwarded to the Hono app.

    "/api/*": async (request: Request, server: any) => {
      // Clawed relay upgrade: /api/relay?role=agent|glasses&pair=<code>
      // Paired by code (the demo's pairing handshake); no Clerk — the code is
      // the room key. The plugin (agent) and miniapp (glasses) meet here.
      const relayData = parseRelayUpgrade(request)
      if (relayData) {
        const upgraded = server.upgrade(request, { data: relayData })
        if (upgraded) return undefined
        return new Response("WebSocket upgrade failed", { status: 400 })
      }

      // WebSocket upgrade for the OpenClaw proxy endpoint
      if (new URL(request.url).pathname === "/api/openclaw-ws") {
        // ── SECURITY: Verify Clerk session + owner check before upgrade ──
        if (!clerk) {
          console.error("[openclaw-ws] Clerk not configured, rejecting WS upgrade")
          return new Response("Server misconfigured", { status: 500 })
        }

        try {
          const cookieHeader = request.headers.get("cookie") || ""
          // Clerk stores the session JWT in __session cookie
          const sessionMatch = cookieHeader.match(/__session=([^;]+)/)
          const token = sessionMatch?.[1]

          if (!token) {
            console.warn("[openclaw-ws] No __session cookie, rejecting WS upgrade")
            return new Response("Unauthorized", { status: 401 })
          }

          const { userId } = await clerk.authenticateRequest(request, {
            jwtKey: undefined,
            authorizedParties: undefined,
          }).then(r => r.toAuth() || { userId: null })

          if (!userId) {
            console.warn("[openclaw-ws] Invalid Clerk session, rejecting WS upgrade")
            return new Response("Unauthorized", { status: 401 })
          }

          if (OWNER_CLERK_ID && userId !== OWNER_CLERK_ID) {
            console.warn(`[openclaw-ws] Non-owner rejected: ${userId}`)
            return new Response("Forbidden", { status: 403 })
          }

          console.log(`[openclaw-ws] Owner verified, upgrading: ${userId}`)
        } catch (err: any) {
          console.error("[openclaw-ws] Auth check failed:", err.message)
          return new Response("Unauthorized", { status: 401 })
        }

        const upgraded = server.upgrade(request)
        if (upgraded) return undefined
        return new Response("WebSocket upgrade failed", { status: 400 })
      }
      return app.fetch(request)
    },
    "/mentra/*": (request: Request, server: any) => {
      // Mentra SDK needs WebSocket upgrade for glasses connections
      if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
        const upgraded = server.upgrade(request)
        if (upgraded) return undefined
        return new Response("WebSocket upgrade failed", { status: 400 })
      }
      return app.fetch(request)
    },
    // Mentra SDK webhook — receives session_request from Mentra cloud
    // Must be routed to Hono before the "/*" SPA catch-all swallows it
    "/webhook": (request: Request) => app.fetch(request),
    "/clerk/*": (request: Request) => app.fetch(request),

    // ── Static assets ────────────────────────────────────────────────

    "/assets/*": (request: Request) => {
      const url = new URL(request.url)
      const filePath = `${publicPath}${url.pathname.replace("/assets", "")}`
      return new Response(Bun.file(filePath))
    },

    // ── SPA catch-all ────────────────────────────────────────────────
    //
    // Serves the bundled index.html for all remaining paths.
    // Dev:  runtime bundled with HMR
    // Prod: lazy bundled, cached, minified (no HMR)
    //
    // This handles /, /app/agents, /app/chat/:id, /app/settings, etc.
    // React Router takes over client-side after the HTML loads.
    "/*": indexHtml,
  },
  fetch(request) {
    // Fallback — anything that slipped past routes goes to Hono.
    // In practice this shouldn't be hit since "/*" catches everything,
    // but it's here as a safety net for edge cases.
    return app.fetch(request)
  },
})

if (isDevelopment) {
  console.log("  → HMR enabled")
}

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...")
  await app.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
