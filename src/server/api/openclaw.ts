/**
 * OpenClaw Gateway Proxy
 *
 * WebSocket proxy between the frontend and OpenClaw Gateway.
 * Handles the Gateway auth handshake server-side (so the token stays secret),
 * then transparently relays all subsequent messages.
 *
 * Implements full Ed25519 device identity authentication matching the
 * official Gateway protocol (v3 payload format).
 */

import type { ServerWebSocket } from "bun";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

// --- Device Identity ---

interface DeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

const IDENTITY_DIR = path.join(
  process.env.HOME || "/tmp",
  ".clawed-chat"
);
const IDENTITY_PATH = path.join(IDENTITY_DIR, "device-identity.json");

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64url");
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: "spki", format: "der" });
  // Ed25519 SPKI prefix is 12 bytes, raw key is 32 bytes
  const ED25519_SPKI_PREFIX_LEN = 12;
  if (spki.length === ED25519_SPKI_PREFIX_LEN + 32) {
    return spki.subarray(ED25519_SPKI_PREFIX_LEN);
  }
  return spki;
}

function fingerprintPublicKey(publicKeyPem: string): string {
  const raw = derivePublicKeyRaw(publicKeyPem);
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function publicKeyRawBase64Url(publicKeyPem: string): string {
  return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
}

function loadOrCreateDeviceIdentity(): DeviceIdentity {
  try {
    if (fs.existsSync(IDENTITY_PATH)) {
      const raw = fs.readFileSync(IDENTITY_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (
        parsed?.version === 1 &&
        typeof parsed.deviceId === "string" &&
        typeof parsed.publicKeyPem === "string" &&
        typeof parsed.privateKeyPem === "string"
      ) {
        const derivedId = fingerprintPublicKey(parsed.publicKeyPem);
        return {
          deviceId: derivedId,
          publicKeyPem: parsed.publicKeyPem,
          privateKeyPem: parsed.privateKeyPem,
        };
      }
    }
  } catch {}

  // Generate new Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey
    .export({ type: "spki", format: "pem" })
    .toString();
  const privateKeyPem = privateKey
    .export({ type: "pkcs8", format: "pem" })
    .toString();
  const deviceId = fingerprintPublicKey(publicKeyPem);

  // Persist to disk
  fs.mkdirSync(path.dirname(IDENTITY_PATH), { recursive: true, mode: 0o700 });
  const stored = {
    version: 1,
    deviceId,
    publicKeyPem,
    privateKeyPem,
    createdAtMs: Date.now(),
  };
  fs.writeFileSync(IDENTITY_PATH, JSON.stringify(stored, null, 2) + "\n", {
    mode: 0o600,
  });

  console.log(`[OpenClaw] Generated new device identity: ${deviceId.slice(0, 12)}...`);
  return { deviceId, publicKeyPem, privateKeyPem };
}

function signPayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, "utf8"), key);
  return base64UrlEncode(sig);
}

// Gateway protocol constants
const CLIENT_ID = "gateway-client";
const CLIENT_MODE = "backend";
const ROLE = "operator";
const SCOPES = ["operator.admin"];
const PROTOCOL_VERSION = 3;

// Load identity once at startup
const deviceIdentity = loadOrCreateDeviceIdentity();
console.log(`[OpenClaw] Device ID: ${deviceIdentity.deviceId.slice(0, 12)}...`);

// --- Proxy ---

interface ProxyClient {
  gateway: WebSocket | null;
  bufferedMessages: string[];
  gatewayReady: boolean;
  authenticated: boolean;
}

const clients = new Map<ServerWebSocket<unknown>, ProxyClient>();

function buildConnectRequest(nonce: string): object {
  const signedAtMs = Date.now();
  const platform = process.platform;

  // Build v3 auth payload: v3|deviceId|clientId|clientMode|role|scopes|signedAtMs|token|nonce|platform|deviceFamily
  const payloadParts = [
    "v3",
    deviceIdentity.deviceId,
    CLIENT_ID,
    CLIENT_MODE,
    ROLE,
    SCOPES.join(","),
    String(signedAtMs),
    GATEWAY_TOKEN,
    nonce,
    platform,
    "", // deviceFamily (empty)
  ];
  const payload = payloadParts.join("|");
  const signature = signPayload(deviceIdentity.privateKeyPem, payload);

  return {
    type: "req",
    id: `connect-${Date.now()}`,
    method: "connect",
    params: {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: CLIENT_ID,
        version: "1.0.0",
        platform,
        mode: CLIENT_MODE,
      },
      role: ROLE,
      scopes: SCOPES,
      caps: [],
      auth: {
        token: GATEWAY_TOKEN,
      },
      device: {
        id: deviceIdentity.deviceId,
        publicKey: publicKeyRawBase64Url(deviceIdentity.publicKeyPem),
        signature,
        signedAt: signedAtMs,
        nonce,
      },
    },
  };
}

