/**
 * llm-validation.ts — per-provider API key validation
 *
 * Validates BYOK (Bring Your Own Key) API keys by making a minimal
 * request to each provider's API. Ensures the key is active and has
 * sufficient permissions before we encrypt and store it.
 *
 * Each validation should be as lightweight as possible — we're not
 * generating content, just confirming the key works.
 *
 * Reference: Design Doc 08
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Provider = "anthropic" | "openai" | "google"

export interface ValidationResult {
  valid: boolean
  error?: string
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validates an API key for a specific LLM provider.
 *
 * Makes a lightweight API call (e.g., list models) to confirm the key
 * is active and has the right permissions. Does NOT generate any content.
 */
export async function validateKey(provider: Provider, apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {valid: false, error: "API key is empty"}
  }

  try {
    switch (provider) {
      case "anthropic":
        return await validateAnthropic(apiKey)
      case "openai":
        return await validateOpenAI(apiKey)
      case "google":
        return await validateGoogle(apiKey)
      default:
        return {valid: false, error: `Unsupported provider: ${provider}`}
    }
  } catch (err: any) {
    console.error(`[llm-validation] ${provider} validation failed:`, err.message)
    return {valid: false, error: err.message}
  }
}

// ─── Provider Validators ─────────────────────────────────────────────────────

/**
 * Anthropic — send a minimal 1-token message to confirm the key works.
 * Uses the /v1/messages endpoint with max_tokens=1.
 */
async function validateAnthropic(apiKey: string): Promise<ValidationResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1,
      messages: [{role: "user", content: "hi"}],
    }),
    signal: AbortSignal.timeout(10_000),
  })

  if (res.ok) {
    return {valid: true}
  }

  const body = await res.json().catch(() => ({}))
  const errorMsg = (body as any)?.error?.message ?? `HTTP ${res.status}`

  // 401 = bad key, 403 = no access, 429 = rate limited (key is valid though)
  if (res.status === 429) {
    return {valid: true} // Rate limited means the key works
  }

  return {valid: false, error: `Anthropic: ${errorMsg}`}
}

/**
 * OpenAI — call GET /v1/models which requires a valid key but is lightweight.
 */
async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(10_000),
  })

  if (res.ok) {
    return {valid: true}
  }

  if (res.status === 429) {
    return {valid: true} // Rate limited means the key works
  }

  const body = await res.json().catch(() => ({}))
  const errorMsg = (body as any)?.error?.message ?? `HTTP ${res.status}`

  return {valid: false, error: `OpenAI: ${errorMsg}`}
}

/**
 * Google Gemini — call GET /v1beta/models which requires a valid API key.
 */
async function validateGoogle(apiKey: string): Promise<ValidationResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {signal: AbortSignal.timeout(10_000)},
  )

  if (res.ok) {
    return {valid: true}
  }

  if (res.status === 429) {
    return {valid: true} // Rate limited means the key works
  }

  const body = await res.json().catch(() => ({}))
  const errorMsg = (body as any)?.error?.message ?? `HTTP ${res.status}`

  return {valid: false, error: `Google: ${errorMsg}`}
}
