/**
 * clawed.chat — Fullstack Entry Point
 *
 * Dev:  bun dev        → runtime bundling + HMR
 * Prod: bun run start  → development: false, lazy cached minified bundles
 *
 * The server always runs from source (Bun handles TS natively).
 * bunfig.toml configures plugins (tailwind, react-dedupe) and env inlining.
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

const isDevelopment = process.env.NODE_ENV === "development"

console.log(`clawed.chat running at http://localhost:${PORT} (${isDevelopment ? "development" : "production"})`)

// Serve static assets — resolved once at startup
const publicPath = `${process.cwd()}/src/public/assets`

// Start Bun server
Bun.serve({
  port: PORT,
  idleTimeout: 120,
  development: isDevelopment && {
    hmr: true,
    console: true,
  },
  routes: {
    // Static assets — checked before the catch-all HTML route
    "/assets/*": (request: Request) => {
      const url = new URL(request.url)
      const filePath = `${publicPath}${url.pathname.replace("/assets", "")}`
      const file = Bun.file(filePath)
      return new Response(file)
    },
    // SPA catch-all — serves bundled index.html
    // Dev: runtime bundled with HMR
    // Prod: lazy bundled, cached, minified. No HMR.
    "/*": indexHtml,
  },
  fetch(request) {
    // All non-matched routes (API, SDK, Mentra) go through Hono
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
