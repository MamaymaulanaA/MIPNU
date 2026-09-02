"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { TINGGI_KONTROL_RINGKAS } from "@/components/ui/control";
import { cn } from "@/lib/utils";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementStatus,
  updateAnnouncement,
} from "@/features/announcements/actions/manage-announcement";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUSES,
  type AnnouncementStatus,
} from "@/features/announcements/schemas/announcement.schema";
import type { ActionResult } from "@/lib/errors";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { announcementAudience, announcementStatus } from "@/lib/status";

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  audienceType: string;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
};

export type AnnouncementPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canPublish: boolean;
  canManageAudience: boolean;
  canDelete: boolean;
};

/** Keadaan toolbar dan pagination — seluruhnya dari URL, diproses di server. */
export type KeadaanDaftar = {
  cari: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  halaman: number;
  total: number;
  ukuranHalaman: number;
};

export function AnnouncementManager({
  organizationId,
  announcements,
  permissions,
  readOnly,
  daftar,
}: {
  organizationId: string;
  announcements: AnnouncementRow[];
  permissions: AnnouncementPermissions;
  /** Pembaca biasa: hanya menerima pengumuman yang sudah terbit untuknya. */
  readOnly: boolean;
  daftar: KeadaanDaftar;
}) {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [deleting, setDeleting] = useState<AnnouncementRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const disaring = daftar.cari !== "" || daftar.status !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengumuman"
        description={
          readOnly
            ? "Pengumuman yang ditujukan untuk Anda."
            : "Pengumuman organisasi beserta draf dan arsipnya."
        }
        actions={
          permissions.canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Tulis Pengumuman
            </Button>
          ) : undefined
        }
      />

      {/*
        SATU kartu: toolbar, daftar, dan kaki halaman.

        Sempat saya pisah menjadi tiga kartu dengan alasan tiap pengumuman
        sudah berupa kartu sendiri, sehingga membungkusnya berarti kartu di
        dalam kartu. Alasan itu tidak berdiri: kartu luar memberi kerangka —
        toolbar di atas, kaki di bawah — sementara kartu dalam memberi batas
        antar-item. Keduanya menjelaskan hal yang berbeda, dan memisahkannya
        justru membuat halaman ini satu-satunya yang berbeda dari sembilan
        halaman manajemen lain.
      */}
      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari pengumuman…"
          searchLabel="Cari pengumuman"
          filters={[
            {
              key: "status",
              label: "Saring menurut status",
              value: daftar.status,
              allLabel: "Semua status",
              options: daftar.statusOptions,
            },
          ]}
        />

        {announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={
              disaring
                ? "Tidak ada pengumuman yang cocok"
                : "Belum ada pengumuman"
            }
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan status."
                : readOnly
                  ? "Pengumuman yang ditujukan untuk Anda akan tampil di sini."
                  : "Pengumuman lahir sebagai draf dan baru terlihat anggota setelah diterbitkan."
            }
          />
        ) : (
          /* Daftar ikut aturan data panjang: dibatasi tingginya dan menggulir
             di dalam kartunya, memakai `.scroll-area` yang sama dengan tabel. */
          <div className="scroll-area max-h-[calc(100dvh-22rem)] space-y-3 p-4 sm:p-5">
            {announcements.map((row) => {
              const status = announcementStatus(row.status);
              const audience = announcementAudience(row.audienceType);

              return (
                <Card key={row.id}>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {row.title}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {row.publishedAt
                            ? `Terbit ${formatDateTime(row.publishedAt)}`
                            : "Belum diterbitkan"}
                          {row.expiresAt
                            ? ` · berlaku sampai ${formatDateTime(row.expiresAt)}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={audience.tone}>{audience.label}</Badge>
                        {readOnly ? null : (
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-[13px] whitespace-pre-line text-muted-foreground">
                      {row.content}
                    </p>

                    {readOnly ? null : (
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {permissions.canPublish ? (
                          <Select
                            aria-label={`Status ${row.title}`}
                            value={row.status}
                            disabled={isPending}
                            className={cn(
                              TINGGI_KONTROL_RINGKAS,
                              // Memeluk nilai yang sedang tampil.
                              // `min-w-32` yang lama membatalkan hal itu:
                              // lantai 128px membuat status sependek
                              // "Draf" tetap duduk di kotak selebar itu.
                              // `w-auto` tetap ada sebagai jaring pengaman
                              // untuk peramban tanpa `field-sizing`.
                              "field-sizing-content w-auto text-[13px]",
                            )}
                            onChange={(event) => {
                              const next = event.target
                                .value as AnnouncementStatus;

                              startTransition(async () => {
                                const result = await setAnnouncementStatus(
                                  organizationId,
                                  row.id,
                                  next,
                                );
                                if (!result.success) {
                                  showToast(result.error, "error");
                                }
                              });
                            }}
                          >
                            {ANNOUNCEMENT_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {announcementStatus(value).label}
                              </option>
                            ))}
                          </Select>
                        ) : null}

                        {permissions.canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Ubah
                          </Button>
                        ) : null}

                        {permissions.canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Hapus
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(
            1,
            Math.ceil(daftar.total / daftar.ukuranHalaman),
          )}
          total={daftar.total}
          pageSize={daftar.ukuranHalaman}
        />
      </Card>

      <AnnouncementDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        canManageAudience={permissions.canManageAudience}
      />

      <AnnouncementDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        canManageAudience={permissions.canManageAudience}
        announcement={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;

          startTransition(async () => {
            const result = await deleteAnnouncement(organizationId, target.id);
            setDeleting(null);
            showToast(
              result.success ? "Pengumuman dihapus." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title="Hapus pengumuman ini?"
        description="Pengumuman disembunyikan dari daftar dan tidak lagi diterima anggota."
      />
    </div>
  );
}

/* ========================================================================== */

function AnnouncementDialog({
  open,
  onClose,
  organizationId,
  canManageAudience,
  announcement,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  canManageAudience: boolean;
  announcement?: AnnouncementRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(announcement);

  const action = isEdit
    ? updateAnnouncement.bind(null, organizationId, announcement!.id)
    : createAnnouncement.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Pengumuman diperbarui." : "Pengumuman dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Pengumuman" : "Tulis Pengumuman"}
      description="Pengumuman baru tersimpan sebagai draf. Terbitkan lewat kolom status setelah siap."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Judul"
          htmlFor="ann-title"
          required
          error={fieldErrors?.title?.[0]}
        >
          <Input
            id="ann-title"
            name="title"
            required
            maxLength={200}
            defaultValue={announcement?.title ?? ""}
            aria-invalid={Boolean(fieldErrors?.title)}
          />
        </Field>

        <Field
          label="Isi"
          htmlFor="ann-content"
          required
          error={fieldErrors?.content?.[0]}
        >
          <Textarea
            id="ann-content"
            name="content"
            rows={6}
            required
            maxLength={20000}
            defaultValue={announcement?.content ?? ""}
            aria-invalid={Boolean(fieldErrors?.content)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sasaran"
            htmlFor="ann-audience"
            required
            hint={
              canManageAudience
                ? "Pengurus hanya terlihat oleh pemegang akses kepengurusan."
                : "Anda belum berhak mengatur sasaran; pengumuman ditujukan ke semua anggota."
            }
          >
            <Select
              id="ann-audience"
              name="audienceType"
              required
              disabled={!canManageAudience}
              defaultValue={announcement?.audienceType ?? "ALL_MEMBERS"}
            >
              {ANNOUNCEMENT_AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {announcementAudience(value).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Berlaku Sampai"
            htmlFor="ann-expires"
            hint="Kosongkan bila tidak ada batas waktu."
          >
            <Input
              id="ann-expires"
              name="expiresAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(announcement?.expiresAt)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Simpan Draf"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
