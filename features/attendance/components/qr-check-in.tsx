"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  checkInWithToken,
  type CheckInOutcome,
} from "@/features/attendance/actions/manage-qr";

const OUTCOME_COPY: Record<
  CheckInOutcome["reason"],
  { title: string; description: string; tone: "success" | "error" | "warning" }
> = {
  OK: {
    title: "Kehadiran tercatat",
    description: "Terima kasih. Presensi Anda sudah masuk.",
    tone: "success",
  },
  ALREADY_RECORDED: {
    title: "Anda sudah tercatat",
    description:
      "Kehadiran Anda pada sesi ini sudah tersimpan sebelumnya. Tidak perlu mengulang.",
    tone: "warning",
  },
  TOKEN_EXPIRED: {
    title: "QR sudah kedaluwarsa",
    description: "Minta panitia menampilkan QR yang baru, lalu pindai ulang.",
    tone: "error",
  },
  SESSION_CLOSED: {
    title: "Sesi presensi belum atau sudah tidak dibuka",
    description:
      "Presensi hanya dapat dilakukan selama sesi berstatus dibuka. Hubungi panitia.",
    tone: "error",
  },
  NOT_ELIGIBLE: {
    title: "Anda belum berhak melakukan presensi ini",
    description:
      "Akun Anda perlu ditautkan ke data anggota pada organisasi penyelenggara. Hubungi operator organisasi Anda.",
    tone: "error",
  },
  INVALID_TOKEN: {
    title: "QR tidak dikenali",
    description:
      "Tautan presensi tidak valid. Pindai ulang QR yang ditampilkan panitia.",
    tone: "error",
  },
};

export function QrCheckIn({ token }: { token: string }) {
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setFailure(null);

    startTransition(async () => {
      const result = await checkInWithToken(token);
      if (result.success) {
        setOutcome(result.data);
      } else {
        setFailure(result.error);
      }
    });
  }

  if (outcome) {
    const copy = OUTCOME_COPY[outcome.reason];
    const toneClass =
      copy.tone === "success"
        ? "bg-success-soft text-success"
        : copy.tone === "warning"
          ? "bg-warning-soft text-warning"
          : "bg-destructive-soft text-destructive";

    return (
      <Card>
        <div className="space-y-3 px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className={`mx-auto grid size-11 place-items-center rounded-md ${toneClass}`}
          >
            {copy.tone === "success" ? (
              <CheckCircle2 size={20} strokeWidth={1.9} />
            ) : (
              <AlertCircle size={20} strokeWidth={1.9} />
            )}
          </span>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{copy.title}</p>
            {outcome.sessionName ? (
              <p className="text-[13px] text-muted-foreground">
                {outcome.sessionName}
              </p>
            ) : null}
            <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-1">
            {outcome.sessionId ? (
              <Button variant="outline" asChild>
                <Link href={`/presensi/${outcome.sessionId}`}>Lihat sesi</Link>
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Ke dashboard</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4 px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-11 place-items-center rounded-md bg-accent text-accent-foreground"
        >
          <ScanLine size={20} strokeWidth={1.9} />
        </span>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Konfirmasi kehadiran
          </p>
          <p className="mx-auto max-w-sm text-[13px] text-muted-foreground">
            Kehadiran akan dicatat atas nama akun yang sedang Anda gunakan.
          </p>
        </div>

        {failure ? (
          <p
            role="alert"
            className="mx-auto max-w-sm rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2 text-[13px] text-destructive"
          >
            {failure}
          </p>
        ) : null}

        <Button onClick={submit} disabled={isPending}>
          {isPending ? "Mencatat…" : "Catat Kehadiran Saya"}
        </Button>
      </div>
    </Card>
  );
}