function connectToGateway(clientWs: ServerWebSocket<unknown>) {
  const gw = new WebSocket(GATEWAY_URL);

  gw.addEventListener("open", () => {
    console.log("[OpenClaw] Gateway WebSocket open, waiting for challenge...");
  });

  gw.addEventListener("message", (event) => {
    const raw =
      typeof event.data === "string" ? event.data : event.data.toString();

    try {
      const msg = JSON.parse(raw);

      // Intercept connect.challenge — handle auth server-side
      if (msg.type === "event" && msg.event === "connect.challenge") {
        const nonce = msg.payload?.nonce || "";
        console.log("[OpenClaw] Received connect.challenge, authenticating...");

        const connectReq = buildConnectRequest(nonce);
        gw.send(JSON.stringify(connectReq));
        return;
      }

      // Intercept hello-ok response — mark as authenticated
      if (msg.type === "res" && msg.ok && msg.payload?.type === "hello-ok") {
        console.log("[OpenClaw] Authenticated with Gateway successfully");
        const client = clients.get(clientWs);
        if (client) {
          client.authenticated = true;
          client.gatewayReady = true;

          // Flush buffered messages
          for (const buffered of client.bufferedMessages) {
            gw.send(buffered);
          }
          client.bufferedMessages = [];
        }

        // Notify frontend
        clientWs.send(
          JSON.stringify({ type: "proxy.authenticated", protocol: msg.payload.protocol })
        );
        return;
      }

      // Intercept auth failure
      if (msg.type === "res" && !msg.ok) {
        const client = clients.get(clientWs);
        if (client && !client.authenticated) {
          console.error("[OpenClaw] Auth failed:", msg.error);
          clientWs.send(
            JSON.stringify({
              type: "proxy.auth_failed",
              error: msg.error || "Authentication failed",
            })
          );
          return;
        }
      }
    } catch {
      // Not JSON, just forward
    }

    // Forward everything else to the frontend client
    try {
      // Debug: log what Gateway sends us
      try {
        const parsed = JSON.parse(raw);
        const type = parsed.type;
        const event = parsed.event;
        if (type === "event") {
          console.log(`[OpenClaw] → Frontend event: ${event}`, event === "chat" ? `state=${JSON.stringify(parsed.payload?.state)} session=${parsed.payload?.sessionKey}` : "");
        } else if (type === "res") {
          console.log(`[OpenClaw] → Frontend res: id=${parsed.id} ok=${parsed.ok}`);
        }
      } catch {}
      clientWs.send(raw);
    } catch (err) {
      console.error("[OpenClaw] Error forwarding to client:", err);
    }
  });

  gw.addEventListener("close", (event) => {
    console.log(
      `[OpenClaw] Gateway disconnected: ${event.code} ${event.reason}`
    );
    try {
      clientWs.send(
        JSON.stringify({
          type: "proxy.disconnected",
          code: event.code,
          reason: event.reason,
        })
      );
    } catch {}
  });

  gw.addEventListener("error", (err) => {
    console.error("[OpenClaw] Gateway error:", err);
  });

  const client = clients.get(clientWs);
  if (client) {
    client.gateway = gw;
  }
}

export const openclawWebSocket = {
  open(ws: ServerWebSocket<unknown>) {
    clients.set(ws, {
      gateway: null,
      bufferedMessages: [],
      gatewayReady: false,
      authenticated: false,
    });
    console.log("[OpenClaw] Client connected, opening Gateway connection");
    connectToGateway(ws);
  },

  message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
    const client = clients.get(ws);
    if (!client) return;

    const data = typeof message === "string" ? message : message.toString();

    // Debug: log what frontend sends
    try {
      const parsed = JSON.parse(data);
      console.log(`[OpenClaw] ← Frontend req: method=${parsed.method} id=${parsed.id}`);
    } catch {}

    // Buffer until authenticated
    if (!client.authenticated || !client.gateway) {
      client.bufferedMessages.push(data);
      return;
    }

    if (client.gateway.readyState === WebSocket.OPEN) {
      client.gateway.send(data);
    } else {
      client.bufferedMessages.push(data);
    }
  },

  close(ws: ServerWebSocket<unknown>, code: number, _reason: string) {
    console.log(`[OpenClaw] Client disconnected: ${code}`);
    const client = clients.get(ws);
    if (client?.gateway) {
      client.gateway.close();
    }
    clients.delete(ws);
  },
};

export async function checkGatewayHealth(): Promise<{
  connected: boolean;
  url: string;
}> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(GATEWAY_URL);
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ connected: false, url: GATEWAY_URL });
      }, 3000);

      ws.addEventListener("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ connected: true, url: GATEWAY_URL });
      });

      ws.addEventListener("error", () => {
        clearTimeout(timeout);
        resolve({ connected: false, url: GATEWAY_URL });
      });
    } catch {
      resolve({ connected: false, url: GATEWAY_URL });
    }
  });
}
