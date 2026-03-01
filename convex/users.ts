/**
 * User queries and mutations
 *
 * Called by the Hono backend after Clerk authentication.
 * Handles user creation (first sign-in) and lookup.
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
 */
export const getByClerkId = query({
  args: {
    clerk_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerk_id", args.clerk_id))
      .unique();
  },
});

/**
 * Get a user by their Convex document ID.
 * Returns null if not found.
 */
export const get = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
