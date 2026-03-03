/**
 * User queries and mutations
 *
 * Called by the Hono backend after Clerk authentication.
 * Handles user creation (first sign-in) and lookup.
 *
 * SECURITY: User-facing queries verify Clerk auth so users
 * can only see their own profile. Mutations called from the
 * backend (ConvexHttpClient, no Clerk session) remain open
 * but are gated at the Hono API layer (me.api.ts).
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get or create a user by their Clerk ID.
 *
 * Called on every authenticated request — idempotent.
 * If the user already exists, returns their ID.
 * If not, creates a new record and returns the new ID.
 */
export const getOrCreate = mutation({
  args: {
    clerk_id: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .unique();

    if (existing) {
      // Update name/email if changed (Clerk profile updates)
      if (existing.email !== args.email || existing.name !== args.name) {
        await ctx.db.patch(existing._id, {
          email: args.email,
          name: args.name,
        });
      }
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerk_id: args.clerk_id,
      email: args.email,
      name: args.name,
    });

    return userId;
  },
});

/**
 * Get a user by their Clerk ID.
 * Returns null if not found.
 *
 * SECURITY: If caller is authenticated, they can only look up themselves.
 */
export const getByClerkId = query({
  args: {
    clerk_id: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && args.clerk_id !== identity.subject) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .unique();
  },
});

/**
 * Get a user by their Convex document ID.
 * Returns null if not found.
 *
 * SECURITY: If caller is authenticated, they can only fetch their own record.
 */
export const get = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await ctx.db.get(args.id);
    if (!user) return null;

    if (identity && user.clerk_id !== identity.subject) {
      return null;
    }

    return user;
  },
});
