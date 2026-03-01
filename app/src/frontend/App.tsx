/**
 * App — root component for clawed.chat dashboard
 *
 * Auth stack:
 *   - Clerk handles identity (Google OAuth)
 *   - Convex validates Clerk JWTs automatically
 *   - Use Convex's <Authenticated>/<Unauthenticated> (not Clerk's <SignedIn>/<SignedOut>)
 *   - MentraAuth handles glasses hardware session (orthogonal to Clerk)
 */

import {useState, useEffect, useCallback, createContext, useContext} from "react"
import {Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation} from "convex/react"
import {SignInButton, UserButton, useUser} from "@clerk/clerk-react"
import {useMentraAuth} from "@mentra/react"
import {api} from "../../../convex/_generated/api"
import type {Instance} from "./components/InstanceCard"
import DeployModal from "./components/DeployModal"
import InstanceCard from "./components/InstanceCard"
import ChatPanel from "./components/ChatPanel"
import BrowserView from "./components/BrowserView"

// ─── Theme Context ───────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: "light" | "dark"
  isDarkMode: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isDarkMode: true,
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Theme state — default dark for the hacker aesthetic
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("clawed-theme")
      if (saved === "dark" || saved === "light") return saved
    }
    return "dark"
  })

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("clawed-theme", next)
      return next
    })
  }, [])

  // Apply dark class to document root
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  // Keyboard shortcut: Cmd+Shift+D to toggle theme
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "d" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        toggleTheme()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [toggleTheme])

  return (
    <ThemeContext.Provider value={{theme, isDarkMode: theme === "dark", toggleTheme}}>
      <div className="font-sans bg-neutral-950 text-neutral-100 min-h-screen">
        <AuthLoading>
          <LoadingScreen />
        </AuthLoading>

        <Unauthenticated>
          <SignInScreen />
        </Unauthenticated>

        <Authenticated>
          <Dashboard />
        </Authenticated>
      </div>
    </ThemeContext.Provider>
  )
}

// ─── Sign In Screen ──────────────────────────────────────────────────────────

function SignInScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 max-w-md">
        <div className="text-5xl mb-6">🐾</div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">clawed.chat</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Deploy your own OpenClaw AI agent in 30 seconds.
          Talk to it from your smart glasses.
        </p>
        <SignInButton mode="modal">
          <button className="px-8 py-3 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors">
            Sign in with Google
          </button>
        </SignInButton>
      </div>
    </div>
  )
}

