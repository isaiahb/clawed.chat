/**
 * InstanceCard — displays a single OpenClaw instance with status + controls
 *
 * Shows:
 *   - Status badge (provisioning, running, stopped, error)
 *   - Subdomain link
 *   - LLM provider
 *   - Start / Stop / Destroy controls
 *   - Open Chat / Watch Agent buttons
 */

import {useState} from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Instance {
  _id: string
  user_id: string
  type: "cloud" | "local"
  status: "provisioning" | "running" | "stopped" | "stopping" | "starting" | "destroying" | "destroyed" | "error"
  subdomain: string
  ip?: string
  llm_provider: "anthropic" | "openai" | "google" | "minimax"
  browser_use_live_url?: string
  last_active_at?: number
}

interface InstanceCardProps {
  instance: Instance
  onStart: (id: string) => Promise<void>
  onStop: (id: string) => Promise<void>
  onDestroy: (id: string) => Promise<void>
  onOpenChat: (id: string) => void
  onWatchAgent: (id: string) => void
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {label: string, color: string, bg: string, pulse?: boolean}> = {
  provisioning: {label: "Provisioning", color: "text-yellow-400", bg: "bg-yellow-400/10", pulse: true},
  running:      {label: "Running",      color: "text-green-400",  bg: "bg-green-400/10"},
  stopped:      {label: "Stopped",      color: "text-neutral-500", bg: "bg-neutral-500/10"},
  stopping:     {label: "Stopping",     color: "text-orange-400", bg: "bg-orange-400/10", pulse: true},
  starting:     {label: "Starting",     color: "text-blue-400",   bg: "bg-blue-400/10", pulse: true},
  destroying:   {label: "Destroying",   color: "text-red-400",    bg: "bg-red-400/10", pulse: true},
  destroyed:    {label: "Destroyed",    color: "text-neutral-600", bg: "bg-neutral-600/10"},
  error:        {label: "Error",        color: "text-red-400",    bg: "bg-red-400/10"},
}

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: "https://cdn.simpleicons.org/anthropic/a78bfa",
  openai:    "https://cdn.simpleicons.org/openai/10a37f",
  google:    "https://cdn.simpleicons.org/google/4285f4",
  minimax:   "https://cdn.simpleicons.org/minutemailer/f59e0b",
}

const PROVIDER_LABELS: Record<string, {name: string}> = {
  anthropic: {name: "Anthropic"},
  openai:    {name: "OpenAI"},
  google:    {name: "Google"},
  minimax:   {name: "Minimax"},
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InstanceCard({
  instance,
  onStart,
  onStop,
  onDestroy,
  onOpenChat,
  onWatchAgent,
}: InstanceCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDestroy, setConfirmDestroy] = useState(false)

  const status = STATUS_CONFIG[instance.status] ?? STATUS_CONFIG.error!
  const provider = PROVIDER_LABELS[instance.llm_provider] ?? {name: instance.llm_provider}
  const providerLogo = PROVIDER_LOGOS[instance.llm_provider]
  const isTransitioning = ["provisioning", "stopping", "starting", "destroying"].includes(instance.status)
  const isRunning = instance.status === "running"
  const isStopped = instance.status === "stopped"

  async function handleAction(action: string, fn: (id: string) => Promise<void>) {
    setLoading(action)
    try {
      await fn(instance._id)
    } catch (err) {
      console.error(`[instance] ${action} failed:`, err)
    } finally {
      setLoading(null)
    }
  }

  function timeAgo(ts?: number): string {
    if (!ts) return "never"
    const seconds = Math.floor((Date.now() - ts) / 1000)
    if (seconds < 60) return "just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors">
      {/* Header: status + subdomain */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
              {status.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.color.replace("text-", "bg-")}`} />
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status.color.replace("text-", "bg-")}`} />
                </span>
              )}
              {status.label}
            </span>
            <span className="text-[10px] text-neutral-600">
              {instance.type === "local" ? "local" : "cloud"}
            </span>
          </div>
          <h3 className="text-sm font-medium truncate">
            {isRunning ? (
              <a
                href={`https://${instance.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                {instance.subdomain} ↗
              </a>
            ) : (
              <span className="text-neutral-400">{instance.subdomain}</span>
            )}
          </h3>
        </div>

        {/* Provider badge */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 ml-3 shrink-0">
          {providerLogo ? (
            <img src={providerLogo} alt="" width={14} height={14} className="object-contain" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full bg-neutral-600" />
          )}
          <span>{provider.name}</span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[10px] text-neutral-600 mb-4">
        {instance.ip && (
          <span className="font-mono">{instance.ip}</span>
        )}
        <span>Active {timeAgo(instance.last_active_at)}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Chat button — only when running */}
        {isRunning && (
          <button
            onClick={() => onOpenChat(instance._id)}
            className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-900 rounded-lg text-xs font-medium hover:bg-white transition-colors"
          >
            Chat
          </button>
        )}

        {/* Watch Agent — only when running + has browser use url */}
        {isRunning && instance.browser_use_live_url && (
          <button
            onClick={() => onWatchAgent(instance._id)}
            className="flex-1 py-2 px-3 bg-neutral-800 text-neutral-200 rounded-lg text-xs font-medium hover:bg-neutral-700 transition-colors"
          >
            👁 Watch
          </button>
        )}

        {/* Start — only when stopped */}
        {isStopped && (
          <button
            onClick={() => handleAction("start", onStart)}
            disabled={loading !== null}
            className="flex-1 py-2 px-3 bg-green-500/10 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            {loading === "start" ? "Starting..." : "▶ Start"}
          </button>
        )}

        {/* Stop — only when running */}
        {isRunning && (
          <button
            onClick={() => handleAction("stop", onStop)}
            disabled={loading !== null}
            className="py-2 px-3 bg-neutral-800 text-neutral-400 rounded-lg text-xs font-medium hover:bg-neutral-700 hover:text-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading === "stop" ? "⏳" : "⏸"}
          </button>
        )}

        {/* Destroy — when stopped or errored */}
        {(isStopped || instance.status === "error") && (
          <>
            {confirmDestroy ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setConfirmDestroy(false)
                    handleAction("destroy", onDestroy)
                  }}
                  disabled={loading !== null}
                  className="py-2 px-3 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDestroy(false)}
                  className="py-2 px-3 text-neutral-500 rounded-lg text-xs hover:text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDestroy(true)}
                disabled={loading !== null}
                className="py-2 px-3 text-neutral-600 rounded-lg text-xs hover:text-red-400 transition-colors disabled:opacity-50"
              >
                🗑
              </button>
            )}
          </>
        )}

        {/* Spinner for transitioning states */}
        {isTransitioning && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="animate-spin rounded-full h-3.5 w-3.5 border border-neutral-600 border-t-neutral-300" />
          </div>
        )}
      </div>
    </div>
  )
}
