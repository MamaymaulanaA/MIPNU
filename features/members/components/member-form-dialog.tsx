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

/**
 * Penambahan dan penyuntingan anggota, di dalam dialog.
 *
 * Sebelumnya keduanya halaman tersendiri — `/anggota/baru` dan
 * `/anggota/[id]/edit`. Setelah Profil Organisasi dan Semua Organisasi pindah
 * ke dialog, Data Anggota tinggal satu-satunya modul yang masih memindahkan
 * pengguna ke halaman lain untuk mengisi form, lalu memulangkannya.
 *
 * `organizationId` diikat di server lewat `bind`, BUKAN dikirim sebagai input
 * tersembunyi. Field tersembunyi dapat disunting di browser; argumen yang
 * di-bind tidak — dan server tetap memvalidasinya ulang terhadap access
 * context. Perpindahan ke dialog tidak mengubah satu pun dari itu.
 */

/** Tombol tambah beserta dialognya. Dipakai di kepala halaman dan keadaan kosong. */
export function MemberCreateDialog({
  organizationId,
  canEditPrivate,
  canEditStatus,
  trigger = "utama",
}: {
  organizationId: string;
  canEditPrivate: boolean;
  canEditStatus: boolean;
  /** `ringkas` untuk tombol pada keadaan kosong. */
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

/** Tombol ubah beserta dialognya. Dipakai di baris tabel dan halaman rincian. */
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
  /** `baris` untuk aksi di dalam tabel, `utama` untuk kepala halaman rincian. */
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

      {/*
        `key` mengikuti keadaan terbuka supaya isinya benar-benar dimuat ulang
        setiap kali dibuka. Tanpa itu, dialog yang pernah gagal validasi akan
        dibuka kembali lengkap dengan pesan error lamanya — dan pada tabel,
        baris berikutnya akan membawa data baris sebelumnya.
      */}
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
