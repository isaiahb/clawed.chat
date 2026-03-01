import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { useUser } from "@clerk/clerk-react"
import { useMentraAuth } from "@mentra/react"
import { api } from "../../../../../convex/_generated/api"
import type { Instance } from "../../components/InstanceCard"
import DeployModal from "../../components/DeployModal"
import InstanceCard from "../../components/InstanceCard"
import ChatPanel from "../../components/ChatPanel"
import BrowserView from "../../components/BrowserView"
import { Button } from "../../components/ui/button"

function FeatureCard({ emoji, title, description }: {
    emoji: string
    title: string
    description: string
}) {
    return (
        <div className="border border-border/50 bg-card/30 rounded-xl p-5 text-left hover:border-foreground/30 transition-colors backdrop-blur-sm">
            <div className="text-2xl mb-3">{emoji}</div>
            <h3 className="font-medium text-sm mb-1 text-foreground">{title}</h3>
            <p className="text-muted-foreground text-xs">{description}</p>
        </div>
    )
}

function HealthCheck() {
    const [status, setStatus] = useState<"checking" | "ok" | "error">("checking")

    useEffect(() => {
        fetch("/api/health")
            .then((res) => res.json())
            .then((data) => setStatus(data.status === "ok" ? "ok" : "error"))
            .catch(() => setStatus("error"))
    }, [])

    if (status === "checking") return <span className="text-muted-foreground">checking...</span>
    if (status === "ok") return <span className="text-emerald-500">✓ ok</span>
    return <span className="text-destructive">✗ unreachable</span>
}

export default function AskPage() {
    const mentra = useMentraAuth()
    const { user } = useUser()

    // State
    const [deployOpen, setDeployOpen] = useState(false)
    const [chatInstanceId, setChatInstanceId] = useState<string | null>(null)
    const [watchInstance, setWatchInstance] = useState<Instance | null>(null)

    // Convex real-time query — instances for this user
    const instances = useQuery(
        api.instances.listByUser,
        user?.id ? { user_id: user.id } : "skip",
    ) as Instance[] | undefined

    // ─── Handlers ────────────────────────────────────────────────────────────

    async function handleDeploy(provider: string, apiKey: string, managed: boolean) {
        const res = await fetch("/api/instances/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ llm_provider: provider, api_key: apiKey, managed }),
        })

        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || `Deploy failed (${res.status})`)
        }
    }

    async function handleStart(id: string) {
        const res = await fetch(`/api/instances/${id}/start`, { method: "POST" })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || "Start failed")
        }
    }

    async function handleStop(id: string) {
        const res = await fetch(`/api/instances/${id}/stop`, { method: "POST" })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || "Stop failed")
        }
    }

    async function handleDestroy(id: string) {
        const res = await fetch(`/api/instances/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error || "Destroy failed")
        }
        if (chatInstanceId === id) setChatInstanceId(null)
        if (watchInstance?._id === id) setWatchInstance(null)
    }

    function handleOpenChat(id: string) {
        setChatInstanceId(id)
        setWatchInstance(null)
    }

    function handleWatchAgent(id: string) {
        const instance = instances?.find((i) => i._id === id)
        if (instance?.browser_use_live_url) {
            setWatchInstance(instance)
            setChatInstanceId(null)
        }
    }

    // ─── Derived state ───────────────────────────────────────────────────────
    const hasInstances = instances && instances.length > 0
    const isLoading = instances === undefined
    const activePanel = chatInstanceId ? "chat" : watchInstance ? "browser" : null

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header handled by AppLayout now, just show title */}
            <div className="mb-8 flex items-end justify-between border-b border-border/50 pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Agents
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {hasInstances
                            ? `${instances.length} instance${instances.length > 1 ? "s" : ""}`
                            : "Deploy and manage your OpenClaw agents."}
                    </p>
                </div>
                <Button
                    onClick={() => setDeployOpen(true)}
                    className="bg-claw-red text-white hover:bg-claw-red-bright"
                >
                    + Deploy Agent
                </Button>
            </div>

            {/* Main layout: instances + side panel */}
            <div className={`flex gap-6 ${activePanel ? "" : ""}`}>
                {/* Left: Instances */}
                <div className={`${activePanel ? "w-1/2" : "w-full"} transition-all`}>
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="relative h-10 w-10">
                                <div className="absolute inset-0 animate-spin rounded-full border-2 border-claw-red/20 border-t-claw-red" />
                                <div className="absolute inset-1 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border border-claw-red/10 border-b-claw-red/40" />
                            </div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                Loading instances...
                            </p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && !hasInstances && (
                        <div className="border border-dashed border-border/50 rounded-2xl p-16 text-center bg-card/20 backdrop-blur-sm">
                            <div className="text-4xl mb-4">🤖</div>
                            <h2 className="text-lg font-semibold mb-2 text-foreground">No agents deployed</h2>
                            <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto leading-relaxed">
                                Deploy your first OpenClaw AI agent to the cloud, or connect your Mac.
                                Your agent can browse the web, manage files, send emails, and more.
                            </p>
                            <Button
                                size="lg"
                                className="bg-claw-red hover:bg-claw-red-bright text-white shadow-md hover:shadow-lg hover:shadow-claw-red/20"
                                onClick={() => setDeployOpen(true)}
                            >
                                Deploy your first agent
                            </Button>

                            {/* Feature cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
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
                    <div className="w-1/2 h-[calc(100vh-12rem)] sticky top-6">
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
            <div className="mt-12 mb-6 text-center border-t border-border/30 pt-6">
                <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                    API: <HealthCheck /> · {user?.primaryEmailAddress?.emailAddress ?? ""}
                    {mentra.isAuthenticated && " · 👓 GLASSES CONNECTED"}
                </p>
            </div>
        </div>
    )
}
