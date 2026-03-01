/**
 * dns.service.ts — Cloudflare DNS management for *.clawed.chat subdomains
 *
 * Manages A records so each user gets <subdomain>.clawed.chat → their VM IP.
 * Uses the Cloudflare API directly (not Pulumi) for cases where we need
 * quick DNS changes outside of a full stack up/destroy cycle.
 *
 * Pulumi also manages DNS in instance.pulumi.ts — this service is for:
 *   - Quick record updates (e.g., IP changed after VM restart)
 *   - Listing/checking existing records
 *   - Cleanup outside of Pulumi lifecycle
 *
 * Reference: https://developers.cloudflare.com/api/resources/dns/
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || ""
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ""
const BASE_DOMAIN = "clawed.chat"
const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DnsRecord {
  id: string
  name: string
  type: string
  content: string
  ttl: number
  proxied: boolean
}

interface CloudflareResponse<T> {
  success: boolean
  errors: Array<{code: number, message: string}>
  result: T
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  }
}

function fqdn(subdomain: string): string {
  return `${subdomain}.${BASE_DOMAIN}`
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create an A record: <subdomain>.clawed.chat → ip
 *
 * TTL 60s, DNS only (not proxied — OpenClaw uses WebSockets).
 * Returns the Cloudflare record ID for later updates/deletion.
 */
export async function createRecord(subdomain: string, ip: string): Promise<DnsRecord> {
  // TODO: uncomment when Cloudflare API token is configured
  //
  // const res = await fetch(`${CLOUDFLARE_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
  //   method: "POST",
  //   headers: headers(),
  //   body: JSON.stringify({
  //     type: "A",
  //     name: fqdn(subdomain),
  //     content: ip,
  //     ttl: 60,
  //     proxied: false,
  //   }),
  // })
  //
  // const data: CloudflareResponse<DnsRecord> = await res.json()
  //
  // if (!data.success) {
  //   const msg = data.errors.map((e) => e.message).join(", ")
  //   throw new Error(`[dns] failed to create record for ${subdomain}: ${msg}`)
  // }
  //
  // console.log(`[dns] created: ${fqdn(subdomain)} → ${ip} (id=${data.result.id})`)
  // return data.result

  console.log(`[dns] createRecord: ${fqdn(subdomain)} → ${ip} (stub)`)
  return {
    id: "stub-record-id",
    name: fqdn(subdomain),
    type: "A",
    content: ip,
    ttl: 60,
    proxied: false,
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update an existing A record's IP (e.g., after VM restart assigns a new IP).
 * Requires the Cloudflare record ID from createRecord().
 */
export async function updateRecord(recordId: string, subdomain: string, ip: string): Promise<DnsRecord> {
  // TODO: uncomment when Cloudflare API token is configured
  //
  // const res = await fetch(`${CLOUDFLARE_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`, {
  //   method: "PATCH",
  //   headers: headers(),
  //   body: JSON.stringify({
  //     content: ip,
  //   }),
  // })
  //
  // const data: CloudflareResponse<DnsRecord> = await res.json()
  //
  // if (!data.success) {
  //   const msg = data.errors.map((e) => e.message).join(", ")
  //   throw new Error(`[dns] failed to update record ${recordId}: ${msg}`)
  // }
  //
  // console.log(`[dns] updated: ${fqdn(subdomain)} → ${ip} (id=${recordId})`)
  // return data.result

  console.log(`[dns] updateRecord: ${fqdn(subdomain)} → ${ip} (stub)`)
  return {
    id: recordId,
    name: fqdn(subdomain),
    type: "A",
    content: ip,
    ttl: 60,
    proxied: false,
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete an A record. Called during instance destruction
 * when cleaning up outside of Pulumi.
 */
export async function deleteRecord(recordId: string): Promise<void> {
  // TODO: uncomment when Cloudflare API token is configured
  //
  // const res = await fetch(`${CLOUDFLARE_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${recordId}`, {
  //   method: "DELETE",
  //   headers: headers(),
  // })
  //
  // const data: CloudflareResponse<{id: string}> = await res.json()
  //
  // if (!data.success) {
  //   const msg = data.errors.map((e) => e.message).join(", ")
  //   throw new Error(`[dns] failed to delete record ${recordId}: ${msg}`)
  // }
  //
  // console.log(`[dns] deleted: id=${recordId}`)

  console.log(`[dns] deleteRecord: id=${recordId} (stub)`)
}

// ─── Lookup ──────────────────────────────────────────────────────────────────

/**
 * Find an existing A record by subdomain name.
 * Returns null if no record exists.
 */
export async function findRecord(subdomain: string): Promise<DnsRecord | null> {
  // TODO: uncomment when Cloudflare API token is configured
  //
  // const params = new URLSearchParams({
  //   type: "A",
  //   name: fqdn(subdomain),
  // })
  //
  // const res = await fetch(`${CLOUDFLARE_API}/zones/${CLOUDFLARE_ZONE_ID}/dns_records?${params}`, {
  //   headers: headers(),
  // })
  //
  // const data: CloudflareResponse<DnsRecord[]> = await res.json()
  //
  // if (!data.success) {
  //   const msg = data.errors.map((e) => e.message).join(", ")
  //   throw new Error(`[dns] failed to find record for ${subdomain}: ${msg}`)
  // }
  //
  // const record = data.result[0] ?? null
  // if (record) {
  //   console.log(`[dns] found: ${fqdn(subdomain)} → ${record.content} (id=${record.id})`)
  // } else {
  //   console.log(`[dns] not found: ${fqdn(subdomain)}`)
  // }
  // return record

  console.log(`[dns] findRecord: ${fqdn(subdomain)} (stub)`)
  return null
}
