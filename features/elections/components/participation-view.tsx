"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import type { Participation } from "@/features/elections/queries/get-election";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Partisipasi langsung.
 *
 * Empat angka, dan hanya empat: DPT, sudah memilih, sisa, persentase
 * (EVOTING §80/§82). Tidak ada perolehan kandidat, tidak ada tren, tidak ada
 * daftar siapa yang baru saja memilih — bukan karena disembunyikan di sini,
 * melainkan karena fungsi database yang memasoknya memang tidak
 * mengembalikannya.
 *
 * Penyegaran memakai `router.refresh()`, bukan langganan realtime ke tabel:
 * server merender ulang dan mengambil angkanya lewat jalur yang sama, sehingga
 * tidak ada satu pun baris tabel yang disiarkan ke peramban.
 */
export function ParticipationView({
  electionId,
  participation,
  live,
  fullscreen = false,
}: {
  electionId: string;
  participation: Participation;
  /** Menyegarkan sendiri hanya ketika pemungutan suara sedang berlangsung. */
  live: boolean;
  fullscreen?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;

    const timer = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
        setUpdatedAt(
          new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        );
      });
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [live, router]);

  const percent = Math.min(
    100,
    Math.max(0, participation.participationPercent),
  );

  return (
    <div className={cn("space-y-6", fullscreen && "text-center")}>
      <div
        className={cn(
          "grid gap-3",
          fullscreen ? "sm:grid-cols-3" : "sm:grid-cols-3",
        )}
      >
        <Metric
          label="Sudah memilih"
          value={participation.votedCount}
          tone="success"
          fullscreen={fullscreen}
        />
        <Metric
          label="Belum memilih"
          value={participation.remainingCount}
          tone="muted"
          fullscreen={fullscreen}
        />
        <Metric
          label="Total DPT"
          value={participation.eligibleCount}
          tone="muted"
          fullscreen={fullscreen}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "font-medium text-muted-foreground",
              fullscreen ? "text-lg" : "text-[13px]",
            )}
          >
            Tingkat partisipasi
          </span>
          <span
            className={cn(
              "font-semibold tabular-nums text-foreground",
              fullscreen ? "text-4xl" : "text-lg",
            )}
          >
            {participation.participationPercent.toFixed(2)}%
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tingkat partisipasi"
          className={cn(
            "w-full overflow-hidden rounded-full bg-muted",
            fullscreen ? "h-6" : "h-2.5",
          )}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {participation.eligibleCount === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          DPT masih kosong, jadi persentasenya nol — bukan karena tidak ada yang
          memilih, melainkan karena belum ada yang berhak.
        </p>
      ) : null}

      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          fullscreen ? "justify-center" : "justify-between",
        )}
      >
        <p className="text-[13px] text-muted-foreground">
          {live
            ? `Diperbarui otomatis tiap 15 detik${updatedAt ? ` · terakhir ${updatedAt}` : ""}`
            : "Angka partisipasi tidak lagi berubah."}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={isPending ? "animate-spin" : undefined}
            />
            Segarkan
          </Button>

          {!fullscreen ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/pemilihan/${electionId}/live` as Route}>
                <Maximize2 size={14} aria-hidden="true" />
                Mode Layar Penuh
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  fullscreen,
}: {
  label: string;
  value: number;
  tone: "success" | "muted";
  fullscreen: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p
        className={cn(
          "text-muted-foreground",
          fullscreen ? "text-base" : "text-[13px]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" ? "text-success" : "text-foreground",
          fullscreen ? "text-6xl" : "text-2xl",
        )}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}
