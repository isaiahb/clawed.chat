/**
 * Me API — current user info
 *
 * GET /    → returns current authenticated user profile
 *
 * Also handles auto-claiming seeded instances on first login.
 * When a user logs in for the first time, any instance with
 * user_id="seed" gets reassigned to their real Clerk ID.
 *
 * Reference: Design Doc 01
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"

/** Seeded instance ID — pre-created for the demo before any user logs in */
const SEED_INSTANCE_ID = process.env.SEED_INSTANCE_ID || ""

/** Only this Clerk user ID can claim the pre-provisioned seed instance */
const OWNER_CLERK_ID = process.env.OWNER_CLERK_ID || ""

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

    // Auto-claim seeded instances on first login — OWNER ONLY
    // The seed instance points at the pre-provisioned VM with the owner's
    // API keys, Composio connections, etc. Only the owner should get it.
    if (SEED_INSTANCE_ID && OWNER_CLERK_ID && auth.userId === OWNER_CLERK_ID) {
      try {
        await db.mutation(api.instances.claimForUser, {
          id: SEED_INSTANCE_ID as any,
          user_id: auth.userId,
        })
        console.log(`[me] auto-claimed seeded instance ${SEED_INSTANCE_ID} for owner ${auth.userId}`)
      } catch (claimErr: any) {
        // Already claimed or doesn't exist — that's fine
        if (!claimErr.message?.includes("already claimed")) {
          console.warn(`[me] seed instance claim failed (non-fatal): ${claimErr.message}`)
        }
      }
    }

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
