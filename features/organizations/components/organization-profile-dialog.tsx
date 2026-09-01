"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  OrganizationFields,
  type OrganizationFieldValues,
} from "@/features/organizations/components/organization-fields";
import { updateOrganization } from "@/features/organizations/actions/manage-organization";
import type { ActionResult } from "@/lib/errors";

/**
 * Penyuntingan profil organisasi, di dalam dialog.
 *
 * Sebelumnya ini halaman tersendiri di `/organisasi/edit`. Dipindah ke dialog
 * agar sama dengan seluruh CRUD MIPNU lainnya — agenda, event, periode,
 * jabatan, program, rapat, dan sisanya semua menyunting di tempat. Profil
 * organisasi adalah satu-satunya yang masih memindahkan pengguna ke halaman
 * lain untuk mengubah sepuluh field, lalu memulangkannya.
 *
 * TIDAK ADA MODEL OTORISASI BARU DI SINI. Tombolnya hanya dirender ketika
 * pemanggil memegang `organization.edit` — tetapi itu urusan tampilan, bukan
 * keamanan. Yang menahan perubahan tetap `updateOrganization`, yang memanggil
 * `requireOrganizationPermission` sebelum menyentuh basis data, lalu RLS
 * memeriksanya sekali lagi. Menyembunyikan tombol bukan pengamanan
 * (AGENTS.md §56).
 *
 * Organisasi yang diubah juga tidak berasal dari form. Server action menulis
 * ke `context.organizationId` hasil pemeriksaan otorisasi, jadi memalsukan
 * payload tidak dapat mengarahkan perubahan ke tenant lain.
 */
export function OrganizationProfileDialog({
  organizationId,
  values,
}: {
  organizationId: string;
  values: OrganizationFieldValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil size={16} aria-hidden="true" />
        Ubah Profil
      </Button>

      {/*
        `key` mengikuti keadaan terbuka supaya isinya benar-benar dimuat ulang
        setiap kali dibuka. Tanpa itu, form yang pernah gagal validasi akan
        dibuka kembali lengkap dengan pesan error lamanya, dan field yang
        sempat diketik lalu dibatalkan tetap membawa nilai yang batal itu.
      */}
      <EditDialog
        key={open ? "terbuka" : "tertutup"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        values={values}
      />
    </>
  );
}

function EditDialog({
  open,
  onClose,
  organizationId,
  values,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  values: OrganizationFieldValues;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateOrganization.bind(null, organizationId), null);

  useEffect(() => {
    if (!state?.success) return;
    showToast("Perubahan profil organisasi tersimpan.");
    onClose();
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ubah Profil Organisasi"
      description="Jenis, tingkat, dan slug tidak dapat diubah karena menentukan identitas organisasi."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <OrganizationFields values={values} fieldErrors={fieldErrors} />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Simpan Perubahan</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