// ─── Loading Screen ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-700 border-t-neutral-100" />
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function Dashboard() {
  const mentra = useMentraAuth()
  const {user} = useUser()

  // State
  const [deployOpen, setDeployOpen] = useState(false)
  const [chatInstanceId, setChatInstanceId] = useState<string | null>(null)
  const [watchInstance, setWatchInstance] = useState<Instance | null>(null)

  // Convex real-time query — instances for this user
  // Uses Clerk user ID as the user_id
  const instances = useQuery(
    api.instances.listByUser,
    user?.id ? {user_id: user.id} : "skip",
  ) as Instance[] | undefined

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function handleDeploy(provider: string, apiKey: string, managed: boolean) {
    const res = await fetch("/api/instances/create", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({llm_provider: provider, api_key: apiKey, managed}),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Deploy failed (${res.status})`)
    }

    // Instance will appear in the list via Convex subscription
  }

  async function handleStart(id: string) {
    const res = await fetch(`/api/instances/${id}/start`, {method: "POST"})
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || "Start failed")
    }
  }

  async function handleStop(id: string) {
    const res = await fetch(`/api/instances/${id}/stop`, {method: "POST"})
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || "Stop failed")
    }
  }

  async function handleDestroy(id: string) {
    const res = await fetch(`/api/instances/${id}`, {method: "DELETE"})
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || "Destroy failed")
    }
    // Close panels if they were open for this instance
    if (chatInstanceId === id) setChatInstanceId(null)
    if (watchInstance?._id === id) setWatchInstance(null)
  }

  function handleOpenChat(id: string) {
    setChatInstanceId(id)
    setWatchInstance(null) // Close browser view when opening chat
  }

  function handleWatchAgent(id: string) {
    const instance = instances?.find((i) => i._id === id)
    if (instance?.browser_use_live_url) {
      setWatchInstance(instance)
      setChatInstanceId(null) // Close chat when opening browser view
    }
  }

  // ─── Derived state ───────────────────────────────────────────────────────

  const hasInstances = instances && instances.length > 0
  const isLoading = instances === undefined
  const activePanel = chatInstanceId ? "chat" : watchInstance ? "browser" : null

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐾</span>
          <h1 className="text-xl font-bold tracking-tight">clawed.chat</h1>
        </div>
        <div className="flex items-center gap-3">
          {mentra.isAuthenticated && (
            <span className="text-[10px] uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-1 rounded">
              👓 glasses
            </span>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </div>
      </header>

      {/* Main layout: instances + side panel */}
      <div className={`flex gap-6 ${activePanel ? "" : ""}`}>
        {/* Left: Instances */}
        <div className={`${activePanel ? "w-1/2" : "w-full"} transition-all`}>
          {/* Deploy button bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Your Agents</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {hasInstances
                  ? `${instances.length} instance${instances.length > 1 ? "s" : ""}`
                  : "No agents deployed yet"}
              </p>
            </div>
            <button
              onClick={() => setDeployOpen(true)}
              className="px-5 py-2.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors active:scale-[0.98]"
            >
              + Deploy Agent
            </button>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-neutral-700 border-t-neutral-300" />
                <p className="text-sm text-neutral-500">Loading instances...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !hasInstances && (
            <div className="border border-dashed border-neutral-800 rounded-2xl p-16 text-center">
              <div className="text-4xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold mb-2">No agents yet</h2>
              <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
                Deploy your first OpenClaw AI agent to the cloud, or connect your Mac.
                Your agent can browse the web, manage files, send emails, and more.
              </p>
              <button
                className="px-6 py-2.5 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                onClick={() => setDeployOpen(true)}
              >
                Deploy your first agent
              </button>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                <FeatureCard
                  emoji="☁️"
                  title="Cloud Deploy"
                  description="One-click GCP VM with OpenClaw pre-installed. ~60 seconds to running."
                />
                <FeatureCard
                  emoji="👓"
                  title="Smart Glasses"
                  description="Talk to your agent hands-free via Mentra glasses. Voice in, voice out."
                />
                <FeatureCard
                  emoji="🌐"
                  title="Watch Your Agent"
                  description="Live browser view powered by Browser Use. See what your agent sees."
                />
              </div>
            </div>
          )}

          {/* Instance list */}
          {hasInstances && (
            <div className="space-y-4">
              {instances.map((instance) => (
                <InstanceCard
                  key={instance._id}
                  instance={instance}
                  onStart={handleStart}
                  onStop={handleStop}
                  onDestroy={handleDestroy}
                  onOpenChat={handleOpenChat}
                  onWatchAgent={handleWatchAgent}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Side panel (chat or browser view) */}
        {activePanel && (
          <div className="w-1/2 h-[calc(100vh-8rem)] sticky top-8">
            {chatInstanceId && (
              <ChatPanel
                instanceId={chatInstanceId}
                onClose={() => setChatInstanceId(null)}
              />
            )}
            {watchInstance?.browser_use_live_url && (
              <BrowserView
                liveUrl={watchInstance.browser_use_live_url}
                onClose={() => setWatchInstance(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Deploy Modal */}
      <DeployModal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        onDeploy={handleDeploy}
      />

      {/* Health check footer */}
      <div className="mt-12 text-center">
        <p className="text-xs text-neutral-600">
          API: <HealthCheck /> · {user?.primaryEmailAddress?.emailAddress ?? ""}
        </p>
      </div>
    </div>
  )
}

// ─── Feature Card ────────────────────────────────────────────────────────────

function FeatureCard({emoji, title, description}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="border border-neutral-800 rounded-xl p-5 text-left hover:border-neutral-700 transition-colors">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-neutral-500 text-xs">{description}</p>
    </div>
  )
}

// ─── Health Check ────────────────────────────────────────────────────────────

function HealthCheck() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking")

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "ok" ? "ok" : "error"))
      .catch(() => setStatus("error"))
  }, [])

  if (status === "checking") return <span className="text-neutral-500">checking...</span>
  if (status === "ok") return <span className="text-green-500">✓ ok</span>
  return <span className="text-red-500">✗ unreachable</span>
}
