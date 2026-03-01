/**
 * Instance queries and mutations
 *
 * Called by the Hono backend (via ConvexHttpClient) to manage
 * OpenClaw instance lifecycle in the database.
 *
 * The Hono services layer (instance.service.ts) orchestrates
 * the actual infrastructure — these functions just track state.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const instanceStatus = v.union(
  v.literal("provisioning"),
  v.literal("running"),
  v.literal("stopped"),
  v.literal("stopping"),
  v.literal("starting"),
  v.literal("destroying"),
  v.literal("destroyed"),
  v.literal("error"),
);

const llmProvider = v.union(
  v.literal("anthropic"),
  v.literal("openai"),
  v.literal("google"),
  v.literal("minimax"),
);

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create a new instance record.
 * Called at the start of deploy — status will be "provisioning".
 * Returns the new instance ID.
 */
export const create = mutation({
  args: {
    user_id: v.string(),
    type: v.union(v.literal("cloud"), v.literal("local")),
    subdomain: v.string(),
    llm_provider: llmProvider,
    status: instanceStatus,
  },
  handler: async (ctx, args) => {
    const instanceId = await ctx.db.insert("instances", {
      user_id: args.user_id,
      type: args.type,
      subdomain: args.subdomain,
      llm_provider: args.llm_provider,
      status: args.status,
      last_active_at: Date.now(),
    });
    return instanceId;
  },
});

/**
 * Update instance status.
 * Called at each lifecycle milestone (provisioning → running → stopped → destroyed, etc.)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("instances"),
    status: instanceStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

/**
 * Update instance infrastructure details.
 * Called after Pulumi finishes provisioning — fills in IP, VM name, etc.
 */
export const updateDetails = mutation({
  args: {
    id: v.id("instances"),
    ip: v.optional(v.string()),
    gcp_vm_name: v.optional(v.string()),
    gcp_zone: v.optional(v.string()),
    browser_use_session_id: v.optional(v.string()),
    browser_use_live_url: v.optional(v.string()),
    status: v.optional(instanceStatus),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(id, updates);
    }
  },
});

/**
 * Touch last_active_at timestamp.
 * Called whenever a user interacts with their instance (chat, glasses, dashboard).
 * Used by the auto-sleep cron to detect idle instances.
 */
export const touch = mutation({
  args: {
    id: v.id("instances"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { last_active_at: Date.now() });
  },
});

/**
 * Soft-delete: mark an instance as destroyed.
 * We keep the record for audit/history — just flip status.
 */
export const markDestroyed = mutation({
  args: {
    id: v.id("instances"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "destroyed" });
  },
});

/**
 * Hard-delete: remove the instance record entirely.
 * Only use this for cleanup — prefer markDestroyed for normal flow.
 */
export const remove = mutation({
  args: {
    id: v.id("instances"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Get a single instance by ID.
 * Returns null if not found.
 */
export const get = query({
  args: {
    id: v.id("instances"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * List all instances for a user (excluding destroyed).
 * Used by the dashboard to show the user's active/stopped instances.
 * Real-time — dashboard auto-updates when status changes.
 */
export const listByUser = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("instances")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    // Filter out destroyed instances
    return all.filter((i) => i.status !== "destroyed");
  },
});

/**
 * List all instances with a given status.
 * Used by the auto-sleep cron to find idle running instances.
 */
export const listByStatus = query({
  args: {
    status: instanceStatus,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instances")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

/**
 * Find an instance by its subdomain.
 * Used for routing — when a request comes in for alice.clawed.chat,
 * look up the instance to find the VM IP.
 */
export const getBySubdomain = query({
  args: {
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instances")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .unique();
  },
});

/**
 * List running instances that have been idle beyond the given threshold.
 * Used by the auto-sleep cron to find instances to put to sleep.
 *
 * Returns running instances where last_active_at < (now - idleThresholdMs).
 */
export const listIdle = query({
  args: {
    idle_threshold_ms: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.idle_threshold_ms;

    const running = await ctx.db
      .query("instances")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .collect();

    return running.filter((i) => {
      const lastActive = i.last_active_at ?? 0;
      return lastActive < cutoff;
    });
  },
});
