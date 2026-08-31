"use client";

import { useActionState, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { changeMemberStatus } from "@/features/members/actions/manage-member";
import { MEMBER_STATUSES } from "@/features/members/schemas/member.schema";
import type { ActionResult } from "@/lib/errors";
import { memberStatus } from "@/lib/status";

/**
 * Perubahan status keanggotaan.
 *
 * Dipisahkan dari form penyuntingan biasa karena akibatnya berbeda: status
 * menentukan apakah seseorang masih anggota aktif, dan setiap perubahannya
 * menjadi riwayat permanen yang ditulis trigger database.
 *
 * Kepemilikan state dipisah dari isi dialog — sama seperti modul lain —
 * supaya penutupan setelah sukses menjadi pemanggilan callback, bukan
 * setState di dalam effect yang memicu render berantai.
 */
export function MemberStatusControl(props: {
  organizationId: string;
  memberId: string;
  currentStatus: string;
  memberName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw size={16} aria-hidden="true" />
        Ubah Status
      </Button>

      <StatusDialog
        // Form direset setiap kali dialog dibuka ulang.
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}

function StatusDialog({
  open,
  onClose,
  organizationId,
  memberId,
  currentStatus,
  memberName,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  memberId: string;
  currentStatus: string;
  memberName: string;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(changeMemberStatus.bind(null, organizationId, memberId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Status anggota diperbarui.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ubah Status Keanggotaan"
      description={`Perubahan status ${memberName} tercatat permanen pada riwayat anggota.`}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Status Baru"
          htmlFor="member-status"
          required
          error={fieldErrors?.status?.[0]}
        >
          <Select
            id="member-status"
            name="status"
            required
            defaultValue={currentStatus}
          >
            {MEMBER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {memberStatus(status).label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Alasan"
          htmlFor="member-status-reason"
          hint="Opsional, tetapi sangat membantu ketika riwayat ini dibaca beberapa periode kemudian."
          error={fieldErrors?.reason?.[0]}
        >
          <Textarea
            id="member-status-reason"
            name="reason"
            rows={3}
            maxLength={500}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Ubah Status</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
