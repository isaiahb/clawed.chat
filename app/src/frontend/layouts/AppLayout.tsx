import { useState, useEffect } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  Link,
  useNavigate,
} from "react-router-dom";
import {
  MessageSquare,
  Plug,
  Settings,
  Sun,
  Monitor,
  ChevronDown,
  LogOut,
  User,
  Search,
  Command,
  Loader2,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { UserButton } from "@clerk/clerk-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { useAppStore } from "../stores/app-store";
import { cn } from "../lib/utils";
import { CommandBar } from "../components/shared/CommandBar";
import type { ActionIndicatorPhase } from "../types";

// ── Agent status config ──
const agentStatusConfig = {
  live: {
    label: "Agent Live",
    dotClass: "bg-emerald-500",
    pillClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  idle: {
    label: "Agent Idle",
    dotClass: "bg-gray-400",
    pillClass: "border-border bg-muted text-muted-foreground",
  },
  provisioning: {
    label: "Provisioning",
    dotClass: "bg-amber-500 animate-pulse",
    pillClass: "border-amber-300 bg-amber-50 text-amber-700",
  },
  offline: {
    label: "Agent Offline",
    dotClass: "bg-gray-300",
    pillClass: "border-border bg-muted text-muted-foreground",
  },
  error: {
    label: "Agent Error",
    dotClass: "bg-red-500",
    pillClass: "border-red-300 bg-red-50 text-red-700",
  },
} as const;

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
  );
}

// ── Agent Status Pill ──
function AgentStatusPill() {
  const { agentStatus, setAgentStatus } = useAppStore();
  const config = agentStatusConfig[agentStatus];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "status-pill inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] border cursor-pointer transition-all hover:opacity-80",
            config.pillClass,
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dotClass)}
          />
          {config.label}
          <ChevronDown className="h-3 w-3 opacity-50 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-44">
        <DropdownMenuLabel className="text-xs">Agent Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(
          Object.entries(agentStatusConfig) as [
            keyof typeof agentStatusConfig,
            (typeof agentStatusConfig)[keyof typeof agentStatusConfig],
          ][]
        ).map(([key, cfg]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setAgentStatus(key)}
            className={cn("gap-2 text-xs", agentStatus === key && "bg-accent")}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
            {cfg.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Top Bar Action Indicator Pill ──
// Shows what the assistant is doing, persistent in top bar next to agent status
function ActionIndicatorPill() {
  const { actionIndicatorPhase, actionIndicatorLabel } = useAppStore();

  if (actionIndicatorPhase === "idle") return null;

  const phaseConfig: Record<
    ActionIndicatorPhase,
    { icon: React.ReactNode; pillClass: string }
  > = {
    idle: { icon: null, pillClass: "" },
    thinking: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      pillClass: "border-amber-300 bg-amber-50 text-amber-700",
    },
    acting: {
      icon: <Zap className="h-3 w-3 animate-pulse" />,
      pillClass: "border-claw-red/30 bg-red-50 text-claw-red",
    },
    done: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      pillClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
    },
    error: {
      icon: <AlertTriangle className="h-3 w-3" />,
      pillClass: "border-red-300 bg-red-50 text-red-700",
    },
  };

  const config = phaseConfig[actionIndicatorPhase] ?? phaseConfig.thinking;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold tracking-[0.03em] border transition-all",
        config.pillClass,
      )}
    >
      {config.icon}
      <span className="max-w-[120px] truncate">{actionIndicatorLabel}</span>
    </div>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    commandBarOpen,
    setCommandBarOpen,
    theme,
    setTheme,
    accountName,
    accountEmail,
  } = useAppStore();

  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K for command bar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandBarOpen(!commandBarOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandBarOpen, setCommandBarOpen]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }
  }, [theme]);

  // Nav link helper
  const navLinkClass = (path: string) => {
    const isActive =
      path === "/app"
        ? location.pathname === "/app" || location.pathname === "/app/"
        : path === "/app/connections"
          ? location.pathname.startsWith("/app/connections")
          : path === "/app/settings"
            ? location.pathname.startsWith("/app/settings")
            : false;

    return cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.04em] border transition-all duration-200 backdrop-blur-sm",
      isActive
        ? "border-foreground/30 bg-foreground text-background shadow-sm"
        : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ── Top Navigation Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border/50 bg-card/60 backdrop-blur-xl backdrop-saturate-[1.4] px-4 shadow-[0_1px_3px_oklch(0_0_0/0.04)]">
        {/* Left — Logo */}
        <Link to="/app" className="group flex items-center gap-2">
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

        {/* Center — Agent Status Pill + Action Indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2">
          <AgentStatusPill />
          <ActionIndicatorPill />
        </div>

        {/* Right — Nav links + Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile agent status */}
          <div className="sm:hidden">
            <AgentStatusPill />
          </div>

          {/* Chat link */}
          {!isMobile && (
            <NavLink to="/app" className={navLinkClass("/app")}>
              <MessageSquare className="h-3 w-3" />
              Chat
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

          {/* Connections link */}
          {!isMobile && (
            <NavLink
              to="/app/connections"
              className={navLinkClass("/app/connections")}
            >
              <Plug className="h-3 w-3" />
              Connections
            </NavLink>
          )}

          {/* Settings link */}
          {!isMobile && (
            <NavLink
              to="/app/settings"
              className={navLinkClass("/app/settings")}
            >
              <Settings className="h-3 w-3" />
              Settings
            </NavLink>
          )}

          {/* Mobile nav icons */}
          {isMobile && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/app"
                    end
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-200",
                      location.pathname === "/app" ||
                        location.pathname === "/app/"
                        ? "border-foreground/30 bg-foreground text-background shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent>Chat</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/app/connections"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-200",
                      location.pathname.startsWith("/app/connections")
                        ? "border-foreground/30 bg-foreground text-background shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
                    )}
                  >
                    <Plug className="h-3.5 w-3.5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent>Connections</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/app/settings"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border backdrop-blur-sm transition-all duration-200",
                      location.pathname.startsWith("/app/settings")
                        ? "border-foreground/30 bg-foreground text-background shadow-sm"
                        : "border-border/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/40 active:translate-y-px",
                    )}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </>
          )}

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
  );
}
