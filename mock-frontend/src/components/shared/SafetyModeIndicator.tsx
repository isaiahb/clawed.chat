import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app-store";
import type { SafetyMode } from "@/types";
import { cn } from "@/lib/utils";

const modeConfig: Record<
  SafetyMode,
  {
    label: string;
    description: string;
    icon: typeof Shield;
    className: string;
  }
> = {
  "read-only": {
    label: "Read Only",
    description: "Assistant can read and summarize, but cannot send or change anything.",
    icon: Shield,
    className:
      "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
  },
  "draft-first": {
    label: "Draft First",
    description: "Assistant drafts messages and actions. You approve before anything is sent.",
    icon: ShieldCheck,
    className:
      "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900",
  },
  assisted: {
    label: "Assisted",
    description:
      "Assistant can execute low-risk actions automatically. Sensitive actions still require approval.",
    icon: ShieldAlert,
    className:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
  },
};

interface SafetyModeIndicatorProps {
  compact?: boolean;
  className?: string;
}

export function SafetyModeIndicator({
  compact = false,
  className,
}: SafetyModeIndicatorProps) {
  const safetyMode = useAppStore((s) => s.safetyMode);
  const config = modeConfig[safetyMode];
  const Icon = config.icon;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md cursor-default transition-colors",
              config.className,
              className
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-64">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {config.description}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={cn(
            "gap-1.5 cursor-default font-medium transition-colors",
            config.className,
            className
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        <p className="text-xs">{config.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
