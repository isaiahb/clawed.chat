import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Search, Glasses, MessageSquare } from "lucide-react";

// Inline claw SVG for the 404 page
function ClawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-16 -16 32 32" fill="none" className={className}>
      {/* Bottom jaw */}
      <path
        d="M-10 2 C-10 2,-6 8,2 10 C6 11,12 8,14 4 C14 4,10 6,6 5 C2 4,-4 2,-10 2Z"
        fill="#8B0000"
        stroke="#aa0000"
        strokeWidth="0.5"
      />
      {/* Top jaw — animated chomp */}
      <path
        d="M-10 -1 C-10 -1,-6 -8,2 -10 C6 -11,12 -6,14 -2 C14 -2,10 -5,6 -4 C2 -3,-4 -1,-10 -1Z"
        fill="#cc0000"
        stroke="#ee2222"
        strokeWidth="0.5"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 -10 0;-10 -10 0;0 -10 0"
          dur="1.8s"
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
        d="M-6 -5 C-4 -7,2 -8,6 -6"
        fill="none"
        stroke="#ff4444"
        strokeWidth="0.4"
        opacity="0.5"
      />
    </svg>
  );
}

const suggestions = [
  {
    label: "Home",
    description: "Back to the landing page",
    href: "/",
    icon: Home,
  },
  {
    label: "How it works",
    description: "Learn about Clawed",
    href: "/how-it-works",
    icon: Search,
  },
  {
    label: "Glasses experience",
    description: "See the smart glasses in action",
    href: "/glasses",
    icon: Glasses,
  },
  {
    label: "Open the app",
    description: "Go to your dashboard",
    href: "/app",
    icon: MessageSquare,
  },
];

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background red glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-claw-red/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] h-[200px] w-[300px] rounded-full bg-claw-red/[0.03] blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-2xl text-center">
        {/* Animated claw illustration */}
        <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center">
          {/* Outer pulsing ring — red */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-claw-red/15 animate-spin-slow" />

          {/* Middle ring */}
          <div className="absolute inset-4 rounded-full border border-claw-red/10 animate-[spin-slow_15s_linear_infinite_reverse]" />

          {/* Inner glow — red pulse */}
          <div className="absolute inset-8 rounded-full bg-claw-red/[0.08] animate-pulse" />

          {/* Red glow behind the claw */}
          <div className="absolute inset-6 rounded-full blur-xl bg-claw-red/10 animate-pulse-subtle" />

          {/* Center claw icon */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-claw-red/15 border border-claw-red/25 glow-red animate-float-slow">
            <ClawIcon className="h-12 w-12" />
          </div>

          {/* Floating ember particles */}
          <div className="absolute top-2 right-5 h-2 w-2 rounded-full bg-claw-red/50 animate-[float-1_4s_ease-in-out_infinite]" />
          <div className="absolute bottom-5 left-3 h-1.5 w-1.5 rounded-full bg-claw-ember/40 animate-[float-2_5s_ease-in-out_infinite]" />
          <div className="absolute top-12 left-1 h-1 w-1 rounded-full bg-claw-red-bright/30 animate-[float-3_3.5s_ease-in-out_infinite]" />
          <div className="absolute bottom-3 right-8 h-1 w-1 rounded-full bg-claw-red/25 animate-[float-1_6s_ease-in-out_infinite]" />
        </div>

        {/* Error text */}
        <p className="text-sm font-semibold uppercase tracking-[0.25em] mb-3 text-claw-red/70">
          Page not found
        </p>
        <h1
          className="text-7xl font-black tracking-tighter sm:text-9xl"
          style={{
            background:
              "linear-gradient(180deg, #ff2200 0%, #cc0000 40%, #440000 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 30px rgba(204,0,0,0.3))",
          }}
        >
          404
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
          The page at{" "}
          <code className="rounded bg-claw-red/10 border border-claw-red/15 px-1.5 py-0.5 text-sm font-mono text-claw-red-bright">
            {location.pathname}
          </code>{" "}
          doesn't exist or has been moved.
        </p>

        {/* Primary actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="gap-2 px-7 bg-claw-red hover:bg-claw-red-bright text-white font-semibold glow-red-sm transition-all hover:scale-105 active:scale-95"
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 px-7 border-claw-red/25 text-foreground hover:bg-claw-red/10 hover:border-claw-red/40 transition-all"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>

        {/* Suggestions */}
        <div className="mt-14">
          <p className="text-sm font-medium text-muted-foreground mb-5">
            Maybe you were looking for one of these?
          </p>
          <div className="grid gap-3 sm:grid-cols-2 text-left">
            {suggestions.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group flex items-start gap-3 rounded-lg border border-claw-red/10 bg-claw-charcoal/30 p-4 transition-all hover:shadow-lg hover:shadow-claw-red/5 hover:border-claw-red/25 hover:bg-claw-red/5 hover-lift"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-claw-red/10 text-claw-red group-hover:bg-claw-red group-hover:text-white transition-colors">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium group-hover:text-claw-red-bright transition-colors">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom CSS keyframes */}
        <style>{`
          @keyframes float-1 {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.6; }
            50% { transform: translateY(-10px) translateX(5px); opacity: 1; }
          }
          @keyframes float-2 {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
            50% { transform: translateY(8px) translateX(-6px); opacity: 0.8; }
          }
          @keyframes float-3 {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
            50% { transform: translateY(-6px) translateX(-4px); opacity: 0.7; }
          }
        `}</style>
      </div>
    </div>
  );
}
