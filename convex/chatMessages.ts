/**
 * Chat message queries and mutations
 *
 * Stores message history between users and their OpenClaw agents.
 * Messages are written from two places:
 *   - User messages: written by chat.api.ts when the user sends a message
 *   - Agent messages: written by openclaw.api.ts when the channel plugin
 *     POSTs back the agent's response
 *
 * The frontend subscribes to listByInstance for real-time updates.
 *
 * SECURITY: All queries verify that the caller owns the instance
 * they're requesting messages for. Convex auth uses Clerk JWTs.
 *
 * Reference: Design Doc 10
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const messageRole = v.union(v.literal("user"), v.literal("agent"));
const messageSource = v.union(
  v.literal("web"),
  v.literal("glasses"),
  v.literal("desktop"),
);

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function requireUser(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized — no valid session");
  }
  // Clerk subject is the Clerk user ID
  return identity.subject;
}

/**
 * Verify the caller owns the instance they're requesting.
 * Returns the Clerk user ID if authorized, throws otherwise.
 */
async function requireInstanceOwner(
  ctx: any,
  instanceId: string,
): Promise<string> {
  const userId = await requireUser(ctx);
  const instance = await ctx.db.get(instanceId as any);
  if (!instance) {
    throw new Error("Instance not found");
  }
  if (instance.user_id !== userId) {
    throw new Error("Unauthorized — you don't own this instance");
  }
  return userId;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List messages for an instance, ordered by timestamp.
 * Used by the dashboard chat panel — subscribes for real-time updates.
 *
 * SECURITY: Only the instance owner can read messages.
 */
export const listByInstance = query({
  args: {
    instance_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireInstanceOwner(ctx, args.instance_id);

    const limit = args.limit ?? 100;

    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_instance", (q) => q.eq("instance_id", args.instance_id))
      .order("asc")
      .take(limit);

    return messages;
  },
});

/**
 * List the most recent messages for an instance (newest first).
 * Useful for loading the latest N messages when opening the chat panel.
 *
 * SECURITY: Only the instance owner can read messages.
 */
export const listRecent = query({
  args: {
    instance_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireInstanceOwner(ctx, args.instance_id);

    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_instance", (q) => q.eq("instance_id", args.instance_id))
      .order("desc")
      .take(limit);

    // Reverse so they're in chronological order for display
    return messages.reverse();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Insert a new chat message.
 * Called from both the chat API (user messages) and the
 * openclaw outbound handler (agent messages).
 *
 * NOTE: This is called from the backend (ConvexHttpClient) which
 * doesn't have a Clerk session. We keep it open but validate
 * at the Hono API layer (chat.api.ts + openclaw.api.ts).
 */
export const insert = mutation({
  args: {
    user_id: v.string(),
    instance_id: v.string(),
    role: messageRole,
    source: messageSource,
    content: v.string(),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("chat_messages", {
      user_id: args.user_id,
      instance_id: args.instance_id,
      role: args.role,
      source: args.source,
      content: args.content,
      timestamp: args.timestamp ?? Date.now(),
    });
  },
});

/**
 * Delete all messages for an instance.
 * Called when an instance is destroyed or when the user clears chat history.
 */
export const clearByInstance = mutation({
  args: {
    instance_id: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_instance", (q) => q.eq("instance_id", args.instance_id))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    return messages.length;
  },
});
