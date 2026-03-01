/**
 * Convex Schema — clawed.chat data model
 *
 * Three tables:
 *   - users: Clerk-authenticated users
 *   - instances: OpenClaw cloud/local instances per user
 *   - apiKeys: Encrypted LLM provider API keys (BYOK)
 *
 * Reference: SPEC.md → Data Model (Convex)
 */

import {defineSchema, defineTable} from "convex/server"
import {v} from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  instances: defineTable({
    userId: v.id("users"),
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
    gcpVmName: v.optional(v.string()),
    gcpZone: v.optional(v.string()),
    browserUseSessionId: v.optional(v.string()),
    browserUseLiveUrl: v.optional(v.string()),
    llmProvider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
      v.literal("minimax"),
    ),
    lastActiveAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_subdomain", ["subdomain"])
    .index("by_status", ["status"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    provider: v.union(
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("google"),
      v.literal("minimax"),
    ),
    encryptedKey: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),
})
