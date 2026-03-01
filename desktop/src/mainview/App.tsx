import { useEffect, useRef, useState, useCallback } from "react"
import clawLogoSvg from "./claw-logo.svg"

// ─── Config ──────────────────────────────────────────────────────────────────

const BACKEND_URL = "https://clawed.chat"
const CLERK_SIGN_IN_URL = "https://clawed.chat/sign-in"
const HEARTBEAT_INTERVAL_MS = 30_000

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = "welcome" | "provider" | "apikey" | "progress" | "connected"

interface Provider {
  id: string
  name: string
  icon: string
  models: Model[]
  color: string
}

interface Model {
  id: string
  name: string
  badge?: string
}

interface SetupStep {
  label: string
  detail: string
  durationMs: number
}

// ─── Provider & Model Data (current as of March 2026) ────────────────────────

// Provider logos — using real SVG brand marks from CDN / inline
const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: "https://cdn.simpleicons.org/anthropic/191919",
  openai: "https://cdn.simpleicons.org/openai/191919",
  google: "https://cdn.simpleicons.org/google/191919",
  minimax: "https://cdn.simpleicons.org/minutemailer/191919", // closest available icon
  fireworks: "https://cdn.simpleicons.org/fireship/191919",
  managed: "https://cdn.simpleicons.org/sparkasse/dc2626",
}

const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    icon: "",
    color: "#191919",
    models: [
      { id: "claude-opus-4.6", name: "Claude Opus 4.6", badge: "New" },
      { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", badge: "New" },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "claude-haiku-3.5", name: "Claude Haiku 3.5", badge: "Fast" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "",
    color: "#10a37f",
    models: [
      { id: "gpt-5.2", name: "GPT-5.2", badge: "New" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "o3", name: "o3", badge: "Reasoning" },
      { id: "o4-mini", name: "o4-mini", badge: "Fast" },
    ],
  },
  {
    id: "google",
    name: "Google",
    icon: "",
    color: "#4285f4",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", badge: "New" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", badge: "Fast" },
      { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro" },
    ],
  },
  {
    id: "minimax",
    name: "MiniMax",
    icon: "",
    color: "#eab308",
    models: [
      { id: "minimax-m1", name: "MiniMax M1", badge: "New" },
      { id: "minimax-text-01", name: "MiniMax Text 01" },
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    icon: "",
    color: "#f97316",
    models: [
      { id: "fireworks-deepseek-v3", name: "DeepSeek V3", badge: "Fast" },
      { id: "fireworks-llama-4-maverick", name: "Llama 4 Maverick" },
      { id: "fireworks-qwen-3-235b", name: "Qwen 3 235B" },
    ],
  },
]

const FREE_CREDITS_PROVIDER: Provider = {
  id: "managed",
  name: "Clawed",
  icon: "",
  color: "#dc2626",
  models: [
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", badge: "Included" },
  ],
}

