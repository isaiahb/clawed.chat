/**
 * encryption.ts — AES-256-GCM encrypt/decrypt for sensitive data
 *
 * Used to encrypt user-provided LLM API keys before storing them
 * in Convex. Keys are never stored in plaintext.
 *
 * Format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * Reference: Design Doc 08
 */

import {randomBytes, createCipheriv, createDecipheriv} from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12 // 96-bit IV for GCM
const SECRET_KEY = process.env.KEY_ENCRYPTION_SECRET

// ─── Encrypt ─────────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * @param text - The plaintext to encrypt
 * @returns A formatted string: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(text: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")

  const authTag = cipher.getAuthTag().toString("base64")

  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

// ─── Decrypt ─────────────────────────────────────────────────────────────────

/**
 * Decrypts a string previously encrypted by this service.
 *
 * @param encryptedText - The formatted encrypted string (iv:authTag:ciphertext)
 * @returns The original plaintext
 */
export function decrypt(encryptedText: string): string {
  const key = getKey()
  const parts = encryptedText.split(":")

  if (parts.length !== 3) {
    throw new Error("[encryption] invalid format — expected iv:authTag:ciphertext")
  }

  const ivB64 = parts[0]!
  const authTagB64 = parts[1]!
  const ciphertextB64 = parts[2]!

  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")
  const decipher = createDecipheriv(ALGORITHM, key, iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertextB64, "base64", "utf8")
  decrypted += (decipher.final as (outputEncoding: string) => string)("utf8")

  return decrypted
}

// ─── Mask ────────────────────────────────────────────────────────────────────

/**
 * Creates a masked version of an API key for safe display.
 *
 * Examples:
 *   "sk-ant-api03-abc...xyz9" → "sk-ant-...xyz9"
 *   "sk-proj-abcdefgh"       → "sk-p...efgh"
 *   "short"                   → "***"
 */
export function maskKey(key: string): string {
  if (!key || key.length < 12) return "***"

  // Show a recognizable prefix + last 4 chars
  const prefixLen = key.startsWith("sk-ant-") ? 7
    : key.startsWith("sk-proj-") ? 8
    : key.startsWith("sk-") ? 3
    : Math.min(4, Math.floor(key.length / 4))

  const prefix = key.substring(0, prefixLen)
  const suffix = key.substring(key.length - 4)

  return `${prefix}...${suffix}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  if (!SECRET_KEY || SECRET_KEY.length !== 64) {
    throw new Error(
      "[encryption] KEY_ENCRYPTION_SECRET is missing or invalid. " +
      "Must be 32 bytes (64 hex chars). Generate with: openssl rand -hex 32",
    )
  }
  return Buffer.from(SECRET_KEY, "hex")
}
