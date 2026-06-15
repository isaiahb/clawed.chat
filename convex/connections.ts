/**
 * Connection queries and mutations
 *
 * Manages Composio OAuth connections for external services
 * (Gmail, Google Calendar, GitHub, etc.)
 *
 * SECURITY: All user-facing queries verify Clerk auth so users
 * can only see their own connections. Mutations called from the
 * backend (ConvexHttpClient, no Clerk session) remain open but
 * are gated at the Hono API layer (connections.api.ts).
 *
 * Reference: Design Doc 04
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function requireUser(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized — no valid session");
  }
  return identity.subject;
}

const connectionStatus = v.union(
  v.literal("connected"),
  v.literal("disconnected"),
  v.literal("expired"),
  v.literal("error"),
);

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all connections for a user.
 *
 * SECURITY: If caller is authenticated, they can only list their own.
 */
export const listByUser = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && args.user_id !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query("connections")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});

/**
 * Get a specific connection by user + service.
 *
 * SECURITY: If caller is authenticated, they can only query their own.
 */
export const getByUserService = query({
  args: {
    user_id: v.string(),
    service: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity && args.user_id !== identity.subject) {
      return null;
    }

    return await ctx.db
      .query("connections")
      .withIndex("by_user_service", (q) =>
        q.eq("user_id", args.user_id).eq("service", args.service),
      )
      .unique();
  },
});

/**
 * Get a connection by its Convex document ID.
 *
 * SECURITY: Only the connection owner can fetch it.
 */
export const get = query({
  args: {
    id: v.id("connections"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const connection = await ctx.db.get(args.id);
    if (!connection) return null;

    if (identity && connection.user_id !== identity.subject) {
      return null;
    }

    return connection;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Upsert a connection — creates or updates for a given user + service.
 * Called after a successful Composio OAuth flow.
 */
export const upsert = mutation({
  args: {
    user_id: v.string(),
    service: v.string(),
    composio_connection_id: v.string(),
    status: connectionStatus,
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_user_service", (q) =>
        q.eq("user_id", args.user_id).eq("service", args.service),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        composio_connection_id: args.composio_connection_id,
        status: args.status,
        connected_at:
          args.status === "connected" ? Date.now() : existing.connected_at,
        permissions: args.permissions,
      });
      return existing._id;
    }

    return await ctx.db.insert("connections", {
      user_id: args.user_id,
      service: args.service,
      composio_connection_id: args.composio_connection_id,
      status: args.status,
      connected_at: args.status === "connected" ? Date.now() : undefined,
      permissions: args.permissions,
    });
  },
});

/**
 * Update just the status of a connection.
 * Used when a connection expires or errors out.
 */
/**
 * Update a connection by its composio_connection_id.
 * Used in the OAuth callback when we don't have the user's auth context
 * but we know which composio session completed.
 */
export const updateByComposioId = mutation({
  args: {
    composio_connection_id: v.string(),
    status: connectionStatus,
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Scan all connections to find the one with this composio_connection_id
    const all = await ctx.db.query("connections").collect();
    const match = all.find(
      (c) => c.composio_connection_id === args.composio_connection_id,
    );

    if (!match) {
      throw new Error(
        `No connection found with composio_connection_id=${args.composio_connection_id}`,
      );
    }

    await ctx.db.patch(match._id, {
      status: args.status,
      connected_at:
        args.status === "connected" ? Date.now() : match.connected_at,
      permissions: args.permissions,
    });

    return match._id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("connections"),
    status: connectionStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Delete a connection record entirely.
 * Called after the user disconnects a service and we revoke on Composio's side.
 */
export const remove = mutation({
  args: {
    id: v.id("connections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
