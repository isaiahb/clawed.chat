import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  ArrowRight,
  Github,
  Twitter,
  Sun,
  Moon,
  ArrowUpRight,
  Zap,
  Mail,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";

const navItems = [
  { label: "Glasses", href: "/glasses" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

// ── Claw Logo SVG ──
function ClawLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-18 -18 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      <rect
        x={-18}
        y={-18}
        width={36}
        height={36}
        rx={8}
        className="fill-[oklch(0.10_0.004_260)] dark:fill-[oklch(0.10_0.004_260)]"
      />
      <g transform="scale(0.85)">
        {/* Bottom jaw */}
        <path
          d="M-10 2 C-10 2, -6 8, 2 10 C6 11, 12 8, 14 4 C14 4, 10 6, 6 5 C2 4, -4 2, -10 2Z"
          fill="#8B0000"
          stroke="#aa0000"
          strokeWidth="0.5"
        />
        {/* Top jaw */}
        <path
          d="M-10 -1 C-10 -1, -6 -8, 2 -10 C6 -11, 12 -6, 14 -2 C14 -2, 10 -5, 6 -4 C2 -3, -4 -1, -10 -1Z"
          fill="#cc0000"
          stroke="#ee2222"
          strokeWidth="0.5"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 -10 0;-8 -10 0;0 -10 0"
            dur="1.5s"
            repeatCount="indefinite"
            keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
            calcMode="spline"
          />
        </path>
        {/* Joint */}
        <circle
          cx={-10}
          cy={0.5}
          r={3}
          fill="#550000"
          stroke="#770000"
          strokeWidth="0.5"
        />
        {/* Highlight */}
        <path
          d="M-6 -5 C-4 -7, 2 -8, 6 -6"
          fill="none"
          stroke="#ff4444"
          strokeWidth="0.4"
          opacity="0.5"
        />
      </g>
    </svg>
  );
}

function NavLinks({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const location = useLocation();

  return (
    <nav className={className}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClick}
            className={cn(
              "text-[13px] font-medium transition-colors relative",
              isActive
                ? "text-foreground"
                : "text-neutral-500 hover:text-foreground",
            )}
          >
            {item.label}
            {isActive && (
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-claw-red/50" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function HeaderThemeToggle() {
  const { theme, setTheme } = useAppStore();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      (typeof window !== "undefined"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : true));

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[oklch(0.28_0.006_260)] bg-transparent transition-all hover:border-[oklch(0.35_0.008_260)] hover:bg-[oklch(0.18_0.004_260)] active:scale-90"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 text-neutral-400" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-neutral-500" />
      )}
    </button>
  );
}

