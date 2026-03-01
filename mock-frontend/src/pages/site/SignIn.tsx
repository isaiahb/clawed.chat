import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Progress } from "@/components/ui/progress";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Glasses,
  MessageSquare,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Shield,
  CheckCircle2,
  Sparkles,
  Github,
  Chrome,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { SafetyMode } from "@/types";

// ──────────────────────────────────────────────
// Onboarding steps configuration
// ──────────────────────────────────────────────

const safetyModes: {
  mode: SafetyMode;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  recommended?: boolean;
}[] = [
  {
    mode: "read-only",
    label: "Read Only",
    description:
      "Assistant can read and summarize, but cannot send or change anything. Safest option.",
    icon: Shield,
    color:
      "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30",
  },
  {
    mode: "draft-first",
    label: "Draft First",
    description:
      "Assistant drafts messages and actions. You approve everything before it's sent.",
    icon: ShieldCheck,
    color:
      "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
    recommended: true,
  },
  {
    mode: "assisted",
    label: "Assisted",
    description:
      "Low-risk actions run automatically. Sensitive actions still require your approval.",
    icon: ShieldAlert,
    color:
      "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30",
  },
];

const connectionOptions = [
  {
    id: "slack",
    name: "Slack",
    description: "Read and send messages",
    icon: MessageSquare,
    category: "chat",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Read, draft, and send emails",
    icon: Mail,
    category: "email",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "View and create events",
    icon: Calendar,
    category: "calendar",
  },
];

const demoActions = [
  {
    prompt: "What's my next meeting?",
    result: "Design Review in 45 min · Zoom · Jamie, Sam, Priya",
    action: "Prep notes",
    status: "Queued for approval",
  },
  {
    prompt: "Reply to Alex about the budget",
    result: 'Draft: "I\'ll review by EOD. Flagged 2 issues."',
    action: "Send reply",
    status: "Waiting for your approval",
  },
  {
    prompt: "Remember to follow up with Acme Corp",
    result: "Reminder set for tomorrow at 9 AM",
    action: null,
    status: "Done — saved",
  },
];

// ──────────────────────────────────────────────
// Sign In / Sign Up forms
// ──────────────────────────────────────────────

