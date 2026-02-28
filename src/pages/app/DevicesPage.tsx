import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  Glasses,
  Monitor,
  Smartphone,
  Bluetooth,
  BluetoothOff,
  BatteryMedium,
  BatteryLow,
  BatteryFull,
  Wifi,
  WifiOff,
  Settings2,
  Clock,
  Eye,
  Volume2,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Mic,
  Send,
  Accessibility,
  Sun,
  Moon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { mockDevices } from "@/data/mock";
import { GlassesSimulator } from "@/components/shared/GlassesSimulator";
import type { GlanceLayout, DeviceStatus, DeviceType } from "@/types";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeTime(iso?: string): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const statusConfig: Record<
  DeviceStatus,
  { label: string; color: string; icon: LucideIcon }
> = {
  paired: {
    label: "Paired",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  disconnected: {
    label: "Disconnected",
    color: "bg-muted text-muted-foreground",
    icon: BluetoothOff,
  },
  pairing: {
    label: "Pairing…",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    icon: Loader2,
  },
  error: {
    label: "Error",
    color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    icon: XCircle,
  },
};

const deviceTypeIcons: Record<DeviceType, LucideIcon> = {
  glasses: Glasses,
  watch: Clock,
  phone: Smartphone,
  browser: Monitor,
  desktop: Monitor,
};

function BatteryIcon({ percent }: { percent?: number }) {
  if (percent === undefined) return null;
  if (percent <= 20) return <BatteryLow className="h-3.5 w-3.5 text-red-500" />;
  if (percent <= 60)
    return <BatteryMedium className="h-3.5 w-3.5 text-amber-500" />;
  return <BatteryFull className="h-3.5 w-3.5 text-emerald-500" />;
}

// ──────────────────────────────────────────────
// Device Card
// ──────────────────────────────────────────────

interface DeviceCardProps {
  device: (typeof mockDevices)[number];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReconnect: (id: string) => void;
  selected: boolean;
}

function DeviceCard({
  device,
  onSelect,
  onRemove,
  onReconnect,
  selected,
}: DeviceCardProps) {
  const status = statusConfig[device.status as DeviceStatus];
  const StatusIcon = status.icon;
  const DeviceIcon = deviceTypeIcons[device.type as DeviceType] || Monitor;

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary border-primary/30",
        device.status === "error" && "border-red-200 dark:border-red-900",
      )}
      onClick={() => onSelect(device.id)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Device icon */}
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
              device.status === "paired"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : device.status === "error"
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            <DeviceIcon className="h-6 w-6" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{device.name}</h3>
              <Badge
                variant="outline"
                className={cn("text-[10px] shrink-0", status.color)}
              >
                <StatusIcon
                  className={cn(
                    "h-3 w-3 mr-1",
                    device.status === "pairing" && "animate-spin",
                  )}
                />
                {status.label}
              </Badge>
            </div>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {device.battery !== undefined && (
                <span className="flex items-center gap-1">
                  <BatteryIcon percent={device.battery} />
                  {device.battery}%
                </span>
              )}
              {device.status === "paired" && (
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Connected
                </span>
              )}
              {device.status === "disconnected" && (
                <span className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
              {device.lastSync && (
                <span>Last sync: {formatRelativeTime(device.lastSync)}</span>
              )}
              {device.firmwareVersion && (
                <span className="font-mono">v{device.firmwareVersion}</span>
              )}
            </div>

            {/* Glance layout info for glasses */}
            {device.type === "glasses" && device.glanceLayout && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] capitalize">
                  <Eye className="h-3 w-3 mr-1" />
                  {device.glanceLayout} layout
                </Badge>
                {device.quietHoursEnabled && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Moon className="h-3 w-3 mr-1" />
                    Quiet hours on
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {device.status === "disconnected" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReconnect(device.id);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reconnect</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(device.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove device</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Pairing Dialog
// ──────────────────────────────────────────────

function PairingDialog({
  open,
  onOpenChange,
  onPaired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaired: () => void;
}) {
  const [pairingStep, setPairingStep] = useState<
    "searching" | "found" | "confirming" | "done"
  >("searching");

  const startPairing = () => {
    setPairingStep("searching");
    setTimeout(() => setPairingStep("found"), 2000);
  };

  const confirmPairing = () => {
    setPairingStep("confirming");
    setTimeout(() => {
      setPairingStep("done");
      setTimeout(() => {
        onPaired();
        onOpenChange(false);
        setPairingStep("searching");
      }, 1500);
    }, 1500);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPairingStep("searching");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5 text-blue-500" />
            Pair a new device
          </DialogTitle>
          <DialogDescription>
            Put your glasses into pairing mode and they'll appear here.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-4">
          {pairingStep === "searching" && (
            <>
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                  <Bluetooth className="h-8 w-8" />
                </div>
                <span className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping" />
              </div>
              <p className="text-sm text-muted-foreground">
                Searching for nearby devices…
              </p>
              <Button variant="outline" size="sm" onClick={startPairing}>
                Simulate discovery
              </Button>
            </>
          )}

          {pairingStep === "found" && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Glasses className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Device found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Meta Ray-Ban Stories ·{" "}
                  <span className="font-mono">CL-4829</span>
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Confirmation code
                </p>
                <p className="text-2xl font-mono font-bold tracking-widest">
                  4 8 2 9
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Verify this matches your glasses
                </p>
              </div>
              <Button onClick={confirmPairing} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Confirm & pair
              </Button>
            </>
          )}

          {pairingStep === "confirming" && (
            <>
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-950 dark:text-blue-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Establishing connection…
              </p>
            </>
          )}

          {pairingStep === "done" && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                  Paired successfully!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Meta Ray-Ban Stories is now connected.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            {pairingStep === "done" ? "Close" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Test Prompt Panel
// ──────────────────────────────────────────────

function TestPromptPanel() {
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState(false);
  const [response, setResponse] = useState("");

  const handleSend = () => {
    if (!prompt.trim()) return;
    setSent(true);
    setResponse("");
    setTimeout(() => {
      setResponse(
        prompt.toLowerCase().includes("meeting")
          ? "Design Review in 45 min · Zoom · Jamie, Sam, Priya"
          : prompt.toLowerCase().includes("inbox")
            ? "You have 3 unread messages. 1 high priority from Alex Chen about the Q3 budget."
            : prompt.toLowerCase().includes("weather")
              ? "72°F and sunny in San Francisco. No rain expected today."
              : `I found some info about "${prompt}". This would appear as a card on your glasses.`,
      );
    }, 1500);
  };

  const handleReset = () => {
    setPrompt("");
    setSent(false);
    setResponse("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Test Prompt
        </CardTitle>
        <CardDescription className="text-xs">
          Send a test prompt to see how it appears on the glasses simulator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Try: What's my next meeting?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={sent && !response}
            className="text-sm"
          />
          {!sent ? (
            <Button size="icon" onClick={handleSend} disabled={!prompt.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" variant="outline" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {sent && !response && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        )}

        {response && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Glasses would show:
            </p>
            <p className="text-foreground leading-relaxed">{response}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {[
            "What's my next meeting?",
            "Summarize my inbox",
            "What's the weather?",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setPrompt(suggestion);
                setSent(false);
                setResponse("");
              }}
              className="rounded-full border bg-background px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Device Settings Panel
// ──────────────────────────────────────────────

function DeviceSettingsPanel({
  device,
}: {
  device: (typeof mockDevices)[number];
}) {
  const [glanceLayout, setGlanceLayout] = useState<GlanceLayout>(
    (device.glanceLayout as GlanceLayout) ?? "compact",
  );
  const [quietEnabled, setQuietEnabled] = useState(
    device.quietHoursEnabled ?? false,
  );
  const [quietStart, setQuietStart] = useState(
    device.quietHoursStart ?? "22:00",
  );
  const [quietEnd, setQuietEnd] = useState(device.quietHoursEnd ?? "07:00");
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const isGlasses = device.type === "glasses";

  if (!isGlasses) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Monitor className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Browser Device</p>
          <p className="text-xs text-muted-foreground mt-1">
            This device connects through your web browser. No additional
            settings needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Glance Layout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Glance Layout
          </CardTitle>
          <CardDescription className="text-xs">
            Choose how much information appears on each card
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={glanceLayout}
            onValueChange={(v) => setGlanceLayout(v as GlanceLayout)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Compact</span>
                  <span className="text-xs text-muted-foreground">
                    — Smallest, fastest to read
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="standard">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Standard</span>
                  <span className="text-xs text-muted-foreground">
                    — Balanced
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="expanded">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Expanded</span>
                  <span className="text-xs text-muted-foreground">
                    — Largest, most readable
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Inline preview */}
          <div className="rounded-xl bg-neutral-900 p-4 flex justify-center">
            <GlassesSimulator
              layout={glanceLayout}
              interactive={false}
              className="scale-[0.7] origin-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Quiet Hours
          </CardTitle>
          <CardDescription className="text-xs">
            Suppress notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-toggle" className="text-sm cursor-pointer">
              Enable quiet hours
            </Label>
            <Switch
              id="quiet-toggle"
              checked={quietEnabled}
              onCheckedChange={setQuietEnabled}
            />
          </div>

          {quietEnabled && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="text-sm"
                />
              </div>
              <p className="col-span-2 text-xs text-muted-foreground">
                Your glasses will stay silent from {quietStart} to {quietEnd}.
                Urgent alerts will still vibrate.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Accessibility
          </CardTitle>
          <CardDescription className="text-xs">
            Adjust the glasses experience for your needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm cursor-pointer">Large text</Label>
            </div>
            <Switch checked={largeText} onCheckedChange={setLargeText} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm cursor-pointer">High contrast</Label>
            </div>
            <Switch checked={highContrast} onCheckedChange={setHighContrast} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm cursor-pointer">Voice feedback</Label>
            </div>
            <Switch
              checked={voiceFeedback}
              onCheckedChange={setVoiceFeedback}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm cursor-pointer">Haptic feedback</Label>
            </div>
            <Switch
              checked={hapticFeedback}
              onCheckedChange={setHapticFeedback}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Devices Page
// ──────────────────────────────────────────────

export default function DevicesPage() {
  useDocumentTitle("Devices");
  const [devices, setDevices] = useState(mockDevices);
  const [selectedId, setSelectedId] = useState<string | null>(
    mockDevices[0]?.id ?? null,
  );
  const [pairingOpen, setPairingOpen] = useState(false);

  const selectedDevice = devices.find((d) => d.id === selectedId) ?? null;
  const glassesDevices = devices.filter((d) => d.type === "glasses");
  const otherDevices = devices.filter((d) => d.type !== "glasses");

  const handleRemove = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) {
      setSelectedId(devices.find((d) => d.id !== id)?.id ?? null);
    }
  };

  const handleReconnect = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "pairing" as const } : d)),
    );
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: "paired" as const,
                lastSync: new Date().toISOString(),
              }
            : d,
        ),
      );
    }, 2000);
  };

  const handlePaired = () => {
    const newDevice = {
      id: `dev-${Date.now()}`,
      name: "Meta Ray-Ban Stories",
      type: "glasses" as const,
      status: "paired" as const,
      lastSync: new Date().toISOString(),
      battery: 85,
      firmwareVersion: "4.3.0",
      glanceLayout: "compact" as const,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    };
    setDevices((prev) => [newDevice, ...prev]);
    setSelectedId(newDevice.id);
  };

  return (
    <div className="h-full">
      <div className="p-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Devices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pair and manage your glasses and connected devices
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => setPairingOpen(true)}>
            <Plus className="h-4 w-4" />
            Pair device
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-3">
        {/* ── Left column: Device list ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Glasses */}
          {glassesDevices.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Glasses className="h-3.5 w-3.5" />
                Smart Glasses
              </h2>
              <div className="space-y-2">
                {glassesDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onSelect={setSelectedId}
                    onRemove={handleRemove}
                    onReconnect={handleReconnect}
                    selected={selectedId === device.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other devices */}
          {otherDevices.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5" />
                Other Devices
              </h2>
              <div className="space-y-2">
                {otherDevices.map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onSelect={setSelectedId}
                    onRemove={handleRemove}
                    onReconnect={handleReconnect}
                    selected={selectedId === device.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {devices.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Glasses className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold">No devices paired</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                  Pair your smart glasses to get the glanceable hands-free
                  experience.
                </p>
                <Button
                  className="mt-4 gap-1.5"
                  onClick={() => setPairingOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Pair your first device
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Supported devices info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Supported devices
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Meta Ray-Ban Stories",
                  "Even Realities G1",
                  "Xreal Air 2",
                  "More coming",
                ].map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="text-[10px] font-normal"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: Selected device detail ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {selectedDevice ? (
            <>
              <Tabs defaultValue="simulator" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="simulator" className="gap-1.5">
                    <Glasses className="h-3.5 w-3.5" />
                    Simulator
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="test" className="gap-1.5">
                    <Mic className="h-3.5 w-3.5" />
                    Test
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="simulator" className="mt-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Glasses UI Preview
                      </CardTitle>
                      <CardDescription className="text-xs">
                        See how cards look on your glasses. Use the controls to
                        navigate and simulate voice input.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl bg-neutral-950 p-8 flex justify-center">
                        <GlassesSimulator
                          layout={
                            (selectedDevice.glanceLayout as GlanceLayout) ??
                            "compact"
                          }
                          interactive
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <DeviceSettingsPanel device={selectedDevice} />
                </TabsContent>

                <TabsContent value="test" className="mt-6 space-y-6">
                  <TestPromptPanel />

                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          <p className="font-medium text-foreground mb-1">
                            About test prompts
                          </p>
                          <p>
                            Test prompts simulate how the glasses would display
                            a response. In production, the response comes from
                            OpenClaw. Here, we show a placeholder result so you
                            can verify the card layout and readability.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Select a device</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click a device on the left to view its settings and simulator
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pairing dialog */}
      <PairingDialog
        open={pairingOpen}
        onOpenChange={setPairingOpen}
        onPaired={handlePaired}
      />
    </div>
  );
}
