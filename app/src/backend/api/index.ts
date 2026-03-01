/**
 * API Routes — Mount Table
 *
 * Mounts each feature as a scoped Hono sub-app.
 * Every feature owns its own routes — no conflicts possible.
 * This file is ONLY a mount table. No logic, no middleware.
 *
 * GET  /health
 *
 * POST /webhooks/clerk
 *
 * GET  /me
 *
 * GET  /keys
 * POST /keys
 * DELETE /keys/:provider
 *
 * POST /instances/create
 * GET  /instances/:id
 * POST /instances/:id/stop
 * DELETE /instances/:id
 *
 * POST /chat/:instanceId
 *
 * POST /llm-proxy/v1/chat/completions
 * GET  /llm-proxy/v1/models
 *
 * GET  /connections
 * POST /connections/:service/connect
 * GET  /connections/callback
 * DELETE /connections/:connectionId
 *
 * POST /openclaw/outbound
 *
 * POST /glasses/voice
 * GET  /glasses/stream/transcription
 *
 * POST /desktop/register
 * POST /desktop/heartbeat
 */

import {Hono} from "hono"
import {clerkMiddleware} from "@hono/clerk-auth"
import webhooks from "./webhooks.api"
import me from "./me.api"
import keys from "./keys.api"
import instances from "./instances.api"
import chat from "./chat.api"
import connections from "./connections.api"
import openclaw from "./openclaw.api"
import llmProxy from "./llm-proxy.api"
import glasses from "./glasses.api"
import desktop from "./desktop.api"

const api = new Hono()

// Health (standalone, no auth needed)
api.get("/health", (c) => c.json({status: "ok", timestamp: new Date().toISOString()}))

// Clerk auth middleware — runs before all authenticated routes.
// This populates c.get("clerkAuth") so getAuth(c) works in route handlers.
// Routes that don't need auth (webhooks, openclaw outbound) handle their own verification.
api.use("/me/*", clerkMiddleware())
api.use("/keys/*", clerkMiddleware())
api.use("/instances/*", clerkMiddleware())
api.use("/chat/*", clerkMiddleware())
api.use("/connections/*", clerkMiddleware())
api.use("/desktop/*", clerkMiddleware())
api.use("/glasses/*", clerkMiddleware())

// Feature sub-apps
api.route("/webhooks", webhooks)
api.route("/me", me)
api.route("/keys", keys)
api.route("/instances", instances)
api.route("/chat", chat)
api.route("/connections", connections)
api.route("/openclaw", openclaw)
api.route("/llm-proxy", llmProxy)
api.route("/glasses", glasses)
api.route("/desktop", desktop)

export {api}
