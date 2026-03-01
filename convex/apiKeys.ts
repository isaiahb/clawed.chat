/**
 * API Key queries and mutations
 *
 * Manages encrypted LLM provider API keys (BYOK).
 * Keys are encrypted before storage — only masked versions
 * are ever returned to the frontend.
 *
 * Reference: Design Doc 08
 */

import {v} from "convex/values"
import {mutation, query} from "./_generated/server"

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * List all keys for a user (masked only — never returns encrypted_key).
 */
export const listByUser = query({
  args: {
    user_id: v.string(),
  },
  handler: async (ctx, args) => {
    const keys = await ctx.db
      .query("api_keys")
      .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
      .collect();

    return keys.map((k) => ({
      _id: k._id,
      provider: k.provider,
      masked_key: k.masked_key,
      is_valid: k.is_valid,
      created_at: k.created_at,
      updated_at: k.updated_at,
    }));
  },
});

/**
 * Get a single key by user + provider.
 * Returns the full record including encrypted_key (for backend decryption).
 * Do NOT expose this to the frontend.
 */
export const getByUserProvider = query({
  args: {
    user_id: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("api_keys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", args.user_id).eq("provider", args.provider),
      )
      .unique();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Upsert a key — creates or updates for a given user + provider.
 */
export const upsert = mutation({
  args: {
    user_id: v.string(),
    provider: v.string(),
    encrypted_key: v.string(),
    masked_key: v.string(),
    is_valid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("api_keys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", args.user_id).eq("provider", args.provider),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encrypted_key: args.encrypted_key,
        masked_key: args.masked_key,
        is_valid: args.is_valid,
        updated_at: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("api_keys", {
      user_id: args.user_id,
      provider: args.provider,
      encrypted_key: args.encrypted_key,
      masked_key: args.masked_key,
      is_valid: args.is_valid,
      created_at: now,
      updated_at: now,
    });
  },
});

/**
 * Mark a key as valid or invalid.
 * Called after periodic re-validation or when a key fails.
 */
export const setValid = mutation({
  args: {
    id: v.id("api_keys"),
    is_valid: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      is_valid: args.is_valid,
      updated_at: Date.now(),
    });
  },
});

/**
 * Delete a key by user + provider.
 */
export const deleteByUserProvider = mutation({
  args: {
    user_id: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("api_keys")
      .withIndex("by_user_provider", (q) =>
        q.eq("user_id", args.user_id).eq("provider", args.provider),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }

    return false;
  },
});
