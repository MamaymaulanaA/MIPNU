import { Award, EyeOff, Scale } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ElectionResult } from "@/features/elections/queries/get-election";
import { formatDateTime, formatNumber } from "@/lib/format";

type ReasonText = { title: string; description: string };

const DEFAULT_REASON: ReasonText = {
  title: "Perolehan suara belum dapat dilihat",
  description:
    "Selama pemungutan suara berlangsung, perolehan tiap kandidat tidak ditampilkan kepada siapa pun — termasuk panitia dan administrator. Yang tersedia hanya angka partisipasi.",
};

const REASON_TEXT: Record<string, ReasonText> = {
  RESULT_NOT_AVAILABLE: DEFAULT_REASON,
  RESULT_NOT_PUBLISHED: {
    title: "Hasil belum dipublikasikan",
    description:
      "Pemungutan suara sudah ditutup, tetapi hasilnya belum diumumkan secara resmi dan Anda tidak memiliki hak melihat hasil sementara.",
  },
  FORBIDDEN: {
    title: "Anda tidak berhak melihat hasil ini",
    description:
      "Visibilitas hasil pemilihan ini dibatasi untuk penyelenggara.",
  },
  ELECTION_NOT_FOUND: {
    title: "Pemilihan tidak ditemukan",
    description: "Pemilihan ini tidak tersedia untuk Anda.",
  },
};

export function ResultView({
  result,
  reason,
}: {
  result: ElectionResult | null;
  reason: string | null;
}) {
  if (!result) {
    const text = REASON_TEXT[reason ?? ""] ?? DEFAULT_REASON;

    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-12 text-center">
        <EyeOff
          size={28}
          className="text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-[15px] font-semibold text-foreground">
          {text.title}
        </p>
        <p className="max-w-prose text-[13px] text-muted-foreground">
          {text.description}
        </p>
      </div>
    );
  }

  const top = result.candidates[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge tone={result.official ? "success" : "warning"}>
              {result.official ? "Hasil resmi" : "Hasil sementara"}
            </Badge>
            {result.outcome === "TIE" ? (
              <Badge tone="warning">SERI</Badge>
            ) : null}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {result.official && result.publishedAt
              ? `Dipublikasikan ${formatDateTime(result.publishedAt)}`
              : "Belum diumumkan secara resmi. Angka masih dapat berubah bila ditemukan insiden integritas."}
          </p>
        </div>

        <p className="text-[13px] text-muted-foreground">
          Total suara masuk:{" "}
          <span className="font-semibold text-foreground">
            {formatNumber(result.totalBallots)}
          </span>
        </p>
      </div>

      {result.outcome === "TIE" ? (
        <div className="flex items-start gap-2.5 rounded-md border border-warning/20 bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
          <Scale size={16} className="mt-px shrink-0" aria-hidden="true" />
          <span>
            Terdapat lebih dari satu kandidat dengan perolehan tertinggi yang
            sama. Sistem tidak memutuskan pemenang secara otomatis — penetapan
            mengikuti aturan musyawarah organisasi.
          </span>
        </div>
      ) : null}

      {result.outcome === "NO_VOTES" ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          Tidak ada satu pun suara yang masuk pada pemilihan ini.
        </p>
      ) : null}

      <ul className="space-y-3">
        {result.candidates.map((candidate) => {
          const isWinner =
            result.outcome === "DECIDED" &&
            top !== undefined &&
            candidate.candidateId === top.candidateId &&
            result.totalBallots > 0;

          return (
            <li
              key={candidate.candidateId}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-[14px] font-semibold text-accent-foreground"
                  >
                    {String(candidate.candidateNumber).padStart(2, "0")}
                  </span>

                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
                      {candidate.displayName}
                      {isWinner ? (
                        <Badge tone="success">
                          <Award size={12} aria-hidden="true" />
                          Perolehan tertinggi
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatNumber(candidate.voteCount)} suara ·{" "}
                      {candidate.votePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              <div
                role="progressbar"
                aria-valuenow={Math.round(candidate.votePercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Perolehan ${candidate.displayName}`}
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={
                    isWinner
                      ? "h-full rounded-full bg-success"
                      : "h-full rounded-full bg-primary"
                  }
                  style={{
                    width: `${Math.min(100, Math.max(0, candidate.votePercent))}%`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
