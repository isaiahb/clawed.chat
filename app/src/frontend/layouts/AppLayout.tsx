import { useState, useEffect } from "react"
import {
  NavLink,
  Outlet,
  useLocation,
  Link,
} from "react-router-dom"
import {
  Server,
  Plug,
  Settings,
  Search,
  Command,
  Glasses,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { UserButton } from "@clerk/clerk-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip"
import { useAppStore } from "../stores/app-store"
import { cn } from "../lib/utils"
import { CommandBar } from "../components/shared/CommandBar"

// ── Claw Logo SVG — sharp, no rounded corners ──
function ClawLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-14 -14 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7", className)}
    >
      {/* Bottom jaw */}
      <path
        d="M-8 1.5 C-8 1.5,-5 6,1.5 7.5 C5 8,9 6,10.5 3 C10.5 3,7.5 4.5,4.5 3.5 C1.5 2.5,-3 1.5,-8 1.5Z"
        fill="#8B0000"
        stroke="#aa0000"
        strokeWidth="0.4"
      />
      {/* Top jaw */}
      <path
        d="M-8 -0.5 C-8 -0.5,-5 -6,1.5 -7.5 C5 -8,9 -4.5,10.5 -1.5 C10.5 -1.5,7.5 -3.5,4.5 -3 C1.5 -2,-3 -0.5,-8 -0.5Z"
        fill="#cc0000"
        stroke="#ee2222"
        strokeWidth="0.4"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 -8 0;-6 -8 0;0 -8 0"
          dur="1.8s"
          repeatCount="indefinite"
          keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
          calcMode="spline"
        />
      </path>
      {/* Joint */}
      <circle
        cx={-8}
        cy={0.5}
        r={2.2}
        fill="#550000"
        stroke="#770000"
        strokeWidth="0.4"
      />
      {/* Highlight */}
      <path
        d="M-5 -4 C-3 -6, 2 -7, 5 -5"
        fill="none"
        stroke="#ff4444"
        strokeWidth="0.3"
        opacity="0.4"
      />
    </svg>
  )
}

// ── Glasses Connection Pill ──
function GlassesStatusPill() {
  // TODO: wire to real useMentraAuth() — for now detect via a simple check
  // import { useMentraAuth } from "@mentra/react"
  // const mentra = useMentraAuth()
  // const isConnected = mentra.isAuthenticated
  const isConnected = false

  return (
    <div
      className={cn(
        "status-pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] border transition-all",
        isConnected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-border/50 bg-muted/30 text-muted-foreground",
      )}
    >
      <Glasses className="h-3 w-3" />
      {isConnected ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          Glasses Connected
        </>
      ) : (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
          Glasses Offline
        </>
      )}
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const {
    commandBarOpen,
    setCommandBarOpen,
    theme,
  } = useAppStore()

  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K for command bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCommandBarOpen(!commandBarOpen)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [commandBarOpen, setCommandBarOpen])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "light")
    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "light") {
      root.classList.add("light")
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches
      root.classList.toggle("dark", prefersDark)
      root.classList.toggle("light", !prefersDark)
    }
  }, [theme])

  // Nav items
  const navItems = [
    { path: "/app/agents", label: "Agents", icon: Server },
    { path: "/app/connections", label: "Connections", icon: Plug },
    { path: "/app/settings", label: "Settings", icon: Settings },
  ]

  // Nav link helper
  const navLinkClass = (path: string) => {
    const isActive = location.pathname.startsWith(path)
      || (path === "/app/agents" && (location.pathname === "/app" || location.pathname === "/app/"))

    return cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.04em] border transition-all duration-200 backdrop-blur-sm",
      isActive
        ? "border-foreground/30 bg-foreground text-background shadow-sm"
        : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
    )
  }

  // Is the current page a chat page? If so, hide nav chrome for immersion
  const isChatPage = location.pathname.startsWith("/app/chat/")

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top Navigation Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-xl backdrop-saturate-[1.4] px-4 shadow-[0_1px_3px_oklch(0_0_0/0.04)]">
        {/* Left — Logo */}
        <Link to="/app/agents" className="group flex items-center gap-2">
          <ClawLogo className="transition-transform group-hover:scale-105" />
          <span
            className="text-sm font-black tracking-tight hidden sm:inline"
            style={{
              background: "linear-gradient(135deg, #ff2200, #cc0000, #880000)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Clawed
          </span>
        </Link>

        {/* Center — Glasses Status Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2">
          <GlassesStatusPill />
        </div>

        {/* Right — Nav links + Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile glasses status */}
          <div className="sm:hidden">
            <GlassesStatusPill />
          </div>

          {/* Desktop nav links — hide on chat pages for cleaner look */}
          {!isMobile && !isChatPage && navItems.map((item) => (
            <NavLink key={item.path} to={item.path} className={navLinkClass(item.path)}>
              <item.icon className="h-3 w-3" />
              {item.label}
            </NavLink>
          ))}

          {/* On chat pages, show a compact agents link */}
          {!isMobile && isChatPage && (
            <NavLink to="/app/agents" className={navLinkClass("/app/agents")}>
              <Server className="h-3 w-3" />
              Agents
            </NavLink>
          )}

          {/* Search trigger */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setCommandBarOpen(true)}
              >
                <Search className="h-3.5 w-3.5 transition-transform duration-150" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span className="flex items-center gap-1.5">
                Search
                <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-border/50 bg-muted/60 backdrop-blur-sm px-1 font-mono text-[10px]">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </span>
            </TooltipContent>
          </Tooltip>

          {/* Mobile nav icons */}
          {isMobile && !isChatPage && navItems.map((item) => (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-200",
                    (location.pathname.startsWith(item.path) || (item.path === "/app/agents" && location.pathname === "/app"))
                      ? "border-foreground/30 bg-foreground text-background shadow-sm"
                      : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Account menu managed by Clerk */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8 rounded-lg border border-border/50 shadow-sm transition-transform hover:scale-105",
              },
            }}
          />
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <Outlet />
      </main>

      {/* ── Command Bar ── */}
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  )
}