function AuthForms({ onAuthenticate }: { onAuthenticate: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Welcome to Clawed
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Personal assistant for people on the go
          </p>
        </div>

        {/* Auth card */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="sign-in" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">Sign in</TabsTrigger>
                <TabsTrigger value="sign-up">Create account</TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="sign-in" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={onAuthenticate}>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="sign-up" className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={onAuthenticate}>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TabsContent>
            </Tabs>

            {/* Social divider */}
            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                or continue with
              </span>
            </div>

            {/* Social buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={onAuthenticate}
              >
                <Github className="h-4 w-4" />
                GitHub
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={onAuthenticate}
              >
                <Chrome className="h-4 w-4" />
                Google
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <a href="/docs" className="underline hover:text-foreground">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/docs" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Onboarding Step 1: Choose Safety Mode
// ──────────────────────────────────────────────

function StepSafetyMode({
  selected,
  onSelect,
}: {
  selected: SafetyMode;
  onSelect: (mode: SafetyMode) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Choose your safety mode</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This controls how much the assistant can do on its own. You can change
          this anytime.
        </p>
      </div>

      <div className="space-y-3">
        {safetyModes.map((item) => {
          const Icon = item.icon;
          const isSelected = selected === item.mode;

          return (
            <button
              key={item.mode}
              onClick={() => onSelect(item.mode)}
              className={cn(
                "relative w-full rounded-xl border-2 p-4 text-left transition-all",
                "hover:shadow-sm",
                isSelected
                  ? cn(item.color, "ring-2 ring-primary/20")
                  : "border-border bg-card hover:border-muted-foreground/20",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    {item.recommended && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Onboarding Step 2: Connect services
// ──────────────────────────────────────────────

function StepConnections({
  connected,
  onToggle,
}: {
  connected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Connect your tools</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start with a chat channel, then add email and calendar. You can add
          more later.
        </p>
      </div>

      <div className="space-y-3">
        {connectionOptions.map((option) => {
          const Icon = option.icon;
          const isConnected = connected[option.id] ?? false;

          return (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 transition-all",
                isConnected
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-border",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  isConnected
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{option.name}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
              <Button
                variant={isConnected ? "outline" : "default"}
                size="sm"
                className={cn(
                  "shrink-0 gap-1.5",
                  isConnected &&
                    "text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
                )}
                onClick={() => onToggle(option.id)}
              >
                {isConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can connect additional services like Notion, Linear, and GitHub
        later in Settings.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Onboarding Step 3: Pair glasses (or skip)
// ──────────────────────────────────────────────

function StepDevices({
  paired,
  onPair,
}: {
  paired: boolean;
  onPair: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Pair your glasses</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connect smart glasses for a hands-free glanceable experience. You can
          skip this for now.
        </p>
      </div>

      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-8 transition-all",
          paired
            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
            : "border-border",
        )}
      >
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl",
            paired
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Glasses className="h-8 w-8" />
        </div>

        {paired ? (
          <>
            <div className="text-center">
              <p className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-4 w-4" />
                Glasses paired
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Simulated pairing with Meta Ray-Ban Stories
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="font-medium">No glasses detected</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Make sure your glasses are in pairing mode and nearby
              </p>
            </div>
            <Button onClick={onPair} className="gap-2">
              <Glasses className="h-4 w-4" />
              Simulate pairing
            </Button>
          </>
        )}
      </div>

      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Supported devices:</strong> Meta
          Ray-Ban Stories, Even Realities G1, and more coming soon. You can
          always pair devices later from the Devices page.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Onboarding Step 4: Interactive demo
// ──────────────────────────────────────────────

function StepDemo() {
  const [activeDemo, setActiveDemo] = useState(0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">How confirmations work</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everything important goes through you first. Here's how it works.
        </p>
      </div>

      <div className="space-y-3">
        {demoActions.map((demo, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDemo(idx)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-all",
              activeDemo === idx
                ? "border-primary/30 bg-primary/5 shadow-sm ring-1 ring-primary/10"
                : "border-border hover:border-muted-foreground/20",
            )}
          >
            {/* User prompt */}
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-3 w-3" />
              </div>
              <p className="text-sm font-medium">{demo.prompt}</p>
            </div>

            {/* Assistant result */}
            {activeDemo === idx && (
              <div className="mt-3 ml-7 space-y-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{demo.result}</p>
                </div>

                {demo.action && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1.5 pointer-events-none"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {demo.action}
                    </Button>
                    <Badge variant="secondary" className="text-[10px]">
                      {demo.status}
                    </Badge>
                  </div>
                )}

                {!demo.action && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {demo.status}
                  </Badge>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Nothing happens without your say.
          </span>{" "}
          Sensitive actions always require your explicit approval — sending
          messages to new people, making payments, deleting data, or posting
          publicly.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Onboarding Step 5: All done
// ──────────────────────────────────────────────

function StepComplete({ safetyMode }: { safetyMode: SafetyMode }) {
  const modeLabel =
    safetyModes.find((m) => m.mode === safetyMode)?.label ?? safetyMode;

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold">You're all set!</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your assistant is ready in <strong>{modeLabel}</strong> mode. Head to
          the inbox to see what needs attention, or ask your first question.
        </p>
      </div>

      <div className="mx-auto max-w-xs space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-medium">Try asking</p>
            <p className="text-xs text-muted-foreground">
              "What's in my inbox right now?"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
          <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-medium">Or try</p>
            <p className="text-xs text-muted-foreground">
              "What's my next meeting?"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Sign In / Onboarding Page
// ──────────────────────────────────────────────

const TOTAL_STEPS = 5;

export default function SignIn() {
  const navigate = useNavigate();
  const {
    safetyMode,
    setSafetyMode,
    setOnboardingComplete,
    setOnboardingStep,
    setGlassesConnected,
  } = useAppStore();

  const [authenticated, setAuthenticated] = useState(false);
  const [step, setStep] = useState(1);
  const [connectedServices, setConnectedServices] = useState<
    Record<string, boolean>
  >({});
  const [glassesPaired, setGlassesPaired] = useState(false);

  const handleAuthenticate = () => {
    setAuthenticated(true);
    setStep(1);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      setOnboardingStep(step + 1);
    } else {
      // Finish onboarding
      setOnboardingComplete(true);
      setGlassesConnected(glassesPaired);
      navigate("/app/inbox");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setOnboardingStep(step - 1);
    }
  };

  const handleToggleConnection = (id: string) => {
    setConnectedServices((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePairGlasses = () => {
    setGlassesPaired(true);
  };

  // Not authenticated yet — show sign-in / sign-up forms
  if (!authenticated) {
    return <AuthForms onAuthenticate={handleAuthenticate} />;
  }

  // Authenticated — show onboarding steps
  const progressPercent = (step / TOTAL_STEPS) * 100;

  const canProceed = (() => {
    switch (step) {
      case 1:
        return true; // safety mode always has a default
      case 2:
        return true; // connections are optional
      case 3:
        return true; // pairing is optional
      case 4:
        return true; // demo is informational
      case 5:
        return true;
      default:
        return true;
    }
  })();

  const stepLabels = [
    "Safety Mode",
    "Connections",
    "Devices",
    "How it works",
    "Ready",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Step {step} of {TOTAL_STEPS} · {stepLabels[step - 1]}
          </p>
        </div>

        {/* Progress */}
        <Progress value={progressPercent} className="h-1.5" />

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                if (i + 1 <= step) setStep(i + 1);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i + 1 === step
                  ? "w-6 bg-primary"
                  : i + 1 < step
                    ? "w-2 bg-primary/40 cursor-pointer"
                    : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        {/* Step content card */}
        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <StepSafetyMode selected={safetyMode} onSelect={setSafetyMode} />
            )}
            {step === 2 && (
              <StepConnections
                connected={connectedServices}
                onToggle={handleToggleConnection}
              />
            )}
            {step === 3 && (
              <StepDevices paired={glassesPaired} onPair={handlePairGlasses} />
            )}
            {step === 4 && <StepDemo />}
            {step === 5 && <StepComplete safetyMode={safetyMode} />}
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-3 pt-0">
            {step > 1 ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleBack}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {step === 2 &&
                !Object.values(connectedServices).some(Boolean) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={handleNext}
                  >
                    Skip for now
                  </Button>
                )}
              {step === 3 && !glassesPaired && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleNext}
                >
                  Skip
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleNext}
                disabled={!canProceed}
              >
                {step === TOTAL_STEPS ? (
                  <>
                    Go to Inbox
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Skip onboarding entirely */}
        {step < TOTAL_STEPS && (
          <p className="text-center">
            <button
              className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              onClick={() => {
                setOnboardingComplete(true);
                navigate("/app/inbox");
              }}
            >
              Skip setup and go straight to the app
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
