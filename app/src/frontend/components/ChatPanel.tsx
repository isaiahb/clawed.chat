/**
 * ChatPanel — real-time chat with an OpenClaw agent
 *
 * Subscribes to Convex `chat_messages` for live updates.
 * Sends messages via POST /api/chat/:instanceId.
 * Shows message history with user/agent role styling.
 *
 * Props:
 *   - instanceId: which instance to chat with
 *   - onClose: callback to close the panel
 */

import {useState, useEffect, useRef, useCallback} from "react"
import {useQuery} from "convex/react"
import {api} from "../../../../convex/_generated/api"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  instanceId: string
  onClose: () => void
}

interface Message {
  _id: string
  role: "user" | "agent"
  source: "web" | "glasses" | "desktop"
  content: string
  timestamp: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPanel({instanceId, onClose}: ChatPanelProps) {
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Real-time message subscription via Convex
  const messages = useQuery(api.chatMessages.listByInstance, {
    instance_id: instanceId,
    limit: 100,
  }) as Message[] | undefined

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
  }, [messages?.length])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput("")
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/chat/${instanceId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: text, source: "web"}),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to send (${res.status})`)
      }
    } catch (err: any) {
      setError(err.message)
      // Put the message back in the input so the user doesn't lose it
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, instanceId])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    if (e.key === "Escape") {
      onClose()
    }
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
  }

  const isLoading = messages === undefined

  return (
    <div className="flex flex-col h-full border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-925">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <h3 className="text-sm font-medium">Chat</h3>
          {sending && (
            <span className="text-[10px] text-neutral-500 animate-pulse">sending...</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-neutral-500 hover:text-neutral-300 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border border-neutral-700 border-t-neutral-400" />
              <span className="text-xs text-neutral-600">Loading messages...</span>
            </div>
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-neutral-600 text-sm mb-1">No messages yet</p>
              <p className="text-neutral-700 text-xs">Send a message to start chatting with your agent.</p>
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <div
            key={msg._id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-neutral-100 text-neutral-900 rounded-br-md"
                  : "bg-neutral-800 text-neutral-100 rounded-bl-md"
              }`}
            >
              {/* Source badge for non-web messages */}
              {msg.source !== "web" && (
                <span className={`text-[9px] uppercase tracking-wider mb-1 block ${
                  msg.role === "user" ? "text-neutral-500" : "text-neutral-500"
                }`}>
                  {msg.source === "glasses" ? "👓 glasses" : `💻 ${msg.source}`}
                </span>
              )}

              {/* Message content */}
              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                {msg.content}
              </p>

              {/* Timestamp */}
              <span className={`text-[10px] mt-1 block ${
                msg.role === "user" ? "text-neutral-400" : "text-neutral-600"
              }`}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-800 px-4 py-3 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your agent..."
            disabled={sending}
            className={`flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-colors ${
              sending ? "opacity-50" : ""
            }`}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0 ${
              !input.trim() || sending
                ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                : "bg-neutral-100 text-neutral-900 hover:bg-white active:scale-95"
            }`}
          >
            {sending ? "⏳" : "↑"}
          </button>
        </div>
        <p className="text-[10px] text-neutral-700 mt-1.5">
          Enter to send · Esc to close · Responses arrive in real-time
        </p>
      </div>
    </div>
  )
}
