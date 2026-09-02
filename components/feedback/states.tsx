import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Gagal memuat data",
  description = "Silakan muat ulang halaman. Jika masalah berlanjut, hubungi operator organisasi Anda.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-md bg-destructive-soft text-destructive">
        <AlertCircle size={18} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ForbiddenState({
  description = "Anda tidak memiliki akses untuk melihat bagian ini.",
  className,
}: {
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
        <Lock size={18} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Akses ditolak</p>
        <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 px-4 py-3.5 sm:px-5"
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className={cn(
                "h-3.5 animate-pulse rounded-xs bg-muted",
                columnIndex === 0 ? "w-40" : "w-24",
              )}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Memuat data…</span>
    </div>
  );
}

export function StatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="rounded-md border border-border bg-card p-4"
        >
          <div className="h-3 w-24 animate-pulse rounded-xs bg-muted" />
          <div className="mt-3 h-6 w-16 animate-pulse rounded-xs bg-muted" />
        </div>
      ))}
    </>
  );
}
