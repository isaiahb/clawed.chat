import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mail, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    // Simulate auth — replace with real auth later
    setTimeout(() => {
      setLoading(false);
      navigate("/app");
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

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
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 backdrop-blur-sm px-3 py-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => {
                    // Forgot password flow — stub for now
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {/* Login button */}
            <Button
              className="w-full gap-2 bg-claw-red hover:bg-claw-red-bright text-white shadow-md hover:shadow-lg hover:shadow-claw-red/20 transition-all"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground/60 pt-1">
              Press{" "}
              <kbd className="inline-flex h-4 items-center rounded border border-border/50 bg-muted/60 backdrop-blur-sm px-1 font-mono text-[9px]">
                Enter
              </kbd>{" "}
              to sign in
            </p>
          </CardContent>
        </Card>

        {/* Sign up link */}
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-semibold text-foreground hover:text-claw-red transition-colors underline underline-offset-3 decoration-foreground/30 hover:decoration-claw-red/50"
            onClick={() => {
              // Sign up flow — stub for now
            }}
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
