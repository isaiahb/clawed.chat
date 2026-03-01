import { SignIn as ClerkSignIn } from "@clerk/clerk-react";
import { cn } from "../lib/utils";

// ── Claw Logo SVG — sharp, matches AppLayout ──
function ClawLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-14 -14 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-10 w-10", className)}
    >
      <path
        d="M-8 1.5 C-8 1.5,-5 6,1.5 7.5 C5 8,9 6,10.5 3 C10.5 3,7.5 4.5,4.5 3.5 C1.5 2.5,-3 1.5,-8 1.5Z"
        fill="#8B0000"
        stroke="#aa0000"
        strokeWidth="0.4"
      />
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
      <circle
        cx={-8}
        cy={0.5}
        r={2.2}
        fill="#550000"
        stroke="#770000"
        strokeWidth="0.4"
      />
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

export default function SignIn() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 bg-background">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-claw-red/[0.04] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 h-[300px] w-[300px] bg-claw-red/[0.02] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8 animate-page-enter">
        {/* Logo + Title */}
        <div className="flex flex-col items-center text-center">
          <ClawLogo />
          <h1
            className="mt-4 text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(135deg, #ff2200, #cc0000, #880000)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Clawed
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        {/* Login card */}
        <div className="flex justify-center">
          <ClerkSignIn />
        </div>
      </div>
    </div>
  );
}
