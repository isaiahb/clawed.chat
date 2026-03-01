import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";

function ClawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-16 -16 32 32" fill="none" className={className}>
      <path
        d="M-10 2 C-10 2,-6 8,2 10 C6 11,12 8,14 4 C14 4,10 6,6 5 C2 4,-4 2,-10 2Z"
        fill="#8B0000"
        stroke="#aa0000"
        strokeWidth="0.5"
      />
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
      <circle
        cx={-10}
        cy={0.5}
        r={3}
        fill="#550000"
        stroke="#770000"
        strokeWidth="0.5"
      />
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

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mx-auto max-w-md text-center">
        {/* Claw icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center border border-border bg-card">
          <ClawIcon className="h-14 w-14" />
        </div>

        {/* Error text */}
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-claw-red mb-2">
          Page not found
        </p>
        <h1
          className="text-7xl font-black tracking-tighter"
          style={{
            background:
              "linear-gradient(180deg, #ff2200 0%, #cc0000 40%, #440000 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          404
        </h1>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          The path{" "}
          <code className="border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
            {location.pathname}
          </code>{" "}
          doesn't exist.
        </p>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild className="gap-2">
            <Link to="/app">
              <MessageSquare className="h-4 w-4" />
              Go to Chat
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>

        {/* Lobster hint */}
        <p className="mt-12 text-[11px] text-muted-foreground/50">
          The crustacean looked everywhere. Nothing here.
        </p>
      </div>
    </div>
  );
}
