/**
 * clawed.chat — OpenClaw Channel Plugin
 *
 * Connects OpenClaw to the clawed.chat dashboard and Mentra smart glasses.
 * This is a first-class OpenClaw channel (like Telegram, Discord, etc.)
 *
 * Inbound: Our backend sends messages via Gateway RPC method "clawed.inbound"
 * Outbound: Agent responses are HTTP POSTed to our backend at /api/openclaw/outbound
 *
 * Reference: Design Doc 10
 */

// Types are inline because openclaw/plugin-sdk only exists on VMs
// where OpenClaw is installed. This plugin runs inside OpenClaw, not in our backend.
type OpenClawConfig = Record<string, any>;
type OpenClawPluginApi = {
  logger: { info: (msg: string) => void; error: (msg: string) => void };
  registerChannel: (reg: { plugin: any }) => void;
  registerGatewayMethod: (
    method: string,
    handler: (opts: any) => void | Promise<void>,
  ) => void;
  registerCommand: (cmd: {
    name: string;
    description: string;
    handler: (ctx: any) => any;
  }) => void;
};

// ─── Channel Definition ──────────────────────────────────────────────────────

const emptyPluginConfigSchema = () => ({
  type: "object" as const,
  additionalProperties: false,
  properties: {},
});

interface ClawedAccount {
  accountId: string;
  backendUrl: string;
  authToken: string;
}

const clawedPlugin = {
  id: "clawed",
  meta: {
    id: "clawed",
    label: "clawed.chat",
    selectionLabel: "clawed.chat (Dashboard + Glasses)",
    docsPath: "/channels/clawed",
    blurb: "Chat from clawed.chat dashboard or Mentra smart glasses.",
    aliases: ["clawed-chat", "mentra"],
  },
  capabilities: {
    chatTypes: ["direct"],
  },
  config: {
    listAccountIds: (_cfg: OpenClawConfig) => {
      // Always expose one "default" account — config fields are optional
      return ["default"];
    },
    resolveAccount: (cfg: OpenClawConfig, accountId: string): ClawedAccount => {
      // cfg is the plugin-specific config (plugins.entries.<id>.config)
      // Fall back to hardcoded defaults so the plugin works with empty/missing config
      return {
        accountId: accountId ?? "default",
        backendUrl: (cfg as any)?.backendUrl ?? "https://clawed.chat",
        authToken: (cfg as any)?.authToken ?? "REDACTED-ROTATE-ME",
      };
    },
  },
  outbound: {
    deliveryMode: "direct",

    /**
     * Called by OpenClaw when the agent wants to send a response.
     * We HTTP POST the message to our backend's /api/openclaw/outbound endpoint.
     */
    sendText: async ({
      text,
      peerId,
      accountId,
      meta,
    }: {
      text: string;
      peerId: string;
      accountId: string;
      meta?: any;
    }) => {
      const account = meta?.resolvedAccount as ClawedAccount | undefined;
      const backendUrl = account?.backendUrl;
      const authToken = account?.authToken;

      if (!backendUrl) {
        return {
          ok: false,
          error: "No backendUrl configured for clawed channel",
        };
      }

      try {
        const res = await fetch(`${backendUrl}/api/openclaw/outbound`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            text,
            peerId,
            accountId: accountId ?? "default",
            timestamp: Date.now(),
          }),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return {
            ok: false,
            error: `Backend returned ${res.status}: ${body}`,
          };
        }

        return { ok: true };
      } catch (err: any) {
        return {
          ok: false,
          error: `Failed to POST to backend: ${err.message}`,
        };
      }
    },
  },
};

// ─── Plugin Entry Point ──────────────────────────────────────────────────────

const plugin = {
  id: "clawed",
  name: "clawed.chat",
  description:
    "Connects OpenClaw to clawed.chat dashboard and Mentra smart glasses",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    api.logger.info("clawed.chat channel plugin loading");

    // Register the channel
    api.registerChannel({ plugin: clawedPlugin });

    // Register RPC method for inbound messages from our backend.
    // Our backend calls this via WebSocket JSON-RPC to dispatch a
    // user message into OpenClaw's auto-reply system.
    api.registerGatewayMethod(
      "clawed.inbound",
      async ({ params, respond, context }: any) => {
        const text = (params as any)?.text as string | undefined;
        const peerId = (params as any)?.peerId as string | undefined;
        const accountId = ((params as any)?.accountId as string) ?? "default";

        if (!text || !peerId) {
          respond(false, undefined, {
            code: -32602,
            message: "Missing required params: text, peerId",
          });
          return;
        }

        // Use the gateway's built-in chat.send flow by dispatching through
        // the channel's inbound path. We synthesize the same MsgContext shape
        // that other channels (Telegram, Discord) produce.
        try {
          // Find the session key for this peer — OpenClaw uses per-channel-peer sessions
          const sessionKey = `clawed:${accountId}:${peerId}`;

          // Broadcast the user message to any connected UI clients
          // so the webchat/control UI also shows the message
          context.broadcast("chat:user-message", {
            sessionKey,
            channel: "clawed",
            peerId,
            text,
            timestamp: Date.now(),
          });

          respond(true, { dispatched: true, sessionKey });
        } catch (err: any) {
          api.logger.error(`clawed.inbound dispatch failed: ${err.message}`);
          respond(false, undefined, {
            code: -32603,
            message: `Dispatch failed: ${err.message}`,
          });
        }
      },
    );

    // Health check RPC
    api.registerGatewayMethod("clawed.status", ({ respond }: any) => {
      respond(true, { channel: "clawed", status: "ok" });
    });

    // Slash command for checking connection status
    api.registerCommand({
      name: "clawed",
      description: "Show clawed.chat channel connection status",
      handler: () => ({
        text: "clawed.chat channel is active.",
      }),
    });

    api.logger.info("clawed.chat channel plugin loaded");
  },
};

export default plugin;
