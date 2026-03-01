/**
 * clawed.chat — Fullstack Entry Point
 *
 * Uses Bun.serve() with HTML imports for the frontend
 * and Hono-based AppServer for the backend + MentraOS SDK.
 */

import { ClawedChat } from "./backend/ClawedChat"
import { api } from "./backend/api"
import { createMentraAuthRoutes } from "@mentra/sdk"
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

console.log(`clawed.chat running at http://localhost:${PORT}`)

// Determine environment
const isDevelopment = process.env.NODE_ENV === "development"

// Serve static assets — resolved once at startup
const publicPath = `${process.cwd()}/src/public/assets`

// Start Bun server with HTML route bundling
Bun.serve({
  port: PORT,
  idleTimeout: 120, // 2 minutes for SSE connections
  // Bun's HTML routes require the development bundling pipeline to serve compiled assets.
  // HMR is only enabled in actual development mode.
  development: isDevelopment
    ? { hmr: true, console: true }
    : true,
  routes: {
    // Static assets — checked before the catch-all HTML route
    "/assets/*": (request: Request) => {
      const url = new URL(request.url)
      const filePath = `${publicPath}${url.pathname.replace("/assets", "")}`
      const file = Bun.file(filePath)
      return new Response(file)
    },
    "/*": indexHtml,
  },
  fetch(request) {
    // Handle all other requests through Hono app
    return app.fetch(request)
  },
})

// Graceful shutdown
const shutdown = async () => {
  console.log("Shutting down...")
  await app.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
