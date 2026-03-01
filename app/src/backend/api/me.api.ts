/**
 * Me API — current user info
 *
 * GET /    → returns current authenticated user profile
 *
 * Reference: Design Doc 01
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", getCurrentUser)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET / — returns the current user's profile.
 *
 * Uses Clerk auth to identify the user, then fetches their
 * full profile from Convex (including connected instances, etc.)
 */
async function getCurrentUser(c: Context) {
  const auth = getAuth(c)

  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  // TODO: Fetch user from Convex using auth.userId (Clerk ID)
  // const user = await convex.query("users:getByClerkId", {clerk_id: auth.userId})
  //
  // if (!user) {
  //   return c.json({error: "User not found"}, 404)
  // }
  //
  // return c.json({
  //   id: user._id,
  //   clerk_id: user.clerk_id,
  //   email: user.email,
  //   name: user.name,
  // })

  return c.json({
    clerk_id: auth.userId,
    status: "ok",
  })
}

export default app
