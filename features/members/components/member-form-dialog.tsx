"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import {
  EMPTY_MEMBER_FIELDS,
  MemberFields,
  type MemberFieldValues,
} from "@/features/members/components/member-fields";
import { createMember } from "@/features/members/actions/create-member";
import { updateMember } from "@/features/members/actions/manage-member";

export function MemberCreateDialog({
  organizationId,
  canEditPrivate,
  canEditStatus,
  trigger = "utama",
}: {
  organizationId: string;
  canEditPrivate: boolean;
  canEditStatus: boolean;
  trigger?: "utama" | "ringkas";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger === "utama" ? (
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden="true" />
          Tambah Anggota
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          Tambah anggota pertama
        </Button>
      )}

      <FormDialog
        key={open ? "tambah-terbuka" : "tambah-tertutup"}
        open={open}
        onClose={() => setOpen(false)}
        title="Tambah Anggota"
        description="Data anggota tersimpan pada organisasi yang sedang aktif."
        action={createMember.bind(null, organizationId)}
        submitLabel="Simpan Anggota"
        successMessage="Anggota ditambahkan."
      >
        {(fieldErrors) => (
          <MemberFields
            values={EMPTY_MEMBER_FIELDS}
            fieldErrors={fieldErrors}
            canEditPrivate={canEditPrivate}
            canEditStatus={canEditStatus}
          />
        )}
      </FormDialog>
    </>
  );
}

export function MemberEditDialog({
  organizationId,
  memberId,
  memberName,
  values,
  canEditPrivate,
  canEditStatus,
  variant = "baris",
}: {
  organizationId: string;
  memberId: string;
  memberName: string;
  values: MemberFieldValues;
  canEditPrivate: boolean;
  canEditStatus: boolean;
  variant?: "baris" | "utama";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "baris" ? (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil size={14} aria-hidden="true" />
          Ubah
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <Pencil size={16} aria-hidden="true" />
          Ubah
        </Button>
      )}

      <FormDialog
        key={open ? `ubah-${memberId}` : "ubah-tertutup"}
        open={open}
        onClose={() => setOpen(false)}
        title="Ubah Anggota"
        description={memberName}
        action={updateMember.bind(null, organizationId, memberId)}
        submitLabel="Simpan Perubahan"
        successMessage="Data anggota tersimpan."
      >
        {(fieldErrors) => (
          <MemberFields
            values={values}
            fieldErrors={fieldErrors}
            canEditPrivate={canEditPrivate}
            canEditStatus={canEditStatus}
          />
        )}
      </FormDialog>
    </>
  );
}
