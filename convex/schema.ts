/**
 * Convex Schema — clawed.chat data model
 *
 * Tables:
 *   - users: Clerk-authenticated users
 *   - instances: OpenClaw cloud/local instances per user
 *   - api_keys: Encrypted LLM provider API keys (BYOK)
 *   - connections: Composio OAuth connections (Gmail, GitHub, etc.)
 *   - chat_messages: Message history between user and agent
 *
 * Reference: SPEC.md → Data Model, Design Docs 04, 08, 10
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerk_id: v.string(),
    email: v.string(),
    name: v.string(),
  })
    .index("by_clerk_id", ["clerk_id"])
    .index("by_email", ["email"]),

  instances: defineTable({
    user_id: v.string(),
    type: v.union(v.literal("cloud"), v.literal("local")),
    status: v.union(
      v.literal("provisioning"),
      v.literal("running"),
      v.literal("stopped"),
      v.literal("stopping"),
      v.literal("starting"),
      v.literal("destroying"),
      v.literal("destroyed"),
      v.literal("error"),
    ),
    subdomain: v.string(),
    ip: v.optional(v.string()),
    gcp_vm_name: v.optional(v.string()),
    gcp_zone: v.optional(v.string()),
    browser_use_session_id: v.optional(v.string()),
    browser_use_live_url: v.optional(v.string()),
    llm_provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
      v.literal("minimax"),
    ),
    last_active_at: v.optional(v.number()),
  })
    .index("by_user", ["user_id"])
    .index("by_subdomain", ["subdomain"])
    .index("by_status", ["status"]),

  api_keys: defineTable({
    user_id: v.string(),
    provider: v.string(),
    encrypted_key: v.string(),
    masked_key: v.string(),
    is_valid: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_provider", ["user_id", "provider"]),

  connections: defineTable({
    user_id: v.string(),
    service: v.string(),
    composio_connection_id: v.string(),
    status: v.union(
      v.literal("connected"),
      v.literal("disconnected"),
      v.literal("expired"),
      v.literal("error"),
    ),
    connected_at: v.optional(v.number()),
    permissions: v.array(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_service", ["user_id", "service"]),

  chat_messages: defineTable({
    user_id: v.string(),
    instance_id: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    source: v.union(
      v.literal("web"),
      v.literal("glasses"),
      v.literal("desktop"),
    ),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_instance", ["instance_id", "timestamp"]),
});
