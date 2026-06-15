/**
 * ChatPage — full-page chat with a specific OpenClaw agent
 *
 * Route: /app/chat/:instanceId
 *
 * Shows the ChatPanel as a full-page experience with a header
 * that links back to the agents list. Also includes a toggle
 * to open the BrowserView (watch agent) side panel.
 */

import {useState, useEffect, useRef, useCallback} from "react"
import {useParams, useNavigate, Link} from "react-router-dom"
import {useQuery} from "convex/react"
import {useUser} from "@clerk/clerk-react"
import {api} from "../../../../../convex/_generated/api"
import {useDocumentTitle} from "../../hooks/useDocumentTitle"
import {useOpenClaw} from "../../hooks/useOpenClaw"
import type {ChatDelta} from "../../hooks/useOpenClaw"
import {Button} from "../../components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../components/ui/tooltip"
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Send,
  AlertTriangle,
  Trash2,
} from "lucide-react"
import {cn} from "../../lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  _id: string
  role: "user" | "agent"
  source: "web" | "glasses" | "desktop"
  content: string
  timestamp: number
}

interface Instance {
  _id: string
  status: string
  subdomain: string
  llm_provider: string
  browser_use_live_url?: string
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  running: "bg-emerald-500",
  provisioning: "bg-amber-500 animate-pulse",
  starting: "bg-blue-400 animate-pulse",
  stopped: "bg-muted-foreground",
  stopping: "bg-orange-400 animate-pulse",
  error: "bg-red-500",
  destroying: "bg-red-400 animate-pulse",
  destroyed: "bg-muted-foreground/50",
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const {instanceId} = useParams<{instanceId: string}>()
  const navigate = useNavigate()
  const {user} = useUser()
  useDocumentTitle("Chat")

  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [waitingForAgent, setWaitingForAgent] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const [clearing, setClearing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageCountRef = useRef(0)
  const streamRef = useRef("")

  // OpenClaw WebSocket connection via proxy
  const {sendMessage: openclawSend, status: openclawStatus, onDelta} = useOpenClaw()

  // Real-time message subscription via Convex
  const messages = useQuery(
    api.chatMessages.listByInstance,
    instanceId ? {instance_id: instanceId, limit: 100} : "skip",
  ) as Message[] | undefined

  // Instance details (for status, subdomain, browser URL)
  const instances = useQuery(
    api.instances.listByUser,
    user?.id ? {user_id: user.id} : "skip",
  ) as Instance[] | undefined

  const instance = instances?.find((i) => i._id === instanceId)
  const isRunning = instance?.status === "running"
  const hasBrowserUrl = !!instance?.browser_use_live_url

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: "smooth"})
  }, [messages?.length, waitingForAgent, streamingContent])

  // Clear streaming content ONLY when Convex confirms the new agent message arrived.
  // This prevents the flash where streaming disappears but Convex hasn't pushed yet.
  useEffect(() => {
    if (!messages) return
    const agentMessages = messages.filter((m) => m.role === "agent")
    if (agentMessages.length > lastMessageCountRef.current) {
      // Convex has the new message — safe to clear streaming now
      setWaitingForAgent(false)
      setStreamingContent("")
      streamRef.current = ""
      setSending(false)
    }
    lastMessageCountRef.current = agentMessages.length
  }, [messages])

  // Subscribe to OpenClaw streaming deltas
  useEffect(() => {
    const unsubscribe = onDelta((delta: ChatDelta) => {
      if (delta.state === "delta") {
        // Gateway sends full accumulated text in each delta
        if (delta.text) {
          streamRef.current = delta.text
          setStreamingContent(delta.text)
        }
        return
      }

      if (delta.state === "final") {
        const finalContent = delta.text || streamRef.current
        // DON'T clear streamingContent here — keep it visible until
        // the Convex subscription confirms the message arrived (see useEffect above).
        // This prevents the flash of empty between streaming end and Convex push.
        if (finalContent) {
          streamRef.current = finalContent
          setStreamingContent(finalContent)
        }

        // Persist the final response via the Clerk-authed chat API
        // (session cookie auth — no tokens in the client bundle)
        if (finalContent && instanceId && user?.id) {
          fetch(`/api/chat/${instanceId}/agent-final`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({content: finalContent, source: "web"}),
          }).catch(() => {})
        }
        return
      }

      if (delta.state === "error") {
        streamRef.current = ""
        setStreamingContent("")
        setWaitingForAgent(false)
        setSending(false)
        setError(delta.text || "Agent encountered an error")
        return
      }

      if (delta.state === "aborted") {
        // Keep partial content visible if any
        const partial = streamRef.current
        if (partial) {
          setStreamingContent(partial)
        } else {
          setStreamingContent("")
          streamRef.current = ""
        }
        setWaitingForAgent(false)
        setSending(false)
        return
      }
    })

    return unsubscribe
  }, [onDelta, instanceId, user?.id])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px"
    }
  }, [input])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || !instanceId) return

    setInput("")
    setSending(true)
    setWaitingForAgent(true)
    setStreamingContent("")
    streamRef.current = ""
    setError(null)

    // Write user message to Convex immediately (shows in chat instantly)
    try {
      await fetch(`/api/chat/${instanceId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({message: text, source: "web"}),
      })
    } catch {
      // Non-fatal — message might still go through via WebSocket
    }

    // Send via WebSocket proxy for real-time streaming response
    if (openclawStatus === "connected") {
      try {
        openclawSend(text)
      } catch (err: any) {
        setError(err.message)
        setInput(text)
        setWaitingForAgent(false)
        setSending(false)
      }
    } else {
      // Fallback: the HTTP POST to /api/chat already dispatches to gateway
      // We just won't get streaming — response comes via Convex subscription
    }

    inputRef.current?.focus()
  }, [input, sending, instanceId, openclawSend, openclawStatus])

  const clearChat = useCallback(async () => {
    if (!instanceId || clearing) return

    setClearing(true)
    setError(null)
    setWaitingForAgent(false)
    setStreamingContent("")
    streamRef.current = ""

    try {
      const res = await fetch(`/api/chat/${instanceId}`, {method: "DELETE"})
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to clear chat")
      }
    } catch (err: any) {
      setError(err.message || "Failed to clear chat")
    } finally {
      setClearing(false)
      inputRef.current?.focus()
    }
  }, [instanceId, clearing])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
  }

  // ─── Guard: no instanceId ──────────────────────────────────────────────

  if (!instanceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No agent selected</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/app/agents")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to agents
          </Button>
        </div>
      </div>
    )
  }

  const isLoadingMessages = messages === undefined
  const statusDot = STATUS_DOT[instance?.status ?? ""] ?? "bg-muted-foreground"
  const canClearChat = !!((messages?.length ?? 0) > 0 || streamingContent || waitingForAgent || error)

  return (
    <div className="flex h-full">
      {/* ── Chat Column ── */}
      <div className={cn(
        "flex flex-col h-full transition-all duration-300",
        showBrowser && hasBrowserUrl ? "w-1/2" : "w-full",
      )}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/app/agents"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>All agents</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot)} />
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {instance?.subdomain || instanceId}
              </span>
              {instance?.llm_provider && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded border border-border/50 bg-muted/30">
                  {instance.llm_provider}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={clearChat}
                    disabled={clearing || !canClearChat}
                  >
                    {clearing
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear chat</TooltipContent>
              </Tooltip>
            )}

            {/* Watch Agent toggle */}
            {hasBrowserUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowBrowser(!showBrowser)}
                  >
                    {showBrowser
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showBrowser ? "Hide browser" : "Watch agent"}</TooltipContent>
              </Tooltip>
            )}

            {/* Open instance externally */}
            {isRunning && instance?.subdomain && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://${instance.subdomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>Open agent URL</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scroll-smooth">
          {/* Not running warning */}
          {instance && !isRunning && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs mb-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Agent is {instance.status}. Messages won't be delivered until it's running.
            </div>
          )}

          {/* WebSocket connection status */}
          {openclawStatus === "disconnected" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Agent connection lost. Reconnecting…
            </div>
          )}

          {isLoadingMessages && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading messages…</span>
              </div>
            </div>
          )}

          {!isLoadingMessages && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-xs">
                <p className="text-muted-foreground text-sm mb-1">No messages yet</p>
                <p className="text-muted-foreground/60 text-xs">
                  Send a message to start chatting with your agent.
                </p>
              </div>
            </div>
          )}

          {messages?.map((msg, i) => (
            <div
              key={msg._id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  msg.role === "user"
                    ? "bg-claw-red/90 text-white rounded-br-md"
                    : "bg-muted/60 text-foreground rounded-bl-md border border-border/30",
                )}
              >
                {/* Source badge for non-web messages */}
                {msg.source !== "web" && (
                  <span className="text-[9px] uppercase tracking-wider mb-1 block opacity-60">
                    {msg.source === "glasses" ? "glasses" : msg.source}
                  </span>
                )}

                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.content}
                </p>

                <span className={cn(
                  "text-[10px] mt-1 block",
                  msg.role === "user" ? "text-white/50" : "text-muted-foreground",
                )}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {/* Streaming response — shows as the agent types.
              Only show if there isn't already a matching Convex message
              (prevents duplicate display after persist) */}
          {streamingContent && !(messages?.some(m =>
            m.role === "agent" && m.content === streamingContent
          )) && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-muted/60 text-foreground rounded-2xl rounded-bl-md border border-border/30 px-4 py-2.5">
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {streamingContent}
                </p>
                <span className="text-[10px] mt-1 block text-muted-foreground">
                  typing…
                </span>
              </div>
            </div>
          )}

          {/* Typing indicator (shown before streaming starts) */}
          {waitingForAgent && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-muted/60 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{animationDelay: "0ms"}} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{animationDelay: "150ms"}} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{animationDelay: "300ms"}} />
                  </div>
                  <span className="text-xs text-muted-foreground/50 ml-2">Thinking…</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/50 px-4 py-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your agent…"
              disabled={sending}
              rows={1}
              className={cn(
                "flex-1 px-4 py-2.5 bg-muted/30 border border-border/50 rounded-xl text-sm",
                "placeholder:text-muted-foreground/50 resize-none",
                "focus:outline-none focus:ring-1 focus:ring-claw-red/50 focus:border-claw-red/30",
                "transition-colors",
                sending && "opacity-50",
              )}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-xl shrink-0 transition-all",
                input.trim() && !sending
                  ? "bg-claw-red text-white hover:bg-claw-red/90"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {sending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Browser View Side Panel ── */}
      {showBrowser && hasBrowserUrl && (
        <div className="w-1/2 h-full border-l border-border/50 flex flex-col">
          {/* Browser Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Watch Agent</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={instance!.browser_use_live_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Open in new tab <ExternalLink className="inline h-2.5 w-2.5" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowBrowser(false)}
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Browser iframe */}
          <div className="flex-1 relative bg-black">
            <iframe
              src={instance!.browser_use_live_url!}
              title="Browser Use Live View"
              className="absolute inset-0 w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  )
}
