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
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[me] CONVEX_URL not configured")
  }
  return convex
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", getCurrentUser)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET / — returns the current user's profile.
 *
 * Uses Clerk auth to identify the user, then fetches their
 * full profile from Convex. If the user doesn't exist in Convex yet
 * (first request), we return a minimal stub from the Clerk token.
 */
async function getCurrentUser(c: Context) {
  const auth = getAuth(c)

  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  try {
    const db = getConvex()
    const user = await db.query(api.users.getByClerkId, {clerk_id: auth.userId})

    if (!user) {
      // User hasn't been synced to Convex yet — return what we know from Clerk
      return c.json({
        clerk_id: auth.userId,
        email: null,
        name: null,
        synced: false,
      })
    }

    return c.json({
      id: user._id,
      clerk_id: user.clerk_id,
      email: user.email,
      name: user.name,
      synced: true,
    })
  } catch (err: any) {
    console.error("[me] getCurrentUser error:", err.message)
    return c.json({error: "Failed to fetch user profile"}, 500)
  }
}

export default app
