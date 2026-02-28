import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

export interface AssistantCardAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}

export interface AssistantCardProps {
  title: string;
  summary: string;
  icon?: React.ReactNode;
  status?: "listening" | "thinking" | "done" | "error";
  risk?: RiskLevel;
  sources?: { label: string; provider: string }[];
  primaryAction?: AssistantCardAction;
  secondaryAction?: AssistantCardAction;
  actions?: AssistantCardAction[];
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  compact?: boolean;
}

const statusConfig = {
  listening: { label: "Listening…", dotClass: "bg-blue-500 animate-pulse" },
  thinking: { label: "Thinking…", dotClass: "bg-amber-500 animate-pulse" },
  done: { label: "Done", dotClass: "bg-emerald-500" },
  error: { label: "Error", dotClass: "bg-destructive" },
} as const;

const riskConfig = {
  low: { label: "Low risk", variant: "secondary" as const },
  medium: { label: "Medium risk", variant: "default" as const },
  high: { label: "High risk", variant: "destructive" as const },
} as const;

export function AssistantCard({
  title,
  summary,
  icon,
  status,
  risk,
  sources,
  primaryAction,
  secondaryAction,
  actions,
  footer,
  className,
  children,
  compact = false,
}: AssistantCardProps) {
  const allActions = [
    ...(primaryAction ? [primaryAction] : []),
    ...(secondaryAction ? [secondaryAction] : []),
    ...(actions ?? []),
  ];

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className={cn(compact ? "pb-2" : "pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="mt-0.5 flex-shrink-0 text-muted-foreground">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className={cn("leading-snug", compact ? "text-sm" : "text-base")}>
                {title}
              </CardTitle>
              {status && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      statusConfig[status].dotClass
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {statusConfig[status].label}
                  </span>
                </div>
              )}
            </div>
          </div>
          {risk && (
            <Badge variant={riskConfig[risk].variant} className="flex-shrink-0 text-xs">
              {riskConfig[risk].label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? "pb-2" : "pb-4")}>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary}
        </p>

        {children}

        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sources.map((source, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {source.provider}: {source.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      {(allActions.length > 0 || footer) && (
        <CardFooter className="flex items-center justify-between gap-2 pt-0">
          {footer ? (
            footer
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {allActions.map((action, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={
                    action.variant ??
                    (i === 0 ? "default" : "outline")
                  }
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default AssistantCard;
