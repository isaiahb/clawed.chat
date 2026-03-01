/**
 * API Routes — Mount Table
 *
 * Mounts each feature as a scoped Hono sub-app.
 * Every feature owns its own routes — no conflicts possible.
 * This file is ONLY a mount table. No logic, no middleware.
 *
 * GET  /health
 *
 * POST /instances/create
 * GET  /instances/:id
 * POST /instances/:id/stop
 * DELETE /instances/:id
 *
 * POST /chat/:instanceId
 *
 * POST /glasses/voice
 * GET  /glasses/stream/transcription
 */

import {Hono} from "hono"
import instances from "./instances.api"
import chat from "./chat.api"
import glasses from "./glasses.api"

const api = new Hono()

// Health (standalone, no sub-app needed)
api.get("/health", (c) => c.json({status: "ok", timestamp: new Date().toISOString()}))

// Feature sub-apps
api.route("/instances", instances)
api.route("/chat", chat)
api.route("/glasses", glasses)

export {api}