function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[oklch(0.22_0.005_260/0.5)] bg-background/85 backdrop-blur-2xl transition-theme">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5">
          <ClawLogo className="transition-transform group-hover:scale-110 group-hover:rotate-[-5deg]" />
          <span className="text-lg font-black tracking-tight text-gradient-red">
            Clawed
          </span>
        </Link>

        {/* Desktop nav */}
        <NavLinks className="hidden items-center gap-8 md:flex" />

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <HeaderThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-neutral-500 hover:text-foreground text-[13px] font-medium"
          >
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="gap-1.5 bg-claw-red hover:bg-claw-red-bright text-white font-semibold transition-all text-[13px] rounded-lg shadow-sm shadow-claw-red/10 hover:shadow-claw-red/20"
          >
            <Link to="/sign-in">
              Deploy agent
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[300px] sm:w-[360px] bg-background border-[oklch(0.22_0.005_260)]"
          >
            <div className="flex flex-col gap-6 pt-6">
              <div className="flex items-center justify-between">
                <Link
                  to="/"
                  className="flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <ClawLogo />
                  <span className="text-lg font-black text-gradient-red">
                    Clawed
                  </span>
                </Link>
              </div>

              <div className="h-px bg-[oklch(0.22_0.005_260)]" />

              <NavLinks
                onClick={() => setMobileOpen(false)}
                className="flex flex-col gap-5"
              />

              <div className="h-px bg-[oklch(0.22_0.005_260)]" />

              {/* Theme toggle in mobile */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500 font-medium">
                  Theme
                </span>
                <HeaderThemeToggle />
              </div>

              <div className="h-px bg-[oklch(0.22_0.005_260)]" />

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  asChild
                  className="border-[oklch(0.26_0.006_260)] hover:bg-[oklch(0.16_0.004_260)] hover:border-[oklch(0.30_0.008_260)] font-medium rounded-lg"
                >
                  <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-claw-red hover:bg-claw-red-bright text-white font-semibold gap-1.5 shadow-sm shadow-claw-red/10 rounded-lg"
                >
                  <Link to="/sign-in" onClick={() => setMobileOpen(false)}>
                    Deploy agent
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

// ── Footer ──
// Clean, modern dark grey footer with 4-column layout and polished CTA

function SiteFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Smart Glasses", href: "/glasses" },
      { label: "Pricing", href: "/pricing" },
      { label: "Documentation", href: "/docs" },
      { label: "Changelog", href: "/docs" },
    ],
    Company: [
      { label: "About", href: "/docs" },
      { label: "Blog", href: "/docs" },
      { label: "Careers", href: "/docs" },
    ],
    Resources: [
      {
        label: "OpenClaw GitHub",
        href: "https://github.com/openclaw/openclaw",
        external: true,
      },
      { label: "API Reference", href: "/docs" },
      { label: "Status", href: "/docs" },
    ],
  };

  return (
    <footer className="relative border-t border-[oklch(0.20_0.005_260/0.6)] bg-[oklch(0.10_0.003_260)] transition-theme">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-claw-red/15 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Newsletter / CTA strip */}
        <div className="py-10 sm:py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[oklch(0.18_0.005_260)]">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-claw-red/8 border border-claw-red/10">
              <Zap className="h-4.5 w-4.5 text-claw-red" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">
                Deploy your first agent today
              </p>
              <p className="mt-0.5 text-[13px] text-neutral-500">
                Free tier available. No credit card required.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              asChild
              className="gap-1.5 bg-claw-red hover:bg-claw-red-bright text-white font-semibold text-[13px] rounded-lg shadow-sm shadow-claw-red/10 hover:shadow-claw-red/20 h-9 px-5"
            >
              <Link to="/sign-in">
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              asChild
              className="gap-1.5 border-[oklch(0.26_0.006_260)] hover:border-[oklch(0.32_0.008_260)] hover:bg-[oklch(0.14_0.004_260)] text-neutral-400 text-[13px] rounded-lg h-9 px-4"
            >
              <Link to="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12 py-12 sm:py-14">
          {/* Brand column — spans 2 on mobile, 1 on lg */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <ClawLogo className="h-7 w-7" />
              <span className="text-base font-black text-gradient-red">
                Clawed
              </span>
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded border border-claw-red/20 text-claw-red/70 font-bold uppercase tracking-widest">
                Beta
              </span>
            </div>
            <p className="text-[13px] text-neutral-500 leading-relaxed max-w-xs mb-6">
              Deploy your AI agent in 30 seconds. Watch it work. Talk to it on
              smart glasses. Built on OpenClaw.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-1.5">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[oklch(0.22_0.005_260)] bg-[oklch(0.13_0.004_260)] text-neutral-500 transition-all hover:border-[oklch(0.30_0.008_260)] hover:text-neutral-300 hover:bg-[oklch(0.16_0.004_260)]"
              >
                <Github className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[oklch(0.22_0.005_260)] bg-[oklch(0.13_0.004_260)] text-neutral-500 transition-all hover:border-[oklch(0.30_0.008_260)] hover:text-neutral-300 hover:bg-[oklch(0.16_0.004_260)]"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="mailto:hello@clawed.chat"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[oklch(0.22_0.005_260)] bg-[oklch(0.13_0.004_260)] text-neutral-500 transition-all hover:border-[oklch(0.30_0.008_260)] hover:text-neutral-300 hover:bg-[oklch(0.16_0.004_260)]"
              >
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Link sections */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-4">
                {title}
              </h4>
              <nav className="flex flex-col gap-2.5">
                {links.map((link) =>
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-neutral-500 transition-colors hover:text-foreground flex items-center gap-1.5 group w-fit"
                    >
                      {link.label}
                      <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="text-[13px] text-neutral-500 transition-colors hover:text-foreground flex items-center gap-1.5 group w-fit"
                    >
                      {link.label}
                      <ArrowUpRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </Link>
                  ),
                )}
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[oklch(0.18_0.005_260)] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-neutral-600">
              &copy; {currentYear} Clawed Chat
            </p>
            <span className="text-neutral-700">·</span>
            <p className="text-[11px] text-neutral-600">
              Powered by{" "}
              <a
                href="https://github.com/openclaw/openclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-500 hover:text-claw-red transition-colors"
              >
                OpenClaw
              </a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/docs"
              className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/docs"
              className="text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Terms
            </Link>
            <span className="text-[13px] leading-none">🦞</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background transition-theme">
      <SiteHeader />
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
