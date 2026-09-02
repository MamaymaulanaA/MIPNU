"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormDialog } from "@/components/forms/form-dialog";
import { Button } from "@/components/ui/button";
import {
  OrganizationFields,
  type OrganizationFieldValues,
} from "@/features/organizations/components/organization-fields";
import { updateOrganization } from "@/features/organizations/actions/manage-organization";

/**
 * Penyuntingan profil organisasi yang sedang aktif, di dalam dialog.
 *
 * Sebelumnya ini halaman tersendiri di `/organisasi/edit`. Dipindah ke dialog
 * agar sama dengan seluruh CRUD MIPNU lainnya.
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

      <FormDialog
        key={open ? "terbuka" : "tertutup"}
        open={open}
        onClose={() => setOpen(false)}
        title="Ubah Profil Organisasi"
        description="Jenis, tingkat, dan slug tidak dapat diubah karena menentukan identitas organisasi."
        action={updateOrganization.bind(null, organizationId)}
        submitLabel="Simpan Perubahan"
        successMessage="Perubahan profil organisasi tersimpan."
      >
        {(fieldErrors) => (
          <OrganizationFields values={values} fieldErrors={fieldErrors} />
        )}
      </FormDialog>
    </>
  );
}
