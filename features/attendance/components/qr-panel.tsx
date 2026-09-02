"use client";

import { useState, useTransition } from "react";
import { Copy, QrCode, RefreshCw, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  issueAttendanceQr,
  revokeAttendanceQr,
  type IssuedQr,
} from "@/features/attendance/actions/manage-qr";
import { formatDateTime } from "@/lib/format";

export function QrPanel({
  organizationId,
  sessionId,
  hasActiveToken,
  expiresAt,
}: {
  organizationId: string;
  sessionId: string;
  hasActiveToken: boolean;
  expiresAt: string | null;
}) {
  const { showToast } = useToast();
  const [issued, setIssued] = useState<IssuedQr | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [isPending, startTransition] = useTransition();

  function issue(minutes: number) {
    startTransition(async () => {
      const result = await issueAttendanceQr(
        organizationId,
        sessionId,
        minutes,
      );
      if (result.success) {
        setIssued(result.data);
        showToast("QR presensi diterbitkan.");
      } else {
        showToast(result.error, "error");
      }
    });
  }

  function runRevoke() {
    startTransition(async () => {
      const result = await revokeAttendanceQr(organizationId, sessionId);
      setRevoking(false);
      if (result.success) {
        setIssued(null);
        showToast("QR presensi dicabut.");
      } else {
        showToast(result.error, "error");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Presensi QR</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            QR memuat token acak, bukan identitas. Siapa yang hadir ditentukan
            dari akun yang membuka tautannya.
          </p>
        </div>

        {hasActiveToken || issued ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRevoking(true)}
            disabled={isPending}
          >
            <ShieldOff size={14} aria-hidden="true" />
            Cabut
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {issued ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="rounded-md border border-border bg-white p-3"
              dangerouslySetInnerHTML={{ __html: issued.svg }}
            />

            <p className="text-center text-[13px] text-muted-foreground">
              Berlaku sampai {formatDateTime(issued.expiresAt)}
            </p>

            <div className="flex w-full items-start gap-2">
              <code className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 text-[12px] break-all">
                {issued.checkInUrl}
              </code>
              <Button
                variant="outline"
                size="iconSm"
                aria-label="Salin tautan presensi"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issued.checkInUrl);
                    showToast("Tautan disalin.");
                  } catch {
                    showToast("Gagal menyalin.", "error");
                  }
                }}
              >
                <Copy size={14} aria-hidden="true" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => issue(720)}
              disabled={isPending}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Terbitkan ulang
            </Button>
          </div>
        ) : hasActiveToken ? (
          <div className="space-y-3 text-center">
            <p className="text-[13px] text-muted-foreground">
              Sesi ini sudah memiliki QR aktif
              {expiresAt ? ` sampai ${formatDateTime(expiresAt)}` : ""}. Token
              mentahnya hanya ditampilkan sekali saat diterbitkan dan tidak
              disimpan, jadi tampilkan ulang dengan menerbitkan QR baru.
            </p>
            <Button onClick={() => issue(720)} disabled={isPending}>
              <RefreshCw size={16} aria-hidden="true" />
              Terbitkan QR Baru
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-[13px] text-muted-foreground">
              Terbitkan QR untuk membuka presensi mandiri lewat pemindaian.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => issue(240)} disabled={isPending}>
                <QrCode size={16} aria-hidden="true" />
                Terbitkan (4 jam)
              </Button>
              <Button
                variant="outline"
                onClick={() => issue(720)}
                disabled={isPending}
              >
                12 jam
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={revoking}
        onClose={() => setRevoking(false)}
        onConfirm={runRevoke}
        pending={isPending}
        destructive
        confirmLabel="Cabut QR"
        title="Cabut QR presensi?"
        description="QR yang sudah dibagikan berhenti berlaku seketika. Catatan kehadiran yang sudah masuk tidak terpengaruh."
      />
    </Card>
  );
}
