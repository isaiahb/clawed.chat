/**
 * AgentsPage — manage your deployed OpenClaw agents
 *
 * Shows a list of instance cards with status + controls.
 * Empty state prompts to deploy your first agent.
 * Deploy modal for provisioning new instances.
 *
 * Route: /app/agents
 */

import {useState} from "react"
import {useQuery} from "convex/react"
import {useUser} from "@clerk/clerk-react"
import {useNavigate} from "react-router-dom"
import {api} from "../../../../../convex/_generated/api"
import type {Instance} from "../../components/InstanceCard"
import DeployModal from "../../components/DeployModal"
import InstanceCard from "../../components/InstanceCard"
import {Button} from "../../components/ui/button"
import {Plus, Loader2, Server} from "lucide-react"
import {useDocumentTitle} from "../../hooks/useDocumentTitle"
import {cn} from "../../lib/utils"

export default function AgentsPage() {
  useDocumentTitle("Agents")
  const {user} = useUser()
  const navigate = useNavigate()

  const [deployOpen, setDeployOpen] = useState(false)

  // Convex real-time query — instances for this user
  const instances = useQuery(
    api.instances.listByUser,
    user?.id ? {user_id: user.id} : "skip",
  ) as Instance[] | undefined

  // ─── Handlers ──────────────────────────────────────────────────────────

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
  }

  function handleOpenChat(id: string) {
    navigate(`/app/chat/${id}`)
  }

  function handleWatchAgent(id: string) {
    const instance = instances?.find((i) => i._id === id)
    if (instance?.browser_use_live_url) {
      navigate(`/app/watch/${id}`)
    }
  }

  // ─── Derived state ─────────────────────────────────────────────────────

  const hasInstances = instances && instances.length > 0
  const isLoading = instances === undefined

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Agents
          </h1>
          {hasInstances && (
            <p className="mt-1 text-sm text-muted-foreground">
              {instances.length} agent{instances.length !== 1 ? "s" : ""} deployed
            </p>
          )}
        </div>
        <Button
          onClick={() => setDeployOpen(true)}
          className="bg-claw-red text-white hover:bg-claw-red/90 gap-1.5"
          size="sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Deploy Agent
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full animate-spin border-2 border-claw-red/20 border-t-claw-red" />
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Loading agents…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasInstances && (
        <div className={cn(
          "flex flex-col items-center justify-center py-24 px-8 text-center",
          "border border-dashed border-border/50 rounded-2xl",
          "bg-card/20 backdrop-blur-sm",
        )}>
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/50">
            <Server className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            No agents deployed
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
            Deploy an OpenClaw AI agent to the cloud in under 60 seconds.
          </p>
          <Button
            size="lg"
            className="bg-claw-red hover:bg-claw-red/90 text-white gap-2"
            onClick={() => setDeployOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Deploy your first agent
          </Button>
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

      {/* Deploy Modal */}
      <DeployModal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        onDeploy={handleDeploy}
      />
    </div>
  )
}
