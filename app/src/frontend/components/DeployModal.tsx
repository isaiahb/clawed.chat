/**
 * DeployModal — deploy a new OpenClaw agent to the cloud
 *
 * Two modes:
 *   A) Managed (default) — use clawed.chat credits, no API key needed.
 *      VM points at our LLM proxy. User never sees a key.
 *   B) BYOK — user pastes their own API key. Encrypted + stored.
 *
 * Flow:
 *   1. Click Deploy (managed is default — one click!)
 *   2. Optionally toggle to BYOK, choose provider, paste key
 *   3. POST /api/instances/create
 *   4. Shows progress → closes when instance is provisioning
 */

import {useState} from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeployModalProps {
  open: boolean
  onClose: () => void
  onDeploy: (provider: string, apiKey: string, managed: boolean) => Promise<void>
}

type KeyMode = "managed" | "byok"

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    model: "Claude Sonnet 4.5",
    icon: "🟣",
    prefix: "sk-ant-",
    placeholder: "sk-ant-api03-...",
  },
  {
    id: "openai",
    name: "OpenAI",
    model: "GPT-5.2",
    icon: "🟢",
    prefix: "sk-",
    placeholder: "sk-proj-...",
  },
  {
    id: "google",
    name: "Google",
    model: "Gemini 2.5 Pro",
    icon: "🔵",
    prefix: "AI",
    placeholder: "AIza...",
  },
] as const

// ─── Component ───────────────────────────────────────────────────────────────

export default function DeployModal({open, onClose, onDeploy}: DeployModalProps) {
  const [keyMode, setKeyMode] = useState<KeyMode>("managed")
  const [provider, setProvider] = useState<string>("anthropic")
  const [apiKey, setApiKey] = useState("")
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)!
  const isManaged = keyMode === "managed"
  const canDeploy = isManaged || apiKey.trim()

  async function handleDeploy() {
    if (!isManaged && !apiKey.trim()) {
      setError("API key is required for BYOK mode")
      return
    }

    setError(null)
    setDeploying(true)

    try {
      await onDeploy(
        isManaged ? "anthropic" : provider,
        isManaged ? "" : apiKey.trim(),
        isManaged,
      )
      // Reset and close on success
      setApiKey("")
      setProvider("anthropic")
      setKeyMode("managed")
      onClose()
    } catch (err: any) {
      setError(err.message || "Deploy failed")
    } finally {
      setDeploying(false)
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !deploying) {
      onClose()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape" && !deploying) {
      onClose()
    }
    if (e.key === "Enter" && apiKey.trim() && !deploying) {
      handleDeploy()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold">Deploy Agent</h2>
          {!deploying && (
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-300 transition-colors text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        <div className="px-6 pb-6">
          {/* Key Mode Toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => {setKeyMode("managed"); setError(null)}}
              disabled={deploying}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                isManaged
                  ? "border-green-500/50 bg-green-500/10 text-green-400"
                  : "border-neutral-800 text-neutral-500 hover:border-neutral-700"
              } ${deploying ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              ✨ Use free credits
            </button>
            <button
              onClick={() => {setKeyMode("byok"); setError(null)}}
              disabled={deploying}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium border transition-all ${
                !isManaged
                  ? "border-neutral-500 bg-neutral-800 text-neutral-200"
                  : "border-neutral-800 text-neutral-500 hover:border-neutral-700"
              } ${deploying ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              🔑 Bring your own key
            </button>
          </div>

          {/* Managed mode — simple, no key needed */}
          {isManaged && (
            <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400 text-sm">🟣</span>
                <span className="text-sm font-medium text-green-400">Claude Sonnet 4.5</span>
              </div>
              <p className="text-xs text-neutral-400">
                Deploy instantly with free demo credits. No API key needed.
                Powered by clawed.chat.
              </p>
            </div>
          )}

          {/* BYOK mode — provider selection + API key */}
          {!isManaged && (
            <>
              <p className="text-xs text-neutral-500 mb-3">Choose your LLM provider</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProvider(p.id)
                      setError(null)
                    }}
                    disabled={deploying}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      provider === p.id
                        ? "border-neutral-500 bg-neutral-800"
                        : "border-neutral-800 hover:border-neutral-700 bg-neutral-900"
                    } ${deploying ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-xs font-medium">{p.name}</span>
                    <span className="text-[10px] text-neutral-500">{p.model}</span>
                  </button>
                ))}
              </div>

              <label className="block text-xs text-neutral-500 mb-2">
                {selectedProvider.name} API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setError(null)
                }}
                placeholder={selectedProvider.placeholder}
                disabled={deploying}
                autoFocus
                className={`w-full px-4 py-3 bg-neutral-950 border rounded-xl text-sm font-mono placeholder:text-neutral-700 focus:outline-none focus:ring-1 transition-colors ${
                  error
                    ? "border-red-500/50 focus:ring-red-500/50"
                    : "border-neutral-800 focus:ring-neutral-600"
                } ${deploying ? "opacity-50 cursor-not-allowed" : ""}`}
              />

              <p className="text-[10px] text-neutral-600 mt-2">
                Your key is encrypted before storage and never leaves our server.
              </p>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={!canDeploy || deploying}
            className={`w-full mt-5 py-3 rounded-xl text-sm font-medium transition-all ${
              !canDeploy || deploying
                ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                : "bg-neutral-100 text-neutral-900 hover:bg-white active:scale-[0.98]"
            }`}
          >
            {deploying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-400 border-t-neutral-900" />
                Deploying...
              </span>
            ) : isManaged ? (
              "Deploy with free credits"
            ) : (
              "Deploy with your key"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
