"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ShieldCheck, Vote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { castVote } from "@/features/elections/actions/manage-elections";
import type {
  CandidateRow,
  OwnVoterState,
} from "@/features/elections/queries/get-election";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Bilik suara.
 *
 * Memilih kandidat tidak langsung mengirim suara: satu langkah konfirmasi wajib
 * menyebut nomor dan nama, karena ketukan tak sengaja tidak boleh menjadi suara
 * yang tak dapat ditarik (EVOTING §135). Yang dikirim hanya id pemilihan dan id
 * kandidat; identitas pemilih diselesaikan server. Tanda terima tidak disimpan
 * di mana pun — ia membuktikan suara tercatat, bukan suara mana.
 */
export function VotePanel({
  organizationId,
  electionId,
  candidates,
  voterState,
  votingOpen,
  canVote,
}: {
  organizationId: string;
  electionId: string;
  candidates: CandidateRow[];
  voterState: OwnVoterState;
  votingOpen: boolean;
  canVote: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [receipt, setReceipt] = useState<{
    receipt: string;
    votedAt: string;
  } | null>(null);

  if (!voterState.inDpt) {
    return (
      <Notice
        title="Anda tidak terdaftar sebagai pemilih"
        description="Nama Anda tidak berada dalam Daftar Pemilih Tetap pemilihan ini. Hubungi panitia bila menurut Anda ini keliru."
      />
    );
  }

  if (!voterState.eligible) {
    return (
      <Notice
        title="Hak pilih Anda tidak aktif"
        description="Anda tercatat di DPT, tetapi hak pilih Anda sedang tidak aktif pada pemilihan ini."
      />
    );
  }

  if (voterState.hasVoted && !receipt) {
    return (
      <Notice
        tone="success"
        title="Anda sudah memberikan suara"
        description={
          voterState.votedAt
            ? `Suara Anda tercatat pada ${formatDateTime(voterState.votedAt)}. Pilihan tidak dapat diubah, dan tidak ditampilkan kepada siapa pun.`
            : "Suara Anda sudah tercatat. Pilihan tidak dapat diubah."
        }
      />
    );
  }

  if (receipt) {
    return (
      <div className="space-y-4 rounded-md border border-success/20 bg-success-soft p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2
            size={22}
            className="mt-px shrink-0 text-success"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-success">
              Suara Anda tercatat
            </p>
            <p className="text-[13px] text-success">
              Tercatat pada {formatDateTime(receipt.votedAt)}. Pilihan tidak
              dapat diubah.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-success/20 bg-card p-4">
          <p className="text-[13px] font-medium text-foreground">
            Tanda terima Anda
          </p>
          <p className="break-all font-mono text-[13px] text-foreground">
            {receipt.receipt}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Simpan bila Anda menginginkannya. Tanda terima ini membuktikan suara
            Anda tercatat — ia tidak memuat dan tidak dapat mengungkap pilihan
            Anda. Kode ini hanya ditampilkan sekali dan tidak disimpan sistem.
          </p>
        </div>
      </div>
    );
  }

  if (!votingOpen) {
    return (
      <Notice
        title="Pemungutan suara belum dibuka"
        description="Anda berhak memilih pada pemilihan ini. Kembali lagi setelah pemungutan suara dibuka sesuai jadwal."
      />
    );
  }

  if (!canVote) {
    return (
      <Notice
        title="Anda tidak memiliki izin memilih"
        description="Hubungi pengurus organisasi Anda bila menurut Anda ini keliru."
      />
    );
  }

  const selectable = candidates.filter(
    (candidate) => candidate.status === "ACTIVE",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-md border border-info/20 bg-info-soft px-3 py-2.5 text-[13px] text-info">
        <ShieldCheck size={16} className="mt-px shrink-0" aria-hidden="true" />
        <span>
          Pilihan Anda bersifat rahasia. Sistem mencatat bahwa Anda sudah
          memilih, terpisah dari catatan suara yang Anda berikan.
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {selectable.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              onClick={() => setSelected(candidate)}
              disabled={isPending}
              className={cn(
                "flex w-full items-start gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors",
                "hover:border-primary/40 hover:bg-accent/40",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-[16px] font-semibold text-accent-foreground"
              >
                {String(candidate.candidateNumber).padStart(2, "0")}
              </span>

              <span className="min-w-0 space-y-1">
                <span className="block text-[15px] font-semibold text-foreground">
                  {candidate.displayName}
                </span>
                {candidate.vision ? (
                  <span className="line-clamp-3 block text-[13px] text-muted-foreground">
                    {candidate.vision}
                  </span>
                ) : (
                  <span className="block text-[13px] text-muted-foreground">
                    Nomor urut {candidate.candidateNumber}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selectable.length === 0 ? (
        <Notice
          title="Belum ada kandidat yang dapat dipilih"
          description="Hubungi panitia pemilihan."
        />
      ) : null}

      <Dialog
        open={selected !== null}
        onClose={() => (isPending ? undefined : setSelected(null))}
        title="Kirim suara Anda?"
        description={
          selected
            ? `Anda memilih Kandidat Nomor ${String(selected.candidateNumber).padStart(2, "0")} — ${selected.displayName}. Setelah dikirim, pilihan tidak dapat diubah.`
            : ""
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              disabled={isPending}
            >
              Periksa Lagi
            </Button>
            <Button
              disabled={isPending}
              onClick={() => {
                const candidate = selected;
                if (!candidate) return;

                startTransition(async () => {
                  const result = await castVote(
                    organizationId,
                    electionId,
                    candidate.id,
                  );

                  if (!result.success) {
                    setSelected(null);
                    showToast(result.error, "error");
                    return;
                  }

                  setSelected(null);
                  setReceipt(result.data);
                });
              }}
            >
              <Vote size={16} aria-hidden="true" />
              {isPending ? "Mengirim…" : "Kirim Suara"}
            </Button>
          </>
        }
      />
    </div>
  );
}

function Notice({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div
      className={cn(
        "space-y-1 rounded-md border px-4 py-5",
        tone === "success"
          ? "border-success/20 bg-success-soft"
          : "border-border bg-muted",
      )}
    >
      <p
        className={cn(
          "text-[15px] font-semibold",
          tone === "success" ? "text-success" : "text-foreground",
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "text-[13px]",
          tone === "success" ? "text-success" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
    </div>
  );
}
