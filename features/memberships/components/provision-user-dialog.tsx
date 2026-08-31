"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, Mail, UserPlus } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  provisionUser,
  type ProvisionResult,
} from "@/features/memberships/actions/provision-user";
import type { ActionResult } from "@/lib/errors";

export type RoleOption = { id: string; code: string; name: string };
export type UnlinkedMember = { id: string; label: string };

export function ProvisionUserDialog({
  organizationId,
  roleOptions,
  unlinkedMembers,
}: {
  organizationId: string;
  roleOptions: RoleOption[];
  unlinkedMembers: UnlinkedMember[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus size={16} aria-hidden="true" />
        Buat Akun Pengguna
      </Button>

      <ProvisionDialog
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        roleOptions={roleOptions}
        unlinkedMembers={unlinkedMembers}
      />
    </>
  );
}

function ProvisionDialog({
  open,
  onClose,
  organizationId,
  roleOptions,
  unlinkedMembers,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  roleOptions: RoleOption[];
  unlinkedMembers: UnlinkedMember[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<ProvisionResult> | null,
    FormData
  >(provisionUser.bind(null, organizationId), null);

  useEffect(() => {
    if (state?.success && state.data.emailSent) {
      showToast("Undangan terkirim ke email pengguna.");
    }
  }, [state, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  // Berhasil TANPA email terkirim: tautan aktivasi diserahkan ke admin.
  if (state?.success && !state.data.emailSent) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title="Akun dibuat"
        description="Pengiriman email belum aktif di environment ini, jadi sampaikan tautan berikut lewat kanal yang Anda percaya."
        footer={<Button onClick={onClose}>Selesai</Button>}
      >
        {state.data.inviteLink ? (
          <InviteLinkBox link={state.data.inviteLink} />
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Akun sudah dibuat, tetapi tautan aktivasi tidak dapat diterbitkan.
            Minta pengguna memakai menu &ldquo;Lupa kata sandi&rdquo; di halaman
            masuk.
          </p>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Buat Akun Pengguna"
      description="Akun tidak menduplikasi data anggota — ia ditautkan ke anggota yang sudah ada."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Email"
          htmlFor="provision-email"
          required
          hint="Dipakai untuk masuk dan menerima tautan aktivasi."
          error={fieldErrors?.email?.[0]}
        >
          <Input
            id="provision-email"
            name="email"
            type="email"
            required
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors?.email)}
          />
        </Field>

        <Field
          label="Nama Tampilan"
          htmlFor="provision-name"
          required
          error={fieldErrors?.displayName?.[0]}
        >
          <Input
            id="provision-name"
            name="displayName"
            required
            maxLength={100}
            aria-invalid={Boolean(fieldErrors?.displayName)}
          />
        </Field>

        <Field
          label="Role di Organisasi"
          htmlFor="provision-role"
          required
          hint="Hanya role tingkat organisasi. Super Admin tidak dapat diberikan dari sini."
          error={fieldErrors?.roleId?.[0]}
        >
          <Select id="provision-role" name="roleId" required defaultValue="">
            <option value="">Pilih role</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Tautkan ke Anggota"
          htmlFor="provision-member"
          hint={
            unlinkedMembers.length === 0
              ? "Tidak ada anggota yang belum tertaut."
              : "Tanpa tautan ini, pengguna tidak dapat mendaftar event atau presensi mandiri."
          }
          error={fieldErrors?.memberId?.[0]}
        >
          <Select
            id="provision-member"
            name="memberId"
            defaultValue=""
            disabled={unlinkedMembers.length === 0}
          >
            <option value="">Tidak ditautkan</option>
            {unlinkedMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton pendingLabel="Membuat akun…">
            <Mail size={16} aria-hidden="true" />
            Buat &amp; Undang
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Tautan aktivasi sekali pakai.
 *
 * Ditampilkan sekali kepada admin yang memang berwenang dan tidak disimpan
 * di mana pun — bukan di database, bukan di audit log.
 */
export function InviteLinkBox({ link }: { link: string }) {
  const { showToast } = useToast();

  return (
    <div className="space-y-2">
      <p className="text-[13px] text-muted-foreground">
        Tautan ini memberi akses untuk menyetel kata sandi. Perlakukan seperti
        kata sandi: kirim lewat kanal privat, jangan dibagikan ulang.
      </p>

      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 rounded-md border border-border bg-muted px-3 py-2 text-[12px] break-all">
          {link}
        </code>
        <Button
          variant="outline"
          size="iconSm"
          aria-label="Salin tautan"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              showToast("Tautan disalin.");
            } catch {
              showToast(
                "Gagal menyalin. Salin manual dari kotak di samping.",
                "error",
              );
            }
          }}
        >
          <Copy size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
