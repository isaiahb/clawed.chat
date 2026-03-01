/**
 * Keys API — BYOK (Bring Your Own Key) LLM provider key management
 *
 * GET /           → list masked keys for current user
 * POST /          → validate, encrypt, and store a new API key
 * DELETE /:provider → delete a stored key for a specific provider
 *
 * Reference: Design Doc 08
 */

import {Hono} from "hono"
import type {Context} from "hono"
import {getAuth} from "@hono/clerk-auth"

const app = new Hono()

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", listKeys)
app.post("/", addKey)
app.delete("/:provider", deleteKey)

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET / — returns all stored keys for the current user (masked only).
 *
 * Response: { keys: [{ provider, masked_key, is_valid, updated_at }] }
 * Never returns the actual key — only the masked version (e.g. "sk-ant-...x4f9")
 */
async function listKeys(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  // TODO: Fetch keys from Convex `api_keys` table by user_id
  // const keys = await convex.query("apiKeys:listByUser", {user_id: auth.userId})
  //
  // return c.json({
  //   keys: keys.map((k) => ({
  //     provider: k.provider,
  //     masked_key: k.masked_key,
  //     is_valid: k.is_valid,
  //     updated_at: k.updated_at,
  //   })),
  // })

  return c.json({keys: []})
}

/**
 * POST / — validate, encrypt, and store a new API key.
 *
 * Body: { provider: "anthropic" | "openai" | "google", api_key: "sk-..." }
 *
 * Flow:
 *   1. Validate the key by making a lightweight API call to the provider
 *   2. Encrypt the key using AES-256-GCM (encryption.ts)
 *   3. Generate a masked version for display (e.g. "sk-ant-...x4f9")
 *   4. Upsert into Convex `api_keys` table
 */
async function addKey(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const {provider, api_key} = await c.req.json()

  if (!provider || !api_key) {
    return c.json({error: "provider and api_key are required"}, 400)
  }

  const validProviders = ["anthropic", "openai", "google"]
  if (!validProviders.includes(provider)) {
    return c.json({error: `Invalid provider. Must be one of: ${validProviders.join(", ")}`}, 400)
  }

  // TODO: Validate key with the provider
  // const isValid = await LLMValidationService.validateKey(provider, api_key)
  // if (!isValid) {
  //   return c.json({error: "API key validation failed — key may be invalid or expired"}, 400)
  // }

  // TODO: Encrypt the key
  // const encrypted_key = EncryptionService.encrypt(api_key)
  // const masked_key = EncryptionService.maskKey(api_key)

  // TODO: Upsert into Convex
  // await convex.mutation("apiKeys:upsert", {
  //   user_id: auth.userId,
  //   provider,
  //   encrypted_key,
  //   masked_key,
  //   is_valid: true,
  //   created_at: Date.now(),
  //   updated_at: Date.now(),
  // })

  return c.json({success: true})
}

/**
 * DELETE /:provider — remove a stored key for a specific provider.
 */
async function deleteKey(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  const provider = c.req.param("provider")

  // TODO: Delete from Convex `api_keys` table
  // await convex.mutation("apiKeys:deleteByUserProvider", {
  //   user_id: auth.userId,
  //   provider,
  // })

  return c.json({success: true})
}

export default app