const SETUP_STEPS: SetupStep[] = [
  { label: "Checking system requirements", detail: "macOS, 8 GB RAM", durationMs: 500 },
  { label: "Installing Bun runtime", detail: "Package manager & JS runtime", durationMs: 800 },
  { label: "Installing OpenClaw agent", detail: "AI agent framework v2026.2", durationMs: 1100 },
  { label: "Writing provider credentials", detail: "Storing API key securely", durationMs: 600 },
  { label: "Configuring workspace & plugins", detail: "Gateway, auth & channel plugin", durationMs: 800 },
  { label: "Connecting to clawed.chat", detail: "Registering this machine", durationMs: 900 },
  { label: "Starting agent gateway", detail: "Verifying connectivity", durationMs: 600 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMachineName(): string {
  return "Isaiah's MacBook"
}

// ─── Inline SVGs ─────────────────────────────────────────────────────────────

function ClawLogo({ size = 48 }: { size?: number }) {
  return (
    <img
      src={clawLogoSvg}
      alt="Clawed"
      width={size}
      height={size}
      className="rounded-lg"
      style={{ width: size, height: size }}
    />
  )
}

function CheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#22c55e" fillOpacity="0.12" />
      <path d="M6.5 10.5l2 2 5-5" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="spin">
      <circle cx="10" cy="10" r="8" stroke="#e5e7eb" strokeWidth="2" />
      <path d="M18 10a8 8 0 00-8-8" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PendingDot() {
  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
    </div>
  )
}

function ProviderLogo({ providerId, size = 20 }: { providerId: string; size?: number }) {
  const src = PROVIDER_LOGOS[providerId]
  if (!src) return <div style={{ width: size, height: size }} className="rounded bg-gray-200" />
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  )
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline">
      <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="inline text-gray-400">
      <path d="M10 1a4 4 0 00-3.87 5.03L2 10.17V14h3.83l.17-.17v-2h2v-2h2l1.03-1.03A4 4 0 0010 1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="5" r="1" fill="currentColor" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Welcome
// ═══════════════════════════════════════════════════════════════════════════════

function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="animate-in flex flex-col items-center text-center">
      <div className="mb-5">
        <ClawLogo size={64} />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Welcome to Clawed
      </h1>

      <p className="mt-2.5 text-sm leading-relaxed text-gray-500 max-w-[300px]">
        Set up your personal AI agent on this Mac.
        <br />
        It only takes about 30 seconds.
      </p>

      <button onClick={onGetStarted} className="btn-claw mt-8 w-full max-w-[260px]">
        Get started
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Pick your provider
// ═══════════════════════════════════════════════════════════════════════════════

function ProviderScreen({
  onSelect,
  onFreeCredits,
}: {
  onSelect: (provider: Provider) => void
  onFreeCredits: () => void
}) {
  return (
    <div className="animate-in w-full flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Choose your AI provider
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Bring your own API key, or use free demo credits.
        </p>
      </div>

      {/* Free credits option */}
      <button
        onClick={onFreeCredits}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors text-left group"
      >
        <ClawLogo size={24} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Clawed</p>
          <p className="text-[11px] text-gray-400">Claude Sonnet 4.5 · Powered by clawed.chat</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
          Recommended
        </span>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">or bring your key</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Provider grid */}
      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left"
          >
            <ProviderLogo providerId={p.id} size={22} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 leading-tight">{p.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{p.models.length} models</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Model + API Key
// ═══════════════════════════════════════════════════════════════════════════════

function ApiKeyScreen({
  provider,
  onContinue,
  onBack,
}: {
  provider: Provider
  onContinue: (model: Model, apiKey: string) => void
  onBack: () => void
}) {
  const [selectedModel, setSelectedModel] = useState<Model>(provider.models[0])
  const [apiKey, setApiKey] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const isValid = apiKey.trim().length > 8

  const placeholders: Record<string, string> = {
    anthropic: "sk-ant-...",
    openai: "sk-...",
    google: "AIza...",
    minimax: "eyJ...",
    fireworks: "fw_...",
  }

  return (
    <div className="animate-in w-full flex flex-col gap-5">
      {/* Back + title */}
      <div>
        <button
          onClick={onBack}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3 flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
          <ProviderLogo providerId={provider.id} size={24} /> {provider.name}
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          Pick a model and enter your API key.
        </p>
      </div>

      {/* Model selection */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
          Model
        </label>
        <div className="flex flex-wrap gap-1.5">
          {provider.models.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedModel.id === m.id
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.name}
              {m.badge && (
                <span className={`ml-1.5 text-[9px] uppercase tracking-wider ${
                  selectedModel.id === m.id ? "text-gray-400" : "text-gray-400"
                }`}>
                  {m.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* API Key input */}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <KeyIcon /> API Key
        </label>
        <input
          ref={inputRef}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={placeholders[provider.id] || "Paste your API key"}
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid) onContinue(selectedModel, apiKey.trim())
          }}
        />
        <p className="mt-1.5 text-[10px] text-gray-400">
          Stored locally on this machine. Never sent to clawed.chat.
        </p>
      </div>

      {/* Continue */}
      <button
        onClick={() => onContinue(selectedModel, apiKey.trim())}
        disabled={!isValid}
        className={`btn-claw w-full ${!isValid ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        Continue <ArrowRight />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — Setup Progress
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressScreen({
  steps,
  currentStep,
  done,
  modelName,
  providerName,
}: {
  steps: SetupStep[]
  currentStep: number
  done: boolean
  modelName: string
  providerName: string
}) {
  const waitingForAuth = currentStep < 0
  const pct = done ? 100 : waitingForAuth ? 0 : Math.round(((currentStep + 1) / steps.length) * 100)

  return (
    <div className="animate-in w-full flex flex-col gap-5">
      <div className="text-center flex flex-col items-center gap-1.5">
        <ClawLogo size={28} />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          {done ? "All set!" : waitingForAuth ? "Signing you in…" : "Setting up your agent…"}
        </h2>
        <p className="text-[11px] text-gray-400">
          {done
            ? `${modelName} on ${providerName} — ready to go`
            : waitingForAuth
              ? "Complete sign-in in your browser"
              : `Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {steps.map((step, i) => {
          const status = waitingForAuth
            ? "pending"
            : i < currentStep ? "done"
              : i === currentStep && !done ? "running"
                : done ? "done" : "pending"

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 ${
                status === "running" ? "bg-red-50/60"
                  : status === "pending" ? "opacity-35"
                    : ""
              }`}
            >
              <div className="flex-shrink-0">
                {status === "done" && <CheckCircle />}
                {status === "running" && <SpinnerSVG />}
                {status === "pending" && <PendingDot />}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 leading-snug">{step.label}</p>
                <p className="text-[11px] text-gray-400 leading-snug">{step.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 5 — Connected
// ═══════════════════════════════════════════════════════════════════════════════

function ConnectedScreen({
  modelName,
  providerName,
  onOpenDashboard,
}: {
  modelName: string
  providerName: string
  onOpenDashboard: () => void
}) {
  return (
    <div className="animate-in flex flex-col items-center text-center">
      {/* Status badge */}
      <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-50 border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 status-pulse" />
        <span className="text-xs font-semibold text-green-700 tracking-wide">Agent Online</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Your agent is running
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-gray-500 max-w-[310px]">
        This Mac is now a personal AI agent. Chat from the web, your phone, or smart glasses.
      </p>

      {/* Info card */}
      <div className="mt-5 w-full rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden divide-y divide-gray-100 text-left">
        <InfoRow label="Machine" value={getMachineName()} />
        <InfoRow label="Provider" value={providerName} />
        <InfoRow label="Model" value={modelName} />
        <InfoRow label="Gateway" value="localhost:18789" />
        <InfoRow label="Status" value="Connected" valueClass="text-green-600" />
      </div>

      <button onClick={onOpenDashboard} className="btn-claw mt-6 w-full max-w-[260px]">
        Open dashboard ↗
      </button>

      <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
        Keep this app running to keep your agent online.
      </p>
    </div>
  )
}

function InfoRow({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className={`text-[13px] font-semibold text-gray-800 ${valueClass}`}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome")
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [setupDone, setSetupDone] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [])

  // ── Real API calls ────────────────────────────────────────────────────────

  const registerInstance = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/api/desktop/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ machine_name: getMachineName(), type: "local" }),
      })
    } catch {
      // non-fatal for demo
    }
  }, [])

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch(`${BACKEND_URL}/api/desktop/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ machine_name: getMachineName() }),
        })
      } catch { /* silent */ }
    }, HEARTBEAT_INTERVAL_MS)
  }, [])

  // ── Setup sequence (ticks through steps with timers) ──────────────────────

  const runSetupSequence = useCallback(() => {
    setScreen("progress")
    setCurrentStep(0)
    setSetupDone(false)

    let stepIndex = 0

    const runNextStep = () => {
      if (stepIndex >= SETUP_STEPS.length) {
        setSetupDone(true)
        registerInstance().finally(() => {
          startHeartbeat()
          setTimeout(() => setScreen("connected"), 500)
        })
        return
      }

      setCurrentStep(stepIndex)
      const step = SETUP_STEPS[stepIndex]
      stepIndex++
      setTimeout(runNextStep, step.durationMs)
    }

    setTimeout(runNextStep, 400)
  }, [registerInstance, startHeartbeat])

  // ── Open URL in system browser (ElectroBun blocks window.open) ────────────

  const openInBrowser = useCallback((url: string) => {
    // Try multiple approaches — ElectroBun webview blocks window.open
    const a = document.createElement("a")
    a.href = url
    a.target = "_blank"
    a.rel = "noopener noreferrer"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Fallback: also try window.open and location
    try { window.open(url, "_blank") } catch { /* blocked */ }
  }, [])

  // ── Screen handlers ───────────────────────────────────────────────────────

  const handleGetStarted = useCallback(() => {
    // Open Clerk sign-in in the system browser
    openInBrowser(CLERK_SIGN_IN_URL)

    // Show "signing in" state, then move to provider selection
    setScreen("progress")
    setCurrentStep(-1) // waiting for auth

    setTimeout(() => {
      setScreen("provider")
    }, 2500)
  }, [openInBrowser])

  const handleFreeCredits = useCallback(() => {
    setSelectedProvider(FREE_CREDITS_PROVIDER)
    setSelectedModel(FREE_CREDITS_PROVIDER.models[0])
    runSetupSequence()
  }, [runSetupSequence])

  const handleSelectProvider = useCallback((provider: Provider) => {
    setSelectedProvider(provider)
    setScreen("apikey")
  }, [])

  const handleApiKeyContinue = useCallback((model: Model, _apiKey: string) => {
    setSelectedModel(model)
    // In production we'd store the key locally. For demo, just proceed.
    runSetupSequence()
  }, [runSetupSequence])

  const handleBackToProviders = useCallback(() => {
    setScreen("provider")
  }, [])

  const handleOpenDashboard = useCallback(() => {
    openInBrowser(`${BACKEND_URL}/app/agents`)
  }, [openInBrowser])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white overflow-y-auto">
      <div className="w-full max-w-[420px]">
        {screen === "welcome" && (
          <WelcomeScreen onGetStarted={handleGetStarted} />
        )}

        {screen === "provider" && (
          <ProviderScreen
            onSelect={handleSelectProvider}
            onFreeCredits={handleFreeCredits}
          />
        )}

        {screen === "apikey" && selectedProvider && (
          <ApiKeyScreen
            provider={selectedProvider}
            onContinue={handleApiKeyContinue}
            onBack={handleBackToProviders}
          />
        )}

        {screen === "progress" && (
          <ProgressScreen
            steps={SETUP_STEPS}
            currentStep={currentStep}
            done={setupDone}
            modelName={selectedModel?.name ?? "Claude Sonnet 4.5"}
            providerName={selectedProvider?.name ?? "Free Credits"}
          />
        )}

        {screen === "connected" && (
          <ConnectedScreen
            modelName={selectedModel?.name ?? "Claude Sonnet 4.5"}
            providerName={selectedProvider?.name ?? "Free Credits"}
            onOpenDashboard={handleOpenDashboard}
          />
        )}
      </div>
    </div>
  )
}
