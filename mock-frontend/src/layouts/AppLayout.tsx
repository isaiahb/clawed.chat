import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Inbox,
  MessageSquare,
  ShieldCheck,
  Clock,
  Plug,
  Glasses,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Command,
  Search,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
  LogOut,
  User,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { CommandBar } from "@/components/shared/CommandBar";

const navItems = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Inbox", href: "/app/inbox", icon: Inbox, badge: 3 },
  { label: "Ask", href: "/app/ask", icon: MessageSquare },
  { label: "Approvals", href: "/app/approvals", icon: ShieldCheck, badge: 5 },
  { label: "Timeline", href: "/app/timeline", icon: Clock },
  { label: "Connections", href: "/app/connections", icon: Plug },
  { label: "Devices", href: "/app/devices", icon: Glasses },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

const safetyModeConfig = {
  "read-only": {
    label: "Read Only",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: "🔒",
  },
  "draft-first": {
    label: "Draft First",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: "📝",
  },
  assisted: {
    label: "Assisted",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: "⚡",
  },
};

export default function AppLayout() {
  const location = useLocation();
  const {
    sidebarOpen,
    toggleSidebar,
    commandBarOpen,
    setCommandBarOpen,
    theme,
    setTheme,
    safetyMode,
    setSafetyMode,
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
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  const modeConfig = safetyModeConfig[safetyMode];
  const collapsed = !sidebarOpen && !isMobile;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "flex flex-col border-r border-claw-red/10 bg-claw-black transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
          isMobile && !sidebarOpen && "-translate-x-full absolute z-50 h-full",
          isMobile && sidebarOpen && "absolute z-50 h-full w-64",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-claw-red/10 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-claw-red/15 border border-claw-red/20 shrink-0 glow-red-sm">
                <svg viewBox="-14 -14 28 28" className="h-5 w-5">
                  <path
                    d="M-8 1.5 C-8 1.5,-5 6,1.5 7.5 C5 8,9 6,10.5 3 C10.5 3,7.5 4.5,4.5 3.5 C1.5 2.5,-3 1.5,-8 1.5Z"
                    fill="#8B0000"
                  />
                  <path
                    d="M-8 -0.5 C-8 -0.5,-5 -6,1.5 -7.5 C5 -8,9 -4.5,10.5 -1.5 C10.5 -1.5,7.5 -3.5,4.5 -3 C1.5 -2,-3 -0.5,-8 -0.5Z"
                    fill="#cc0000"
                  />
                  <circle cx="-8" cy="0.5" r="2.2" fill="#550000" />
                </svg>
              </div>
              <span
                className="font-extrabold text-foreground truncate tracking-tight"
                style={{
                  background:
                    "linear-gradient(135deg, #ff2200, #cc0000, #880000)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Clawed
              </span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-claw-red/15 border border-claw-red/20 mx-auto glow-red-sm">
              <svg viewBox="-14 -14 28 28" className="h-5 w-5">
                <path
                  d="M-8 1.5 C-8 1.5,-5 6,1.5 7.5 C5 8,9 6,10.5 3 C10.5 3,7.5 4.5,4.5 3.5 C1.5 2.5,-3 1.5,-8 1.5Z"
                  fill="#8B0000"
                />
                <path
                  d="M-8 -0.5 C-8 -0.5,-5 -6,1.5 -7.5 C5 -8,9 -4.5,10.5 -1.5 C10.5 -1.5,7.5 -3.5,4.5 -3 C1.5 -2,-3 -0.5,-8 -0.5Z"
                  fill="#cc0000"
                />
                <circle cx="-8" cy="0.5" r="2.2" fill="#550000" />
              </svg>
            </div>
          )}
        </div>

        {/* Safety Mode Indicator */}
        <div className="px-3 py-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex h-8 w-8 mx-auto items-center justify-center rounded-md text-xs cursor-pointer",
                    modeConfig.color,
                  )}
                >
                  {modeConfig.icon}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Mode: {modeConfig.label}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80",
                    modeConfig.color,
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{modeConfig.label}</span>
                  <ChevronDown className="ml-auto h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Safety Mode
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(
                  Object.entries(safetyModeConfig) as [
                    typeof safetyMode,
                    (typeof safetyModeConfig)[typeof safetyMode],
                  ][]
                ).map(([key, config]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSafetyMode(key)}
                    className={cn("gap-2", safetyMode === key && "bg-accent")}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/app"
                  ? location.pathname === "/app"
                  : location.pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.href}
                          className={cn(
                            "flex h-9 w-9 mx-auto items-center justify-center rounded-md transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="flex items-center gap-2"
                      >
                        {item.label}
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[10px]"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <NavLink
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 px-1.5 text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border px-3 py-3 space-y-2">
          {/* Command bar trigger */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 mx-auto"
                  onClick={() => setCommandBarOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Search (⌘K)</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground h-9 text-xs"
              onClick={() => setCommandBarOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </Button>
          )}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-2 rounded-md w-full transition-colors hover:bg-accent/50 p-1.5",
                  collapsed && "justify-center",
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    P
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      Parth
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      parth@example.com
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsed ? "center" : "end"}
              side="top"
              className="w-48"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Parth</p>
                  <p className="text-xs text-muted-foreground">
                    parth@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/app/settings" className="gap-2 cursor-pointer">
                  <User className="h-3.5 w-3.5" />
                  Profile & Settings
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setTheme("light")}
                className={cn("gap-2", theme === "light" && "bg-accent")}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("dark")}
                className={cn("gap-2", theme === "dark" && "bg-accent")}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme("system")}
                className={cn("gap-2", theme === "system" && "bg-accent")}
              >
                <Monitor className="h-3.5 w-3.5" />
                System
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={toggleSidebar}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-claw-red/10 bg-claw-black/90 backdrop-blur-sm px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Breadcrumb / Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate capitalize">
              {location.pathname.split("/").pop()?.replace(/-/g, " ") ||
                "Dashboard"}
            </h1>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                modeConfig.color,
              )}
            >
              <span>{modeConfig.icon}</span>
              <span>{modeConfig.label}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Command Bar ── */}
      <CommandBar open={commandBarOpen} onOpenChange={setCommandBarOpen} />
    </div>
  );
}
