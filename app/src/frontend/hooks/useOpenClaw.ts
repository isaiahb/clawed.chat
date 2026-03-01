/**
 * useOpenClaw — React hook for communicating with the OpenClaw Gateway
 * through the server-side WebSocket proxy at /api/openclaw-ws.
 *
 * Implements the Gateway RPC protocol:
 *   - Auth via connect.challenge / connect.auth
 *   - RPC requests with unique IDs (method + params → response)
 *   - Server-sent events (chat deltas, finals, errors)
 *
 * Chat event format from Gateway:
 *   { type: "event", event: "chat", payload: {
 *       runId, sessionKey, seq, state: "delta"|"final"|"error"|"aborted",
 *       message?: { role: "assistant", content: [{ type: "text", text }], timestamp },
 *       errorMessage?: string
 *   }}
 */

import { useState, useEffect, useRef, useCallback } from "react";

// --- Types ---

interface GatewayRequest {
  type: "req";
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface GatewayResponse {
  type: "res";
  id: string;
  ok: boolean;
  error?: string | { message?: string; code?: string };
  payload?: unknown;
}

interface GatewayEvent {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
}

type GatewayMessage = GatewayResponse | GatewayEvent | { type: string; [key: string]: unknown };

export interface ChatDelta {
  text?: string;
  state: "delta" | "final" | "error" | "aborted";
  runId?: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface UseOpenClawReturn {
  sendMessage: (text: string) => void;
  abort: () => void;
  status: ConnectionStatus;
  onDelta: (handler: (delta: ChatDelta) => void) => () => void;
  onEvent: (handler: (event: GatewayEvent) => void) => () => void;
  sessionKey: string | null;
}

let reqCounter = 0;
function nextId(): string {
  return `req-${Date.now()}-${++reqCounter}`;
}

/**
 * Extract text from a Gateway chat message object.
 * Gateway format: { role: "assistant", content: [{ type: "text", text: "..." }], timestamp }
 */
function extractTextFromMessage(message: unknown): string | undefined {
  if (!message || typeof message !== "object") return undefined;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && (block as Record<string, unknown>).type === "text") {
        const text = (block as Record<string, unknown>).text;
        if (typeof text === "string" && text) return text;
      }
    }
  }
  // Fallback: content might be a plain string
  if (typeof content === "string" && content) return content;
  return undefined;
}

