import { useState, useEffect, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/clerk-react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Monitor,
  Palette,
  MessageSquare,
  Type,
  AlignLeft,
  AlignJustify,
  Code2,
  Copy,
  CheckCircle2,
  RotateCcw,
  Terminal,
  Zap,
  AlertTriangle,
  Trash2,
  User,
  KeyRound,
  Plus,
  Trash2 as Trash2Icon,
  Loader2,
  CheckCircle2 as CheckIcon,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { cn } from "../../lib/utils";
import type { SafetyMode } from "../../types";
import type { ResponseStyle } from "../../stores/app-store";

// ──────────────────────────────────────────────
// API Keys types & helpers
// ──────────────────────────────────────────────

interface StoredKey {
  provider: string;
  masked_key: string;
  is_valid: boolean;
  created_at: number;
  updated_at: number;
}

const PROVIDER_META: Record<string, { label: string; placeholder: string; prefix: string }> = {
  anthropic: { label: "Anthropic", placeholder: "sk-ant-api03-...", prefix: "sk-ant-" },
  openai: { label: "OpenAI", placeholder: "sk-proj-...", prefix: "sk-" },
  google: { label: "Google", placeholder: "AIza...", prefix: "AIza" },
};

// ──────────────────────────────────────────────
// Safety mode configuration
// ──────────────────────────────────────────────

const safetyModeOptions: {
  mode: SafetyMode;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    mode: "read-only",
    label: "Read Only",
    description:
      "Agent can read and summarize your data. Cannot send, modify, or delete anything.",
    icon: Shield,
  },
  {
    mode: "draft-first",
    label: "Draft First",
    description:
      "Agent drafts all actions for your review. Nothing is sent or changed without your approval.",
    icon: ShieldCheck,
  },
  {
    mode: "assisted",
    label: "Assisted",
    description:
      "Low-risk actions run automatically. Sensitive actions still require your approval.",
    icon: ShieldAlert,
  },
];

// ──────────────────────────────────────────────
// Response style configuration
// ──────────────────────────────────────────────

const responseStyleOptions: {
  style: ResponseStyle;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    style: "short",
    label: "Short",
    description: "Brief, to-the-point answers. Minimal formatting.",
    icon: Type,
  },
  {
    style: "medium",
    label: "Medium",
    description: "Balanced responses with context when helpful.",
    icon: AlignLeft,
  },
  {
    style: "verbose",
    label: "Verbose",
    description: "Detailed responses with full context and explanations.",
    icon: AlignJustify,
  },
];

// ──────────────────────────────────────────────
// Theme options
// ──────────────────────────────────────────────

