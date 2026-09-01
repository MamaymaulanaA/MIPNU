"use client";

import { useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";

import { FormDialog } from "@/components/forms/form-dialog";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import {
  EMPTY_ORGANIZATION_FIELDS,
  OrganizationFields,
  type OrganizationFieldValues,
} from "@/features/organizations/components/organization-fields";
import {
  createOrganization,
  updateOrganization,
} from "@/features/organizations/actions/manage-organization";
import { organizationStatus } from "@/lib/status";

export type ReferenceOption = { id: string; label: string };

export type OrganizationRow = OrganizationFieldValues & {
  id: string;
  slug: string;
  status: string;
  typeCode: string;
  levelCode: string;
};

/**
 * Daftar seluruh organisasi platform, beserta pembuatan dan penyuntingannya.
 *
 * Pembuatan DULU berupa halaman tersendiri di `/admin/organisasi/baru`.
 * Sekarang keduanya — buat dan ubah — memakai dialog, sama seperti seluruh
 * CRUD MIPNU lainnya, sehingga tidak ada lagi satu halaman yang berperilaku
 * berbeda dari dua puluh enam modul di sebelahnya.
 *
 * OTORISASI TIDAK BERGESER. Kedua aksi memakai server action yang sudah ada:
 * `createOrganization` memeriksa permission global `organization.create`,
 * `updateOrganization` memeriksa `organization.edit` PADA organisasi yang
 * dituju lewat `requireOrganizationPermission`. Super admin lolos pemeriksaan
 * kedua karena `mipnu_access_context` memang memberinya konteks pada
 * organisasi mana pun — bukan karena dialog ini melewatkan sesuatu.
 */
export function OrganizationManager({
  organizations,
  types,
  levels,
  parents,
  cari,
  status,
  statusOptions,
  halaman,
  total,
  ukuranHalaman,
}: {
  organizations: OrganizationRow[];
  types: ReferenceOption[];
  levels: ReferenceOption[];
  parents: ReferenceOption[];
  /** Keadaan toolbar, seluruhnya berasal dari URL dan diproses di server. */
  cari: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  halaman: number;
  total: number;
  ukuranHalaman: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationRow | null>(null);

  return (
    /*
      Kepala halaman ikut dirender di sini, bukan di Server Component-nya.
      Alasannya satu: aksi utama di kepala dan tombol pada keadaan kosong
      membuka DIALOG YANG SAMA, dan keduanya perlu state yang sama. Memecahnya
      menjadi dua komponen berarti dua dialog pembuatan yang hidup berdampingan
      — persis "implementasi modal kedua" yang tidak boleh ada.

      Pengambilan datanya tetap seluruhnya di server; yang pindah ke sini hanya
      kerangka tampilannya.
    */
    <div className="space-y-5">
      <PageHeader
        title="Organisasi"
        description="Seluruh unit organisasi pada platform MIPNU."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Buat Organisasi
          </Button>
        }
      />

      <Card>
        <TableToolbar
          searchValue={cari}
          searchPlaceholder="Cari nama atau slug organisasi…"
          searchLabel="Cari organisasi"
          filters={[
            {
              key: "status",
              label: "Saring menurut status",
              value: status,
              allLabel: "Semua status",
              options: statusOptions,
            },
          ]}
        />

        {organizations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={
              cari || status
                ? "Tidak ada organisasi yang cocok"
                : "Belum ada organisasi"
            }
            description={
              cari || status
                ? "Coba ubah kata kunci atau saringan status."
                : "Buat organisasi pertama, lalu tautkan operator agar organisasi tersebut dapat mulai dikelola."
            }
            action={
              cari || status ? undefined : (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Buat organisasi pertama
                </Button>
              )
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Nama</TableHeaderCell>
                  <TableHeaderCell>Jenis</TableHeaderCell>
                  <TableHeaderCell>Tingkat</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Slug
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {organizations.map((organization) => {
                  const status = organizationStatus(organization.status);

                  return (
                    <TableRow key={organization.id}>
                      <TableCell className="font-medium text-foreground">
                        {organization.name}
                      </TableCell>

                      <TableCell>
                        {/* IPNU dan IPPNU dibedakan oleh KODENYA yang tertulis
                            di sini, bukan oleh warna. Menyandikannya sebagai
                            hijau/ungu menuntut pembaca menghafal arti warna,
                            dan tidak menyampaikan apa pun kepada pembaca yang
                            tidak dapat membedakannya (docs/UI.md §8). */}
                        <span className="inline-flex items-center rounded-sm border border-primary-border bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-hover">
                          {organization.typeCode}
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {organization.levelCode}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {organization.slug}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditing(organization)}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Ubah
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}

        <Pagination
          page={halaman}
          pageCount={Math.max(1, Math.ceil(total / ukuranHalaman))}
          total={total}
          pageSize={ukuranHalaman}
        />
      </Card>

      <FormDialog
        key={createOpen ? "buat-terbuka" : "buat-tertutup"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Organisasi"
        description="Setelah dibuat, tautkan seorang operator agar organisasi ini dapat mulai dikelola."
        action={createOrganization}
        submitLabel="Buat Organisasi"
        successMessage="Organisasi berhasil dibuat."
      >
        {(fieldErrors) => (
          <OrganizationFields
            values={EMPTY_ORGANIZATION_FIELDS}
            fieldErrors={fieldErrors}
            identitySlot={
              <IdentityFields
                types={types}
                levels={levels}
                parents={parents}
                fieldErrors={fieldErrors}
              />
            }
          />
        )}
      </FormDialog>

      <FormDialog
        key={editing?.id ?? "ubah-tertutup"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Ubah Organisasi"
        description="Jenis, tingkat, dan slug tidak dapat diubah karena menentukan identitas organisasi."
        action={updateOrganization.bind(null, editing?.id ?? "")}
        submitLabel="Simpan Perubahan"
        successMessage="Perubahan organisasi tersimpan."
      >
        {(fieldErrors) => (
          <OrganizationFields
            values={editing ?? EMPTY_ORGANIZATION_FIELDS}
            fieldErrors={fieldErrors}
          />
        )}
      </FormDialog>
    </div>
  );
}

/**
 * Slug, jenis, tingkat, dan induk — hanya ada saat pembuatan.
 *
 * Keempatnya menentukan identitas organisasi. Slug dipakai sebagai identifier
 * stabil, dan mengubahnya setelah beredar akan memutus tautan yang sudah ada;
 * `updateOrganizationSchema` memang tidak menerimanya.
 */
function IdentityFields({
  types,
  levels,
  parents,
  fieldErrors,
}: {
  types: ReferenceOption[];
  levels: ReferenceOption[];
  parents: ReferenceOption[];
  fieldErrors?: Record<string, string[]>;
}) {
  return (
    <>
      <Field
        label="Slug"
        htmlFor="slug"
        required
        hint="Identifier permanen. Tidak dapat diubah setelah dibuat."
        error={fieldErrors?.slug?.[0]}
      >
        <Input
          id="slug"
          name="slug"
          required
          maxLength={80}
          placeholder="pac-ipnu-nama-kecamatan"
          aria-invalid={Boolean(fieldErrors?.slug)}
        />
      </Field>

      <Field
        label="Jenis Organisasi"
        htmlFor="organizationTypeId"
        required
        error={fieldErrors?.organizationTypeId?.[0]}
      >
        <Select id="organizationTypeId" name="organizationTypeId" required>
          <option value="">Pilih jenis</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Tingkat Organisasi"
        htmlFor="organizationLevelId"
        required
        error={fieldErrors?.organizationLevelId?.[0]}
      >
        <Select id="organizationLevelId" name="organizationLevelId" required>
          <option value="">Pilih tingkat</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Organisasi Induk"
        htmlFor="parentOrganizationId"
        hint="Kosongkan bila ini organisasi tertinggi."
        error={fieldErrors?.parentOrganizationId?.[0]}
        className="sm:col-span-2"
      >
        <Select
          id="parentOrganizationId"
          name="parentOrganizationId"
          defaultValue=""
        >
          <option value="">Tanpa induk</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