export function useOpenClaw(): UseOpenClawReturn {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const deltaHandlersRef = useRef<Set<(delta: ChatDelta) => void>>(new Set());
  const eventHandlersRef = useRef<Set<(event: GatewayEvent) => void>>(new Set());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionKeyRef = useRef<string | null>(null);

  /** Send an RPC request and wait for response */
  const request = useCallback(
    (method: string, params?: Record<string, unknown>): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Not connected"));
          return;
        }

        const id = nextId();
        const timeout = setTimeout(() => {
          pendingRef.current.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }, 30000);

        pendingRef.current.set(id, { resolve, reject, timer: timeout });

        const msg: GatewayRequest = { type: "req", id, method, params };
        ws.send(JSON.stringify(msg));
      });
    },
    []
  );

  /** Dispatch a ChatDelta to all subscribed handlers */
  const emitDelta = useCallback((delta: ChatDelta) => {
    for (const handler of deltaHandlersRef.current) {
      handler(delta);
    }
  }, []);

  /** Handle incoming WebSocket messages */
  const handleMessage = useCallback((raw: string) => {
    let msg: GatewayMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn("[OpenClaw] Non-JSON message:", raw);
      return;
    }

    // Proxy-level messages (not from Gateway)
    if (msg.type === "proxy.authenticated") {
      console.log("[OpenClaw] Gateway authenticated via proxy");
      setStatus("connected");
      return;
    }
    if (msg.type === "proxy.auth_failed") {
      console.error("[OpenClaw] Gateway auth failed:", (msg as Record<string, unknown>).error);
      setStatus("disconnected");
      return;
    }
    if (msg.type === "proxy.disconnected") {
      console.warn("[OpenClaw] Gateway disconnected via proxy");
      setStatus("disconnected");
      return;
    }

    // RPC response
    if (msg.type === "res") {
      const res = msg as GatewayResponse;
      const pending = pendingRef.current.get(res.id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current.delete(res.id);
        if (res.ok) {
          pending.resolve(res.payload);
        } else {
          const errMsg = typeof res.error === "string"
            ? res.error
            : res.error?.message || "Request failed";
          pending.reject(new Error(errMsg));
        }
      }
      return;
    }

    // Server-sent event
    if (msg.type === "event") {
      const evt = msg as GatewayEvent;

      // Auth challenge — handled by server proxy, ignore on frontend
      if (evt.event === "connect.challenge") return;

      // Chat events: { payload: { state, sessionKey, runId, message, errorMessage } }
      if (evt.event === "chat") {
        const payload = evt.payload || {};
        const state = payload.state as string;
        const runId = payload.runId as string | undefined;

        if (state === "delta" || state === "final") {
          const text = extractTextFromMessage(payload.message);
          emitDelta({ state: state as ChatDelta["state"], text, runId });
        } else if (state === "error") {
          const text = (payload.errorMessage as string) || "Something went wrong";
          emitDelta({ state: "error", text, runId });
        } else if (state === "aborted") {
          const text = extractTextFromMessage(payload.message);
          emitDelta({ state: "aborted", text, runId });
        }
      }

      // Broadcast all events to generic event handlers
      for (const handler of eventHandlersRef.current) {
        handler(evt);
      }
      return;
    }
  }, [emitDelta]);

  /** Connect to the proxy WebSocket */
  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/openclaw-ws`;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[OpenClaw] WebSocket connected to proxy, awaiting auth...");
      setStatus("connecting");
    };

    ws.onmessage = (event) => {
      handleMessage(event.data);
    };

    ws.onclose = () => {
      console.log("[OpenClaw] WebSocket disconnected");
      setStatus("disconnected");
      wsRef.current = null;

      // Reject all pending requests
      for (const [, pending] of pendingRef.current) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Connection closed"));
      }
      pendingRef.current.clear();

      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("[OpenClaw] WebSocket error:", err);
    };
  }, [handleMessage]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Set session key once connected (sessions are created implicitly by chat.send)
  useEffect(() => {
    if (status !== "connected") return;
    const key = `clawed-${Date.now()}`;
    sessionKeyRef.current = key;
    setSessionKey(key);
    console.log("[OpenClaw] Session key:", key);
  }, [status]);

  const sendMessage = useCallback(
    (text: string) => {
      const key = sessionKeyRef.current;
      if (!key) {
        console.error("[OpenClaw] No session key");
        return;
      }

      request("chat.send", {
        sessionKey: key,
        message: text,
        deliver: false,
        idempotencyKey: nextId(),
      }).catch((err) => {
        console.error("[OpenClaw] Send failed:", err);
        emitDelta({ state: "error", text: `Failed to send: ${err.message}` });
      });
    },
    [request, emitDelta]
  );

  const abort = useCallback(() => {
    const key = sessionKeyRef.current;
    if (!key) return;
    request("chat.abort", { sessionKey: key }).catch(() => {});
  }, [request]);

  const onDelta = useCallback(
    (handler: (delta: ChatDelta) => void) => {
      deltaHandlersRef.current.add(handler);
      return () => {
        deltaHandlersRef.current.delete(handler);
      };
    },
    []
  );

  const onEvent = useCallback(
    (handler: (event: GatewayEvent) => void) => {
      eventHandlersRef.current.add(handler);
      return () => {
        eventHandlersRef.current.delete(handler);
      };
    },
    []
  );

  return { sendMessage, abort, status, onDelta, onEvent, sessionKey };
}
