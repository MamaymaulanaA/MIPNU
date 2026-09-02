import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
} as const;

export type StatCardTone = keyof typeof TONES;

export function StatCard({
  label,
  value,
  context,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  context?: string;
  icon?: LucideIcon;
  tone?: StatCardTone;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-md border border-border bg-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-md",
              TONES[tone],
            )}
          >
            <Icon size={16} strokeWidth={1.9} />
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>

      {context ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{context}</p>
      ) : null}
    </div>
  );
}
