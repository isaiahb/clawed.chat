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
import {ConvexHttpClient} from "convex/browser"
import {api} from "../../../../convex/_generated/api"
import {encrypt, maskKey} from "../services/encryption"
import {validateKey} from "../services/llm-validation"
import type {Provider} from "../services/llm-validation"

const app = new Hono()

// ─── Convex Client ───────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || ""
const convex = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null

function getConvex(): ConvexHttpClient {
  if (!convex) {
    throw new Error("[keys] CONVEX_URL not configured")
  }
  return convex
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", listKeys)
app.post("/", addKey)
app.delete("/:provider", deleteKey)

// ─── Handlers ────────────────────────────────────────────────────────────────

const VALID_PROVIDERS: Provider[] = ["anthropic", "openai", "google"]

/**
 * GET / — returns all stored keys for the current user (masked only).
 *
 * Response: { keys: [{ provider, masked_key, is_valid, created_at, updated_at }] }
 * Never returns the actual key — only the masked version (e.g. "sk-ant-...x4f9")
 */
async function listKeys(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({error: "Unauthorized"}, 401)
  }

  try {
    const db = getConvex()
    const keys = await db.query(api.apiKeys.listByUser, {user_id: auth.userId})

    return c.json({
      keys: keys.map((k) => ({
        provider: k.provider,
        masked_key: k.masked_key,
        is_valid: k.is_valid,
        created_at: k.created_at,
        updated_at: k.updated_at,
      })),
    })
  } catch (err: any) {
    console.error("[keys] listKeys error:", err.message)
    return c.json({error: "Failed to fetch keys"}, 500)
  }
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

  let body: {provider?: string; api_key?: string}
  try {
    body = await c.req.json()
  } catch {
    return c.json({error: "Invalid JSON body"}, 400)
  }

  const {provider, api_key} = body

  if (!provider || !api_key) {
    return c.json({error: "provider and api_key are required"}, 400)
  }

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return c.json(
      {error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`},
      400,
    )
  }

  try {
    // 1. Validate key with the provider (lightweight API call)
    const validation = await validateKey(provider as Provider, api_key)
    if (!validation.valid) {
      return c.json(
        {
          error: "API key validation failed",
          detail: validation.error ?? "Key may be invalid or expired",
        },
        400,
      )
    }

    // 2. Encrypt the key for storage
    const encrypted_key = encrypt(api_key)

    // 3. Generate a masked version for safe display
    const masked_key = maskKey(api_key)

    // 4. Upsert into Convex
    const db = getConvex()
    await db.mutation(api.apiKeys.upsert, {
      user_id: auth.userId,
      provider,
      encrypted_key,
      masked_key,
      is_valid: true,
    })

    console.log(`[keys] stored ${provider} key for user ${auth.userId}`)

    return c.json({
      success: true,
      provider,
      masked_key,
      is_valid: true,
    })
  } catch (err: any) {
    console.error(`[keys] addKey error (${provider}):`, err.message)

    // Surface encryption config errors clearly
    if (err.message?.includes("KEY_ENCRYPTION_SECRET")) {
      return c.json({error: "Server encryption is not configured"}, 500)
    }

    return c.json({error: "Failed to store API key"}, 500)
  }
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

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return c.json(
      {error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`},
      400,
    )
  }

  try {
    const db = getConvex()
    const deleted = await db.mutation(api.apiKeys.deleteByUserProvider, {
      user_id: auth.userId,
      provider,
    })

    if (!deleted) {
      return c.json({error: `No ${provider} key found for this user`}, 404)
    }

    console.log(`[keys] deleted ${provider} key for user ${auth.userId}`)
    return c.json({success: true, provider})
  } catch (err: any) {
    console.error(`[keys] deleteKey error (${provider}):`, err.message)
    return c.json({error: "Failed to delete key"}, 500)
  }
}

export default app
