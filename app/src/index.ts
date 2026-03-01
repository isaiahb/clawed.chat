/**
 * clawed.chat — Fullstack Entry Point
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
import indexHtml from "./frontend/index.html"

// Configuration from environment
const PORT = parseInt(process.env.PORT || "80", 10)
const PACKAGE_NAME = process.env.PACKAGE_NAME
const API_KEY = process.env.MENTRAOS_API_KEY
const COOKIE_SECRET = process.env.COOKIE_SECRET || API_KEY

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

// Start Bun server
Bun.serve({
  port: PORT,
  idleTimeout: 120,
  development: isDevelopment ? { hmr: true, console: true } : false,
  // WebSocket handlers for the OpenClaw proxy
  websocket: openclawWebSocket,
  routes: {
    // ── Backend routes (more-specific, matched before "/*") ──────────
    //
    // Bun's router matches more-specific patterns first:
    //   "/api/*" beats "/*" for any path starting with /api/
    //   "/mentra/*" beats "/*" for any path starting with /mentra/
    //
    // All backend traffic is forwarded to the Hono app.

    "/api/*": (request: Request, server: any) => {
      // WebSocket upgrade for the OpenClaw proxy endpoint
      if (new URL(request.url).pathname === "/api/openclaw-ws") {
        const upgraded = server.upgrade(request)
        if (upgraded) return undefined
        return new Response("WebSocket upgrade failed", { status: 400 })
      }
      return app.fetch(request)
    },
    "/mentra/*": (request: Request) => app.fetch(request),
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
