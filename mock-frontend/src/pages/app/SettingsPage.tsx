import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Database,
  Trash2,
  Download,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Glasses,
  Palette,
  Clock,
  FileText,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import type { SafetyMode } from "@/types";
import { mockUserSettings } from "@/data/mock";

// ──────────────────────────────────────────────
// Safety mode configuration
// ──────────────────────────────────────────────

const safetyModeOptions: {
  mode: SafetyMode;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  badgeBg: string;
}[] = [
  {
    mode: "read-only",
    label: "Read Only",
    description:
      "Assistant can read and summarize. Cannot send or change anything.",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    mode: "draft-first",
    label: "Draft First",
    description:
      "Assistant drafts actions. You approve before anything is sent.",
    icon: ShieldCheck,
    color: "text-amber-600 dark:text-amber-400",
    badgeBg:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    mode: "assisted",
    label: "Assisted Actions",
    description:
      "Low-risk actions run automatically. Sensitive actions still require approval.",
    icon: ShieldAlert,
    color: "text-emerald-600 dark:text-emerald-400",
    badgeBg:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
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
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

// ──────────────────────────────────────────────
// Data retention options
// ──────────────────────────────────────────────

const retentionOptions = [
  { value: "30d", label: "30 days", description: "Minimal footprint" },
  { value: "90d", label: "90 days", description: "Standard (recommended)" },
  { value: "1y", label: "1 year", description: "Extended history" },
  { value: "forever", label: "Forever", description: "Keep all data" },
];

// ──────────────────────────────────────────────
// Section component
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
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
  const { safetyMode, setSafetyMode, theme, setTheme } = useAppStore();

  // Local form state
  const [name, setName] = useState(mockUserSettings.name);
  const [email, setEmail] = useState(mockUserSettings.email);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    mockUserSettings.notificationsEnabled,
  );
  const [weeklyDigest, setWeeklyDigest] = useState(
    mockUserSettings.weeklyDigest,
  );
  const [glanceMaxLines, setGlanceMaxLines] = useState(
    String(mockUserSettings.glanceMaxLines),
  );
  const [dataRetention, setDataRetention] = useState("90d");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, safety preferences, and app behavior.
          </p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          {saved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
      </div>

      {/* ── Profile ── */}
      <SettingsSection
        title="Profile"
        description="Your personal information and account details."
        icon={User}
      >
        <div className="space-y-6">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <Button variant="outline" size="sm">
                Change avatar
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, or GIF. Max 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="settings-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for sign-in and email digest notifications.
            </p>
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="settings-password">Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="settings-password"
                  type={showPassword ? "text" : "password"}
                  value="••••••••••"
                  readOnly
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button variant="outline" size="default">
                Change
              </Button>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Safety Mode ── */}
      <SettingsSection
        title="Safety Mode"
        description="Control how much the assistant can do on its own."
        icon={ShieldCheck}
      >
        <div className="space-y-3">
          {safetyModeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = safetyMode === option.mode;

            return (
              <button
                key={option.mode}
                onClick={() => setSafetyMode(option.mode)}
                className={cn(
                  "relative w-full rounded-xl border-2 p-4 text-left transition-all",
                  "hover:shadow-sm",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {option.label}
                      </span>
                      {option.mode === "draft-first" && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}

          <div className="rounded-lg border bg-muted/50 p-3 mt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">
                Always requires confirmation:
              </strong>{" "}
              Sending to new recipients, payments, deletions, public posts, and
              account changes — regardless of mode.
            </p>
          </div>
        </div>
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel of the app."
        icon={Palette}
      >
        <div className="space-y-6">
          {/* Theme */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                      "hover:shadow-sm",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Glasses glance density */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Glasses className="h-4 w-4 text-muted-foreground" />
                Glasses glance max lines
              </Label>
              <p className="text-xs text-muted-foreground">
                Maximum lines of text per card on your glasses display.
              </p>
            </div>
            <Select value={glanceMaxLines} onValueChange={setGlanceMaxLines}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 line</SelectItem>
                <SelectItem value="2">2 lines</SelectItem>
                <SelectItem value="3">3 lines</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      {/* ── Notifications ── */}
      <SettingsSection
        title="Notifications"
        description="Control how and when Clawed notifies you."
        icon={Bell}
      >
        <div className="space-y-5">
          {/* Push notifications */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                {notificationsEnabled ? (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                Push notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Receive alerts for pending approvals, completed actions, and
                urgent inbox items.
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>

          <Separator />

          {/* Weekly digest */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Weekly digest email
              </Label>
              <p className="text-xs text-muted-foreground">
                Summary of actions, approvals, and assistant activity sent every
                Monday.
              </p>
            </div>
            <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
          </div>

          <Separator />

          {/* Quiet hours reference */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Quiet hours
              </Label>
              <p className="text-xs text-muted-foreground">
                Configure quiet hours per device in the Devices settings page.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              asChild
            >
              <a href="/app/devices">
                Manage
                <ArrowRight className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── Data & Privacy ── */}
      <SettingsSection
        title="Data & Privacy"
        description="Control how your data is stored and retained."
        icon={Database}
      >
        <div className="space-y-6">
          {/* Data retention */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Receipt & timeline retention
            </Label>
            <Select value={dataRetention} onValueChange={setDataRetention}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {retentionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground">
                        — {option.description}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              After this period, receipts and conversation history are
              automatically deleted. You can always export before deletion.
            </p>
          </div>

          <Separator />

          {/* Export data */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                Export your data
              </Label>
              <p className="text-xs text-muted-foreground">
                Download a copy of your timeline, conversations, and settings as
                JSON.
              </p>
            </div>
            <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Export your data</DialogTitle>
                  <DialogDescription>
                    We'll prepare a JSON export of all your data including
                    timeline entries, conversations, connections, and settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Timeline entries
                    </span>
                    <span className="font-medium">34 records</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversations</span>
                    <span className="font-medium">3 threads</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Approvals history
                    </span>
                    <span className="font-medium">12 records</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Settings & preferences
                    </span>
                    <span className="font-medium">Included</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowExportDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="gap-1.5"
                    onClick={() => {
                      setShowExportDialog(false);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Start export
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Separator />

          {/* Delete account */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete account
              </Label>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account, all data, and disconnect all
                services. This action cannot be undone.
              </p>
            </div>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete your account?
                  </DialogTitle>
                  <DialogDescription>
                    This will permanently delete your account and all associated
                    data. This includes your timeline, conversations,
                    connections, devices, and settings. This action{" "}
                    <strong>cannot be undone</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive font-medium mb-2">
                    The following will be permanently deleted:
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                      All timeline entries and receipts
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                      All conversations and ask history
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                      All connected integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                      All paired devices
                    </li>
                    <li className="flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0" />
                      Your account and login credentials
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete" className="text-sm">
                    Type <strong>DELETE</strong> to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    placeholder="Type DELETE"
                    className="border-destructive/30 focus-visible:ring-destructive"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" className="gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Permanently delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SettingsSection>

      {/* ── API & Security ── */}
      <SettingsSection
        title="API & Security"
        description="Manage API keys and security settings."
        icon={KeyRound}
      >
        <div className="space-y-5">
          {/* API Key */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value="clwd_sk_••••••••••••••••••••••••"
                  readOnly
                  className="pl-10 font-mono text-xs"
                />
              </div>
              <Button variant="outline" size="default">
                Reveal
              </Button>
              <Button variant="outline" size="default">
                Rotate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key to authenticate with the Clawed API. Never share it
              publicly.
            </p>
          </div>

          <Separator />

          {/* Active sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active sessions</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive text-xs gap-1.5"
              >
                <Lock className="h-3 w-3" />
                Revoke all other sessions
              </Button>
            </div>
            <div className="space-y-2">
              {[
                {
                  device: "MacBook Pro — Chrome",
                  location: "San Francisco, CA",
                  lastActive: "Active now",
                  current: true,
                },
                {
                  device: "Meta Ray-Ban Stories",
                  location: "Bluetooth paired",
                  lastActive: "3 minutes ago",
                  current: false,
                },
              ].map((session) => (
                <div
                  key={session.device}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3",
                    session.current && "border-primary/30 bg-primary/5",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {session.device}
                      {session.current && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          This device
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive shrink-0"
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Two-factor authentication */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Two-factor authentication
              </Label>
              <p className="text-xs text-muted-foreground">
                Add an extra layer of security to your account with TOTP or
                hardware keys.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5" />
              Enable
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* ── Danger zone info ── */}
      <div className="rounded-lg border border-muted p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Need help with your account?{" "}
          <a
            href="/docs"
            className="underline hover:text-foreground transition-colors"
          >
            Contact support
          </a>{" "}
          or check the{" "}
          <a
            href="/docs"
            className="underline hover:text-foreground transition-colors"
          >
            documentation
          </a>
          .
        </p>
      </div>
    </div>
  );
}
