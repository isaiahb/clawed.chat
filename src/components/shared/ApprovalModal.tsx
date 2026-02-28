import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Pencil,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Clock,
  Undo2,
} from "lucide-react";
import type { Approval, RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

interface ApprovalModalProps {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (approval: Approval) => void;
  onReject: (approval: Approval) => void;
  onEdit: (approval: Approval, editedPreview: string) => void;
}

const riskConfig: Record<
  RiskLevel,
  { label: string; icon: LucideIcon; className: string; bg: string }
> = {
  low: {
    label: "Low risk",
    icon: ShieldCheck,
    className: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  },
  medium: {
    label: "Medium risk",
    icon: ShieldAlert,
    className: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  },
  high: {
    label: "High risk",
    icon: ShieldX,
    className: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function ApprovalModal({
  approval,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onEdit,
}: ApprovalModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPreview, setEditedPreview] = useState("");

  if (!approval) return null;

  const risk = riskConfig[approval.risk];
  const RiskIcon = risk.icon;

  const handleStartEdit = () => {
    setEditedPreview(approval.preview);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPreview("");
  };

  const handleSaveAndApprove = () => {
    onEdit(approval, editedPreview);
    setIsEditing(false);
    setEditedPreview("");
  };

  const handleApprove = () => {
    onApprove(approval);
  };

  const handleReject = () => {
    onReject(approval);
    setIsEditing(false);
    setEditedPreview("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsEditing(false);
      setEditedPreview("");
    }
    onOpenChange(nextOpen);
  };

  const inputEntries = Object.entries(approval.inputs);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-snug">
                {approval.actionSummary}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {formatRelativeTime(approval.createdAt)}
              </DialogDescription>
            </div>
            <Badge variant="outline" className={cn("shrink-0", risk.bg)}>
              <RiskIcon className="h-3.5 w-3.5 mr-1" />
              {risk.label}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Destination */}
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Destination:</span>
            <span className="font-medium">{approval.destination}</span>
          </div>

          {/* Inputs */}
          {inputEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Inputs
              </p>
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                {inputEntries.map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-mono text-xs min-w-[100px] shrink-0 pt-0.5">
                      {key}
                    </span>
                    <span className="text-foreground break-words">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Preview
              </p>
              {!isEditing && approval.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-3 w-3" />
                  Edit before approving
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedPreview}
                  onChange={(e) => setEditedPreview(e.target.value)}
                  className="min-h-[120px] text-sm font-mono resize-y"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={handleCancelEdit}
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Discard edits
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {approval.preview}
              </div>
            )}
          </div>

          {/* Tool info */}
          {approval.toolName && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                {approval.toolName}
              </span>
            </div>
          )}

          {/* High risk warning */}
          {approval.risk === "high" && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-medium">
                  This action requires careful review
                </p>
                <p className="mt-0.5 text-red-600 dark:text-red-400">
                  This may be irreversible or affect a large audience. Please
                  confirm the details above before approving.
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4 flex-row gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleReject} className="gap-1.5">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <div className="flex-1" />
          {isEditing ? (
            <Button
              onClick={handleSaveAndApprove}
              disabled={!editedPreview.trim()}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Save & Approve
            </Button>
          ) : (
            <Button
              onClick={handleApprove}
              className={cn(
                "gap-1.5",
                approval.risk === "high" &&
                  "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
              )}
            >
              <Check className="h-4 w-4" />
              {approval.risk === "high" ? "Confirm & Approve" : "Approve"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
