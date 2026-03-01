/**
 * Webhooks API — receives events from external services
 *
 * POST /clerk    → Clerk user lifecycle events (user.created, user.updated, etc.)
 *
 * Reference: Design Doc 01
 */

import {Hono} from "hono"
import type {Context} from "hono"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post("/clerk", handleClerkWebhook)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /clerk — Clerk sends user lifecycle events here.
 *
 * Events we care about:
 *   - user.created → insert into Convex users table
 *   - user.updated → update email/name in Convex
 *   - user.deleted → (optional) mark user as deleted
 *
 * Clerk signs webhooks with Svix — verify before processing.
 */
async function handleClerkWebhook(c: Context) {
  // TODO: Verify webhook signature using Svix headers:
  //   svix-id, svix-timestamp, svix-signature
  //   Against CLERK_WEBHOOK_SECRET

  // TODO: Parse the event type and payload
  // const {type, data} = await c.req.json()
  //
  // switch (type) {
  //   case "user.created":
  //   case "user.updated":
  //     await convex.mutation("users:getOrCreate", {
  //       clerk_id: data.id,
  //       email: data.email_addresses[0]?.email_address,
  //       name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
  //     })
  //     break
  //   case "user.deleted":
  //     // Optional: handle user deletion
  //     break
  // }

  return c.json({received: true})
}

export default app