const themeOptions: {
  value: "light" | "dark" | "system";
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

// ──────────────────────────────────────────────
// Section wrapper
// ──────────────────────────────────────────────

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Card className="transition-all duration-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-claw-red/15 bg-claw-red/6 text-claw-red transition-colors duration-200">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Main Settings Page
// ──────────────────────────────────────────────

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const { user: clerkUser } = useUser();
  const {
    safetyMode,
    setSafetyMode,
    theme,
    setTheme,
    responseStyle,
    setResponseStyle,
    demoMode,
    setDemoMode,
  } = useAppStore();

  // Account info sourced from Clerk (read-only here — edit via Clerk profile)
  const accountName = clerkUser?.fullName ?? clerkUser?.firstName ?? "User";
  const accountEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? "";

  const [copied, setCopied] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [nameValue, setNameValue] = useState(accountName);
  const [emailValue, setEmailValue] = useState(accountEmail);
  const [accountSaved, setAccountSaved] = useState(false);

  // ─── API Keys State ──────────────────────────────────────────────────
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [addProvider, setAddProvider] = useState("anthropic");
  const [addKeyValue, setAddKeyValue] = useState("");
  const [addKeyVisible, setAddKeyVisible] = useState(false);
  const [addKeySubmitting, setAddKeySubmitting] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setStoredKeys(data.keys ?? []);
      }
    } catch {
      // silently fail — user will see empty list
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleAddKey() {
    if (!addKeyValue.trim()) return;
    setAddKeySubmitting(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: addProvider, api_key: addKeyValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add key", {
          description: data.detail,
        });
        return;
      }
      toast.success(`${PROVIDER_META[addProvider]?.label ?? addProvider} key saved`, {
        description: `Masked: ${data.masked_key}`,
      });
      setAddKeyValue("");
      setAddKeyOpen(false);
      setAddKeyVisible(false);
      await fetchKeys();
    } catch {
      toast.error("Network error — could not save key");
    } finally {
      setAddKeySubmitting(false);
    }
  }

  async function handleDeleteKey(provider: string) {
    setDeletingProvider(provider);
    try {
      const res = await fetch(`/api/keys/${provider}`, { method: "DELETE" });
      if (res.ok) {
        toast(`${PROVIDER_META[provider]?.label ?? provider} key removed`);
        await fetchKeys();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete key");
      }
    } catch {
      toast.error("Network error — could not delete key");
    } finally {
      setDeletingProvider(null);
    }
  }

  // Sync local form values when Clerk user data loads/changes
  useEffect(() => {
    if (clerkUser) {
      setNameValue(clerkUser.fullName ?? clerkUser.firstName ?? "User");
      setEmailValue(clerkUser.primaryEmailAddress?.emailAddress ?? "");
    }
  }, [clerkUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const agentEndpoint = clerkUser?.id
    ? `https://api.clawed.chat/v1/agent/${clerkUser.id.replace("user_", "").slice(-8)}`
    : "https://api.clawed.chat/v1/agent/demo";

  const handleSaveAccount = async () => {
    // Update profile via Clerk SDK
    if (clerkUser) {
      try {
        await clerkUser.update({
          firstName: nameValue.split(" ")[0] || nameValue,
          lastName: nameValue.split(" ").slice(1).join(" ") || undefined,
        });
        setAccountSaved(true);
        toast.success("Account updated");
        setTimeout(() => setAccountSaved(false), 2000);
      } catch (err: any) {
        toast.error("Failed to update account", { description: err.message });
      }
    }
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(agentEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetDemo = () => {
    // In a real app, this would reset all demo data
    setResetConfirmed(true);
    setTimeout(() => {
      setResetConfirmed(false);
      setShowResetDialog(false);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          Manage appearance, response behavior, and safety preferences.
        </p>
      </div>

      {/* ── Account ── */}
      <SettingsSection
        title="Account"
        description="Your profile and login details."
        icon={User}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="account-name"
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Name
            </Label>
            <Input
              id="account-name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Your name"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="account-email"
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="account-email"
              type="email"
              value={emailValue}
              readOnly
              placeholder="you@example.com"
              className="h-9 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground">
              Email is managed by your Google account via Clerk.
            </p>
          </div>

          {clerkUser?.imageUrl && (
            <div className="flex items-center gap-3">
              <img
                src={clerkUser.imageUrl}
                alt={accountName}
                className="h-9 w-9 rounded-full border border-border"
              />
              <div className="text-[12px] text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{accountEmail}</span>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-end">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[11px]"
              onClick={handleSaveAccount}
              disabled={
                nameValue === accountName
              }
            >
              {accountSaved ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Saved
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── API Keys (BYOK) ── */}
      <SettingsSection
        title="API Keys"
        description="Bring your own LLM provider keys for your agent."
        icon={KeyRound}
      >
        <div className="space-y-4">
          {keysLoading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">Loading keys…</span>
            </div>
          ) : storedKeys.length === 0 && !addKeyOpen ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                No API keys stored yet. Add one to deploy your own agent.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-[11px]"
                onClick={() => setAddKeyOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Add API Key
              </Button>
            </div>
          ) : (
            <>
              {/* Existing keys list */}
              {storedKeys.map((k) => {
                const meta = PROVIDER_META[k.provider];
                return (
                  <div
                    key={k.provider}
                    className="flex items-center justify-between gap-3 border border-border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center border text-[10px] font-bold shrink-0",
                        k.is_valid
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-destructive/20 bg-destructive/10 text-destructive",
                      )}>
                        {k.is_valid ? <CheckIcon className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {meta?.label ?? k.provider}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {k.masked_key}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDeleteKey(k.provider)}
                      disabled={deletingProvider === k.provider}
                    >
                      {deletingProvider === k.provider ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}

              {/* Add key form (inline) */}
              {addKeyOpen ? (
                <div className="border border-border p-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Provider
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(PROVIDER_META).map(([id, meta]) => {
                        const hasKey = storedKeys.some((k) => k.provider === id);
                        return (
                          <button
                            key={id}
                            onClick={() => setAddProvider(id)}
                            disabled={hasKey}
                            className={cn(
                              "border-2 p-2 text-center text-[11px] font-medium transition-all",
                              hasKey
                                ? "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                                : addProvider === id
                                  ? "border-foreground bg-foreground/[0.03]"
                                  : "border-border hover:border-foreground/40",
                            )}
                          >
                            {meta.label}
                            {hasKey && <span className="block text-[9px] text-muted-foreground">saved</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      API Key
                    </Label>
                    <div className="relative">
                      <Input
                        type={addKeyVisible ? "text" : "password"}
                        value={addKeyValue}
                        onChange={(e) => setAddKeyValue(e.target.value)}
                        placeholder={PROVIDER_META[addProvider]?.placeholder ?? "Enter API key…"}
                        className="h-9 pr-9 font-mono text-[11px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && addKeyValue.trim() && !addKeySubmitting) {
                            handleAddKey();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setAddKeyVisible(!addKeyVisible)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {addKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Your key is validated, encrypted, and stored securely. We never see the plaintext after encryption.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px]"
                      onClick={() => {
                        setAddKeyOpen(false);
                        setAddKeyValue("");
                        setAddKeyVisible(false);
                      }}
                      disabled={addKeySubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-[11px]"
                      onClick={handleAddKey}
                      disabled={!addKeyValue.trim() || addKeySubmitting}
                    >
                      {addKeySubmitting ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Validating…
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Save Key
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-[11px] w-full"
                  onClick={() => setAddKeyOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  Add API Key
                </Button>
              )}
            </>
          )}
        </div>
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel."
        icon={Palette}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Theme
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-2.5 border-2 p-4 transition-all duration-200 active:translate-y-px",
                      isSelected
                        ? "border-foreground bg-foreground/[0.03]"
                        : "border-border hover:border-foreground/40 hover:bg-muted/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors duration-200",
                        isSelected
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold transition-colors duration-200",
                        isSelected
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Response Style ── */}
      <SettingsSection
        title="Response Style"
        description="Control how your agent communicates."
        icon={MessageSquare}
      >
        <div className="space-y-2">
          {responseStyleOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = responseStyle === option.style;

            return (
              <button
                key={option.style}
                onClick={() => setResponseStyle(option.style)}
                className={cn(
                  "relative w-full border-2 p-4 text-left transition-all duration-200 active:translate-y-px",
                  isSelected
                    ? "border-foreground bg-foreground/[0.03]"
                    : "border-border hover:border-foreground/40 hover:bg-muted/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {option.label}
                      </span>
                      {option.style === "medium" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1 font-normal"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground mt-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Safety Mode ── */}
      <SettingsSection
        title="Safety Mode"
        description="Control how much the agent can do on its own."
        icon={ShieldCheck}
      >
        <div className="space-y-2">
          {safetyModeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = safetyMode === option.mode;

            return (
              <button
                key={option.mode}
                onClick={() => setSafetyMode(option.mode)}
                className={cn(
                  "relative w-full border-2 p-4 text-left transition-all",
                  isSelected
                    ? "border-foreground bg-card"
                    : "border-border hover:border-foreground/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {option.label}
                      </span>
                      {option.mode === "draft-first" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1 font-normal"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground mt-1" />
                  )}
                </div>
              </button>
            );
          })}

          <div className="bg-muted/50 border border-border p-3 mt-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                Always requires confirmation:
              </span>{" "}
              Sending to new recipients, payments, deletions, public posts, and
              account changes — regardless of mode.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── Developer ── */}
      <SettingsSection
        title="Developer"
        description="Tools for testing and demos."
        icon={Code2}
      >
        <div className="space-y-5">
          {/* Agent endpoint */}
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Agent Endpoint
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Terminal className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={agentEndpoint}
                  readOnly
                  className="pl-9 font-mono text-[11px] h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-[11px] shrink-0"
                onClick={handleCopyEndpoint}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use this endpoint to connect to your agent via the API.
            </p>
          </div>

          <Separator />

          {/* Demo mode toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                Demo Mode
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Pin suggested prompts and hide distractions for presentations.
              </p>
            </div>
            <Switch checked={demoMode} onCheckedChange={setDemoMode} />
          </div>

          <Separator />

          {/* Reset demo data */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2 text-foreground">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                Reset Demo Data
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Clear all sessions, connections state, and settings to start
                fresh.
              </p>
            </div>
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-[11px] text-destructive hover:text-destructive border-destructive/30 hover:border-destructive shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                  Reset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Reset demo data?
                  </DialogTitle>
                  <DialogDescription>
                    This will clear all conversations, reset connection states,
                    and restore default settings. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleResetDemo}
                    disabled={resetConfirmed}
                  >
                    {resetConfirmed ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reset complete
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Confirm reset
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SettingsSection>

      {/* Footer note */}
      <div className="border border-border p-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          Settings are saved automatically and persist across sessions.
        </p>
      </div>
    </div>
  );
}
