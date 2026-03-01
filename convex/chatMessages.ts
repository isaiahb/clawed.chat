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
 * Reference: Design Doc 10
 */

import {v} from "convex/values"
import {mutation, query} from "./_generated/server"

const messageRole = v.union(v.literal("user"), v.literal("agent"))
const messageSource = v.union(
  v.literal("web"),
  v.literal("glasses"),
  v.literal("desktop"),
)

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List messages for an instance, ordered by timestamp.
 * Used by the dashboard chat panel — subscribes for real-time updates.
 */
export const listByInstance = query({
  args: {
    instance_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100

    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_instance", (q) => q.eq("instance_id", args.instance_id))
      .order("asc")
      .take(limit)

    return messages
  },
})

/**
 * List the most recent messages for an instance (newest first).
 * Useful for loading the latest N messages when opening the chat panel.
 */
export const listRecent = query({
  args: {
    instance_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50

    const messages = await ctx.db
      .query("chat_messages")
      .withIndex("by_instance", (q) => q.eq("instance_id", args.instance_id))
      .order("desc")
      .take(limit)

    // Reverse so they're in chronological order for display
    return messages.reverse()
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Insert a new chat message.
 * Called from both the chat API (user messages) and the
 * openclaw outbound handler (agent messages).
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
    })
  },
})

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
      .collect()

    for (const msg of messages) {
      await ctx.db.delete(msg._id)
    }

    return messages.length
  },
})
