import { useState, useEffect, useCallback, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "../../components/ui";
import { useTheme } from "../../App";
import { ChatSidebar, type Conversation } from "./components/ChatSidebar";
import { ChatMessage, type Message } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { useOpenClaw } from "../../lib/useOpenClaw";
import type { Photo } from "./components/PhotoStream";

interface HomePageProps {
  userId: string;
}

export default function HomePage({ userId }: HomePageProps) {
  const { isDarkMode, toggleTheme } = useTheme();
  const { sendMessage, abort, status, onDelta } = useOpenClaw();
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvRef = useRef<string | null>(null);

  // Keep ref in sync with state so callbacks see latest value
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConversationId, streamingContent]);

  // Listen for OpenClaw chat deltas (streaming tokens, final, error, aborted)
  useEffect(() => {
    const streamRef = { content: "" };
    const finalizedRuns = new Set<string>();

    /** Notify server that Claude is done so wake word detection re-enables */
    const unlockWakeWord = () => {
      fetch(`/api/wake-word-unlock?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
      }).catch(() => {});
    };

    const unsubscribe = onDelta((delta) => {
      const convId = activeConvRef.current;
      if (!convId) return;

      // Deduplicate: skip events for runs we've already finalized
      if (delta.runId && finalizedRuns.has(delta.runId) && delta.state !== "delta") {
        return;
      }

      if (delta.state === "delta") {
        // Gateway sends full accumulated text in each delta (not incremental)
        if (delta.text) {
          streamRef.content = delta.text;
          setStreamingContent(delta.text);
        }
        return;
      }

      if (delta.state === "final") {
        // Mark this run as finalized to prevent duplicates
        if (delta.runId) finalizedRuns.add(delta.runId);
        // Use the final event's text if provided, otherwise use last delta
        const finalContent = delta.text || streamRef.content;
        streamRef.content = "";
        setStreamingContent("");
        setIsLoading(false);
        unlockWakeWord();

        if (finalContent) {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: finalContent,
            timestamp: new Date().toLocaleTimeString(),
          };

          setMessages((prev) => ({
            ...prev,
            [convId]: [...(prev[convId] || []), assistantMsg],
          }));

          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessage: finalContent.slice(0, 60),
                    timestamp: new Date().toLocaleTimeString(),
                  }
                : c
            )
          );
        }
        return;
      }

      if (delta.state === "error") {
        if (delta.runId) finalizedRuns.add(delta.runId);
        streamRef.content = "";
        setStreamingContent("");
        setIsLoading(false);
        unlockWakeWord();

        const errorMsg: Message = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: delta.text || "Something went wrong. Please try again.",
          timestamp: new Date().toLocaleTimeString(),
        };

        setMessages((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), errorMsg],
        }));
        return;
      }

      if (delta.state === "aborted") {
        if (delta.runId) finalizedRuns.add(delta.runId);
        // Commit whatever was streamed so far
        const partial = streamRef.content;
        streamRef.content = "";
        setStreamingContent("");
        setIsLoading(false);
        unlockWakeWord();

        if (partial) {
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: partial + "\n\n_(aborted)_",
            timestamp: new Date().toLocaleTimeString(),
          };

          setMessages((prev) => ({
            ...prev,
            [convId]: [...(prev[convId] || []), assistantMsg],
          }));
        }
      }
    });

    return unsubscribe;
  }, [onDelta]);

  // Connect to SSE photo stream
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/photo-stream?userId=${encodeURIComponent(userId)}`
        );

        eventSource.onopen = () => console.log("[PhotoStream] Connected");

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;

            setPhotos((prev) => {
              if (prev.some((p) => p.requestId === data.requestId)) return prev;
              return [
                {
                  id: data.requestId,
                  requestId: data.requestId,
                  url: data.dataUrl,
                  timestamp: new Date(data.timestamp).toLocaleTimeString(),
                },
                ...prev,
              ].slice(0, 20);
            });
          } catch {}
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {}
    };

    connect();
    return () => eventSource?.close();
  }, [userId]);

  const activeMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const createConversation = useCallback((firstMessage?: string) => {
    const id = `conv-${Date.now()}`;
    const title = firstMessage
      ? firstMessage.slice(0, 40) + (firstMessage.length > 40 ? "..." : "")
      : "New chat";
    const conv: Conversation = {
      id,
      title,
      lastMessage: firstMessage || "",
      timestamp: new Date().toLocaleTimeString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(id);
    // Sync ref immediately so delta handlers see the new conversation
    // before the next render cycle (useEffect on activeConversationId is async)
    activeConvRef.current = id;
    setMessages((prev) => ({ ...prev, [id]: [] }));
    return id;
  }, []);

  const handleNewChat = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setMessages((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId]
  );

  const handleSend = useCallback(
    (text: string) => {
      let convId = activeConversationId;
      if (!convId) {
        convId = createConversation(text);
      }

      // Add user message
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toLocaleTimeString(),
      };

      // Attach latest photo if available
      const latestPhoto = photos[0];
      if (latestPhoto) {
        userMsg.photo = {
          url: latestPhoto.url,
          requestId: latestPhoto.requestId,
        };
      }

      setMessages((prev) => ({
        ...prev,
        [convId!]: [...(prev[convId!] || []), userMsg],
      }));

      // Update conversation title & last message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                title:
                  c.title === "New chat"
                    ? text.slice(0, 40) + (text.length > 40 ? "..." : "")
                    : c.title,
                lastMessage: text.slice(0, 60),
                timestamp: new Date().toLocaleTimeString(),
              }
            : c
        )
      );

      // Send to OpenClaw
      setIsLoading(true);
      setStreamingContent("");
      sendMessage(text);
    },
    [activeConversationId, createConversation, photos, sendMessage]
  );

  // Keep a ref to handleSend so the SSE effect doesn't reconnect on every render
  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  // Connect to SSE transcription stream — log transcriptions + handle voice queries
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource(
          `/api/transcription-stream?userId=${encodeURIComponent(userId)}`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connected") return;

            // Voice query from wake word detection — auto-submit to OpenClaw
            if (data.type === "voice-query") {
              console.log(
                `[VoiceQuery] Received: "${data.query}" (status=${statusRef.current})`
              );
              if (statusRef.current !== "connected") {
                console.warn(`[VoiceQuery] Dropping — OpenClaw not connected (status=${statusRef.current})`);
                return;
              }
              handleSendRef.current(data.query);
              return;
            }

            const prefix = data.isFinal
              ? "[Transcription FINAL]"
              : "[Transcription]";
            console.log(
              `${prefix} ${data.text} (${new Date(data.timestamp).toLocaleTimeString()})`
            );
          } catch {}
        };

        eventSource.onerror = () => {
          eventSource?.close();
          setTimeout(connect, 3000);
        };
      } catch {}
    };

    connect();
    return () => eventSource?.close();
  }, [userId]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="md:ml-0 ml-10 flex items-center gap-2">
            <h1 className="text-sm font-semibold">Clawed</h1>
            <div
              className={`w-2 h-2 rounded-full ${
                status === "connected"
                  ? "bg-green-500"
                  : status === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
              title={`OpenClaw: ${status}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
            <Moon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {activeConversationId && activeMessages.length > 0 ? (
            <div className="max-w-3xl mx-auto">
              {activeMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {/* Streaming response in progress */}
              {streamingContent && (
                <ChatMessage
                  message={{
                    id: "streaming",
                    role: "assistant",
                    content: streamingContent,
                    timestamp: new Date().toLocaleTimeString(),
                  }}
                />
              )}
              {/* Loading indicator when waiting for first token */}
              {isLoading && !streamingContent && (
                <div className="flex gap-3 px-4 py-4 bg-muted/30">
                  <div className="w-7 h-7 rounded-lg bg-chart-4 flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground">
                      Clawed is thinking...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <span className="text-2xl text-primary-foreground font-bold">
                  C
                </span>
              </div>
              <h2 className="text-lg font-semibold mb-1">Clawed</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your AI assistant powered by OpenClaw. Send a message to get
                started.
              </p>
              {status !== "connected" && (
                <p className="text-xs text-yellow-500 mt-2">
                  {status === "connecting"
                    ? "Connecting to OpenClaw..."
                    : "OpenClaw disconnected. Reconnecting..."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading || status !== "connected"}
          placeholder={
            status !== "connected"
              ? "Connecting to OpenClaw..."
              : "Message Clawed..."
          }
        />
      </div>
    </div>
  );
}
