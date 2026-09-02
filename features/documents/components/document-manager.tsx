"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Download, FolderClosed, Trash2, Upload } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { TINGGI_KONTROL_RINGKAS } from "@/components/ui/control";
import { cn } from "@/lib/utils";
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
import { useToast } from "@/components/ui/toast";
import {
  createDocumentDownloadUrl,
  deleteDocument,
  updateDocumentVisibility,
  uploadDocument,
} from "@/features/documents/actions/manage-document";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  type DocumentVisibility,
} from "@/features/documents/schemas/document.schema";
import type { ActionResult } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { documentVisibility } from "@/lib/status";

export type DocumentRow = {
  id: string;
  title: string;
  category: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  visibility: string;
  createdAt: string;
  uploaderName: string | null;
};

export type DocumentPermissions = {
  canCreate: boolean;
  canDownload: boolean;
  canManageVisibility: boolean;
  canDelete: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  LETTER: "Surat",
  PROPOSAL: "Proposal",
  LPJ: "LPJ",
  SK: "SK",
  CERTIFICATE: "Sertifikat",
  REPORT: "Laporan",
  EVENT_DOCUMENTATION: "Dokumentasi Kegiatan",
  OTHER: "Lainnya",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type KeadaanDaftar = {
  cari: string;
  kategori: string;
  kategoriOptions: { value: string; label: string }[];
  halaman: number;
  total: number;
  ukuranHalaman: number;
};

export function DocumentManager({
  organizationId,
  documents,
  permissions,
  daftar,
}: {
  organizationId: string;
  documents: DocumentRow[];
  permissions: DocumentPermissions;
  daftar: KeadaanDaftar;
}) {
  const { showToast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasActions =
    permissions.canDownload ||
    permissions.canDelete ||
    permissions.canManageVisibility;

  const disaring = daftar.cari !== "" || daftar.kategori !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dokumen"
        description="Berkas organisasi tersimpan pada bucket privat."
        actions={
          permissions.canCreate ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Upload size={16} aria-hidden="true" />
              Unggah Dokumen
            </Button>
          ) : undefined
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari dokumen…"
          searchLabel="Cari dokumen"
          filters={[
            {
              key: "kategori",
              label: "Saring menurut kategori",
              value: daftar.kategori,
              allLabel: "Semua kategori",
              options: daftar.kategoriOptions,
            },
          ]}
        />

        {documents.length === 0 ? (
          <EmptyState
            icon={FolderClosed}
            title={
              disaring ? "Tidak ada dokumen yang cocok" : "Belum ada dokumen"
            }
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan kategori."
                : "Berkas organisasi tersimpan pada bucket privat dan hanya dapat dibuka lewat tautan berumur pendek."
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Dokumen</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Kategori
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Diunggah
                  </TableHeaderCell>
                  <TableHeaderCell>Visibilitas</TableHeaderCell>
                  {hasActions ? (
                    <TableHeaderCell className="text-right">
                      Aksi
                    </TableHeaderCell>
                  ) : null}
                </TableRow>
              </TableHead>

              <TableBody>
                {documents.map((row) => {
                  const visibility = documentVisibility(row.visibility);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {row.title}
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                          {row.originalFilename} · {formatSize(row.fileSize)}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatShortDate(row.createdAt)}
                        {row.uploaderName ? (
                          <span className="block text-[13px]">
                            {row.uploaderName}
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        {permissions.canManageVisibility ? (
                          <Select
                            aria-label={`Visibilitas ${row.title}`}
                            value={row.visibility}
                            disabled={isPending}
                            className={cn(
                              TINGGI_KONTROL_RINGKAS,
                              "field-sizing-content w-auto text-[13px]",
                            )}
                            onChange={(event) => {
                              const next = event.target
                                .value as DocumentVisibility;

                              startTransition(async () => {
                                const result = await updateDocumentVisibility(
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
                            {DOCUMENT_VISIBILITIES.map((value) => (
                              <option key={value} value={value}>
                                {documentVisibility(value).label}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone={visibility.tone} dot>
                            {visibility.label}
                          </Badge>
                        )}
                      </TableCell>

                      {hasActions ? (
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {permissions.canDownload ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    const result =
                                      await createDocumentDownloadUrl(
                                        organizationId,
                                        row.id,
                                      );

                                    if (!result.success) {
                                      showToast(result.error, "error");
                                      return;
                                    }

                                    window.open(
                                      result.data.url,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  })
                                }
                              >
                                <Download size={14} aria-hidden="true" />
                                Unduh
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
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}

        <UploadDialog
          key={uploadOpen ? "upload-open" : "upload-closed"}
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          organizationId={organizationId}
          canManageVisibility={permissions.canManageVisibility}
        />

        <ConfirmDialog
          open={Boolean(deleting)}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (!deleting) return;
            const target = deleting;

            startTransition(async () => {
              const result = await deleteDocument(organizationId, target.id);
              setDeleting(null);
              showToast(
                result.success ? "Dokumen dihapus." : result.error,
                result.success ? "success" : "error",
              );
            });
          }}
          pending={isPending}
          destructive
          confirmLabel="Hapus"
          title={`Hapus ${deleting?.title ?? "dokumen"}?`}
          description="Berkas fisiknya ikut dibuang dari storage dan tidak dapat dipulihkan. Catatan metadatanya tetap tersimpan."
        />
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
    </div>
  );
}

function UploadDialog({
  open,
  onClose,
  organizationId,
  canManageVisibility,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  canManageVisibility: boolean;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(uploadDocument.bind(null, organizationId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Dokumen diunggah.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Unggah Dokumen"
      description="PDF, gambar, Word, atau Excel. Maksimal 20 MB."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Judul"
          htmlFor="doc-title"
          required
          error={fieldErrors?.title?.[0]}
        >
          <Input
            id="doc-title"
            name="title"
            required
            maxLength={200}
            aria-invalid={Boolean(fieldErrors?.title)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="doc-category" required>
            <Select
              id="doc-category"
              name="category"
              required
              defaultValue="OTHER"
            >
              {DOCUMENT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Visibilitas"
            htmlFor="doc-visibility"
            hint={
              canManageVisibility
                ? "Privat hanya terlihat oleh pengunggah dan pemegang hak khusus."
                : "Anda belum berhak mengatur visibilitas; dokumen disimpan sebagai Organisasi."
            }
          >
            <Select
              id="doc-visibility"
              name="visibility"
              defaultValue="ORGANIZATION"
              disabled={!canManageVisibility}
            >
              {DOCUMENT_VISIBILITIES.map((value) => (
                <option key={value} value={value}>
                  {documentVisibility(value).label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Berkas" htmlFor="doc-file" required>
          <Input
            id="doc-file"
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-[13px] file:font-medium"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Unggah</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
