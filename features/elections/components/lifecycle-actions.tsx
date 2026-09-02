"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Archive,
  Ban,
  CheckCircle2,
  Lock,
  Megaphone,
  PlayCircle,
} from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  advanceElectionStage,
  archiveElection,
  cancelElection,
  closeElection,
  openElection,
  publishElectionResult,
} from "@/features/elections/actions/manage-elections";
import type { ActionResult } from "@/lib/errors";

export type LifecyclePermissions = {
  canEdit: boolean;
  canOpen: boolean;
  canClose: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canManage: boolean;
};

export function LifecycleActions({
  organizationId,
  electionId,
  status,
  permissions,
  readyToOpen,
  readyToPublish,
}: {
  organizationId: string;
  electionId: string;
  status: string;
  permissions: LifecyclePermissions;
  readyToOpen: boolean;
  readyToPublish: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<
    "open" | "close" | "publish" | "archive" | null
  >(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  function run(action: () => Promise<ActionResult<{ status: string }>>) {
    startTransition(async () => {
      const result = await action();
      setConfirm(null);

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      showToast("Tahapan pemilihan diperbarui.", "success");
    });
  }

  const preOpen =
    status === "DRAFT" || status === "REGISTRATION" || status === "SCHEDULED";

  return (
    <div className="flex flex-wrap gap-2">
      {permissions.canEdit && status === "DRAFT" ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(() =>
              advanceElectionStage(organizationId, electionId, "SCHEDULED"),
            )
          }
        >
          Tandai Terjadwal
        </Button>
      ) : null}

      {permissions.canOpen && preOpen ? (
        <Button
          disabled={isPending || !readyToOpen}
          title={
            readyToOpen
              ? undefined
              : "Pemilihan belum siap: kandidat aktif dan DPT harus terisi."
          }
          onClick={() => setConfirm("open")}
        >
          <PlayCircle size={16} aria-hidden="true" />
          Buka Pemungutan Suara
        </Button>
      ) : null}

      {permissions.canClose && status === "OPEN" ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirm("close")}
        >
          <Lock size={16} aria-hidden="true" />
          Tutup Pemungutan Suara
        </Button>
      ) : null}

      {permissions.canPublish && status === "CLOSED" ? (
        <Button
          disabled={isPending || !readyToPublish}
          title={
            readyToPublish
              ? undefined
              : "Pemeriksaan integritas belum lolos. Hasil tidak dapat dipublikasikan."
          }
          onClick={() => setConfirm("publish")}
        >
          <Megaphone size={16} aria-hidden="true" />
          Publikasikan Hasil
        </Button>
      ) : null}

      {permissions.canArchive &&
      (status === "PUBLISHED" || status === "CANCELLED") ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => setConfirm("archive")}
        >
          <Archive size={16} aria-hidden="true" />
          Arsipkan
        </Button>
      ) : null}

      {permissions.canManage && (preOpen || status === "OPEN") ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => setCancelOpen(true)}
        >
          <Ban size={16} aria-hidden="true" />
          Batalkan
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirm === "open"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => openElection(organizationId, electionId))}
        title="Buka pemungutan suara?"
        description="Setelah dibuka, daftar kandidat dan DPT terkunci dan tidak dapat diubah lagi. Perolehan suara tidak akan terlihat oleh siapa pun sampai pemungutan ditutup."
        confirmLabel="Buka Sekarang"
        pending={isPending}
      />

      <ConfirmDialog
        open={confirm === "close"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => closeElection(organizationId, electionId))}
        title="Tutup pemungutan suara?"
        description="Suara tidak dapat lagi masuk setelah ini. Hasil sementara dapat dihitung, tetapi belum resmi sampai dipublikasikan."
        confirmLabel="Tutup Sekarang"
        pending={isPending}
      />

      <ConfirmDialog
        open={confirm === "publish"}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          run(() => publishElectionResult(organizationId, electionId))
        }
        title="Publikasikan hasil?"
        description="Hasil menjadi resmi dan terlihat sesuai visibilitas yang dipilih. Publikasi tidak dapat ditarik kembali."
        confirmLabel="Publikasikan"
        pending={isPending}
      />

      <ConfirmDialog
        open={confirm === "archive"}
        onClose={() => setConfirm(null)}
        onConfirm={() => run(() => archiveElection(organizationId, electionId))}
        title="Arsipkan pemilihan?"
        description="Pemilihan menjadi histori dan tidak lagi muncul sebagai kegiatan berjalan. Datanya tetap tersimpan."
        confirmLabel="Arsipkan"
        pending={isPending}
      />

      <CancelDialog
        organizationId={organizationId}
        electionId={electionId}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}

function CancelDialog({
  organizationId,
  electionId,
  open,
  onClose,
}: {
  organizationId: string;
  electionId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ status: string }> | null,
    FormData
  >(cancelElection.bind(null, organizationId, electionId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Pemilihan dibatalkan.", "success");
      onClose();
    }
  }, [state, showToast, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Batalkan pemilihan?"
      description="Surat suara yang sudah masuk TIDAK dihapus. Pembatalan membuat hasilnya tidak resmi, dan alasannya tercatat pada jejak audit."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state?.success === false ? state.error : ""} />

        <Field label="Alasan pembatalan" htmlFor="cancel-reason" required>
          <Textarea
            id="cancel-reason"
            name="reason"
            rows={3}
            required
            minLength={5}
            maxLength={500}
            placeholder="Mis. kuorum tidak terpenuhi pada rapat pleno."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Kembali
          </Button>
          <SubmitButton variant="destructive" pendingLabel="Membatalkan…">
            <CheckCircle2 size={16} aria-hidden="true" />
            Batalkan Pemilihan
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
