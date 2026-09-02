"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/tabs";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { TINGGI_KONTROL_RINGKAS } from "@/components/ui/control";
import { cn } from "@/lib/utils";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
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
  createIncomingLetter,
  createOutgoingLetter,
  deleteLetter,
  setOutgoingLetterStatus,
  updateIncomingLetter,
  updateOutgoingLetter,
} from "@/features/letters/actions/manage-letter";
import {
  INCOMING_STATUSES,
  OUTGOING_STATUSES,
  type OutgoingStatus,
} from "@/features/letters/schemas/letter.schema";
import type { ActionResult } from "@/lib/errors";
import { formatShortDate, orDash } from "@/lib/format";
import { incomingLetterStatus, outgoingLetterStatus } from "@/lib/status";

export type IncomingRow = {
  id: string;
  letterNumber: string | null;
  sender: string;
  subject: string;
  letterDate: string | null;
  receivedDate: string;
  status: string;
  documentId: string | null;
  notes: string | null;
};

export type OutgoingRow = {
  id: string;
  letterNumber: string;
  recipient: string;
  subject: string;
  letterDate: string;
  signerMemberId: string | null;
  signerName: string | null;
  status: string;
  documentId: string | null;
  notes: string | null;
};

export type LetterOption = { id: string; label: string };

export type LetterPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
};

/**
 * Surat masuk dan surat keluar dalam satu halaman, dua tab.
 *
 * Tab dipilih lewat URL (`?tab=keluar`), bukan state komponen: menyegarkan
 * halaman setelah menyimpan surat keluar harus mengembalikan pengguna ke tab
 * yang sama, dan tautan ke tab tertentu harus dapat dibagikan.
 */
/** Keadaan toolbar dan pagination — seluruhnya dari URL, diproses di server. */
export type KeadaanDaftar = {
  cari: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  halaman: number;
  totalMasuk: number;
  totalKeluar: number;
  ukuranHalaman: number;
};

/**
 * Tombol "Catat Surat" beserta dialognya, mengikuti tab yang sedang dibuka.
 *
 * Berdiri di kepala halaman, sebaris dengan tombol Ekspor. Sebelumnya ia
 * melayang rata kanan DI ANTARA deretan tab dan kartu tabel — satu baris
 * tersendiri yang bukan bagian dari kepala halaman maupun bagian dari
 * kartunya, dan satu-satunya aksi primer di aplikasi ini yang mendarat di
 * sana.
 *
 * Labelnya ikut tab karena arsipnya memang dua: mencatat surat masuk dan
 * membuat surat keluar bukan tindakan yang sama.
 */
export function LetterCreateDialog({
  organizationId,
  activeTab,
  memberOptions,
  documentOptions,
}: {
  organizationId: string;
  activeTab: "masuk" | "keluar";
  memberOptions: LetterOption[];
  documentOptions: LetterOption[];
}) {
  const [open, setOpen] = useState(false);
  const keluar = activeTab === "keluar";

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        {keluar ? "Buat Surat Keluar" : "Catat Surat Masuk"}
      </Button>

      {keluar ? (
        <OutgoingDialog
          key={open ? "out-create-open" : "out-create-closed"}
          open={open}
          onClose={() => setOpen(false)}
          organizationId={organizationId}
          memberOptions={memberOptions}
          documentOptions={documentOptions}
        />
      ) : (
        <IncomingDialog
          key={open ? "in-create-open" : "in-create-closed"}
          open={open}
          onClose={() => setOpen(false)}
          organizationId={organizationId}
          documentOptions={documentOptions}
        />
      )}
    </>
  );
}

export function LetterTabs({
  organizationId,
  activeTab,
  incoming,
  outgoing,
  memberOptions,
  documentOptions,
  permissions,
  daftar,
}: {
  organizationId: string;
  activeTab: "masuk" | "keluar";
  incoming: IncomingRow[];
  outgoing: OutgoingRow[];
  memberOptions: LetterOption[];
  documentOptions: LetterOption[];
  permissions: LetterPermissions;
  daftar: KeadaanDaftar;
}) {
  // Disusun DI LUAR percabangan: di dalam cabang `masuk`, TypeScript
  // mempersempit `activeTab` menjadi `"masuk"` saja, sehingga pemeriksaan
  // `=== "keluar"` di sana tak pernah bisa benar.
  const tabs = (
    <PageTabs
      label="Jenis surat"
      items={[
        {
          href: "/surat?tab=masuk",
          label: "Surat Masuk",
          active: activeTab === "masuk",
        },
        {
          href: "/surat?tab=keluar",
          label: "Surat Keluar",
          active: activeTab === "keluar",
        },
      ]}
    />
  );

  return (
    /*
      Tab dikirim ke dalam kartu panel sebagai kepalanya, bukan berdiri
      sebagai bilah terpisah di atasnya. Bentuknya kini sama persis dengan
      halaman Pemilihan, dan halaman ini berhenti memakai kotak pil yang
      penanda aktifnya memudar setiap kali latar halaman dinaikkan.
    */
    <>
      {activeTab === "masuk" ? (
        <IncomingPanel
          tabs={tabs}
          organizationId={organizationId}
          rows={incoming}
          documentOptions={documentOptions}
          permissions={permissions}
          daftar={daftar}
          total={daftar.totalMasuk}
        />
      ) : (
        <OutgoingPanel
          tabs={tabs}
          organizationId={organizationId}
          rows={outgoing}
          memberOptions={memberOptions}
          documentOptions={documentOptions}
          permissions={permissions}
          daftar={daftar}
          total={daftar.totalKeluar}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------ surat masuk */

function IncomingPanel({
  organizationId,
  rows,
  documentOptions,
  permissions,
  daftar,
  total,
  tabs,
}: {
  organizationId: string;
  rows: IncomingRow[];
  documentOptions: LetterOption[];
  permissions: LetterPermissions;
  daftar: KeadaanDaftar;
  total: number;
  tabs: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<IncomingRow | null>(null);
  const [deleting, setDeleting] = useState<IncomingRow | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {/* Tab, toolbar, tabel, dan kaki halaman dalam SATU kartu. */}
      <Card>
        {tabs}
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari perihal surat…"
          searchLabel="Cari surat masuk"
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

        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              daftar.cari || daftar.status
                ? "Tidak ada surat yang cocok"
                : "Belum ada surat masuk"
            }
            description={
              daftar.cari || daftar.status
                ? "Coba ubah kata kunci atau saringan status."
                : "Surat yang diterima organisasi dicatat di sini beserta lampirannya."
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Perihal</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Pengirim
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Diterima
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {permissions.canEdit || permissions.canDelete ? (
                    <TableHeaderCell className="text-right">
                      Aksi
                    </TableHeaderCell>
                  ) : null}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => {
                  const status = incomingLetterStatus(row.status);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {row.subject}
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                          {orDash(row.letterNumber)}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {row.sender}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatShortDate(row.receivedDate)}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      {permissions.canEdit || permissions.canDelete ? (
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
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
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(1, Math.ceil(total / daftar.ukuranHalaman))}
          total={total}
          pageSize={daftar.ukuranHalaman}
        />
      </Card>

      <IncomingDialog
        key={editing?.id ?? "in-edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        documentOptions={documentOptions}
        letter={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;

          startTransition(async () => {
            const result = await deleteLetter(
              organizationId,
              target.id,
              "incoming",
            );
            setDeleting(null);
            showToast(
              result.success ? "Surat dihapus." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title="Hapus surat masuk ini?"
        description="Surat disembunyikan dari daftar, tetapi tetap tersimpan sebagai arsip."
      />
    </div>
  );
}

function IncomingDialog({
  open,
  onClose,
  organizationId,
  documentOptions,
  letter,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  documentOptions: LetterOption[];
  letter?: IncomingRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(letter);

  const action = isEdit
    ? updateIncomingLetter.bind(null, organizationId, letter!.id)
    : createIncomingLetter.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Surat masuk diperbarui." : "Surat masuk dicatat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Surat Masuk" : "Catat Surat Masuk"}
      description="Nomor surat masuk berasal dari pengirim, sehingga tidak divalidasi formatnya."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Perihal"
          htmlFor="in-subject"
          required
          error={fieldErrors?.subject?.[0]}
        >
          <Input
            id="in-subject"
            name="subject"
            required
            maxLength={300}
            defaultValue={letter?.subject ?? ""}
            aria-invalid={Boolean(fieldErrors?.subject)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Pengirim"
            htmlFor="in-sender"
            required
            error={fieldErrors?.sender?.[0]}
          >
            <Input
              id="in-sender"
              name="sender"
              required
              maxLength={160}
              defaultValue={letter?.sender ?? ""}
              aria-invalid={Boolean(fieldErrors?.sender)}
            />
          </Field>

          <Field label="Nomor Surat" htmlFor="in-number">
            <Input
              id="in-number"
              name="letterNumber"
              maxLength={120}
              defaultValue={letter?.letterNumber ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal Surat" htmlFor="in-letter-date">
            <Input
              id="in-letter-date"
              name="letterDate"
              type="date"
              defaultValue={letter?.letterDate ?? ""}
            />
          </Field>

          <Field
            label="Tanggal Diterima"
            htmlFor="in-received-date"
            required
            error={fieldErrors?.receivedDate?.[0]}
          >
            <Input
              id="in-received-date"
              name="receivedDate"
              type="date"
              required
              defaultValue={
                letter?.receivedDate ?? new Date().toISOString().slice(0, 10)
              }
              aria-invalid={Boolean(fieldErrors?.receivedDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="in-status" required>
            <Select
              id="in-status"
              name="status"
              required
              defaultValue={letter?.status ?? "RECEIVED"}
            >
              {INCOMING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {incomingLetterStatus(value).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Lampiran"
            htmlFor="in-document"
            hint="Unggah berkasnya lebih dulu di menu Dokumen."
          >
            <Select
              id="in-document"
              name="documentId"
              defaultValue={letter?.documentId ?? ""}
            >
              <option value="">Tanpa lampiran</option>
              {documentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Catatan" htmlFor="in-notes">
          <Textarea
            id="in-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={letter?.notes ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Catat"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ----------------------------------------------------------- surat keluar */

function OutgoingPanel({
  organizationId,
  rows,
  memberOptions,
  documentOptions,
  permissions,
  daftar,
  total,
  tabs,
}: {
  organizationId: string;
  rows: OutgoingRow[];
  memberOptions: LetterOption[];
  documentOptions: LetterOption[];
  permissions: LetterPermissions;
  daftar: KeadaanDaftar;
  total: number;
  tabs: React.ReactNode;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<OutgoingRow | null>(null);
  const [deleting, setDeleting] = useState<OutgoingRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasActions =
    permissions.canEdit || permissions.canDelete || permissions.canApprove;

  return (
    <div className="space-y-4">
      {/* Tab, toolbar, tabel, dan kaki halaman dalam SATU kartu. */}
      <Card>
        {tabs}
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari perihal surat…"
          searchLabel="Cari surat keluar"
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

        {rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              daftar.cari || daftar.status
                ? "Tidak ada surat yang cocok"
                : "Belum ada surat keluar"
            }
            description={
              daftar.cari || daftar.status
                ? "Coba ubah kata kunci atau saringan status."
                : "Surat keluar lahir sebagai draf dan baru berubah status setelah disetujui."
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Perihal</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Penerima
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Penandatangan
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  {hasActions ? (
                    <TableHeaderCell className="text-right">
                      Aksi
                    </TableHeaderCell>
                  ) : null}
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => {
                  const status = outgoingLetterStatus(row.status);

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {row.subject}
                        </span>
                        <span className="block text-[13px] text-muted-foreground">
                          {row.letterNumber} · {formatShortDate(row.letterDate)}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {row.recipient}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {orDash(row.signerName)}
                      </TableCell>

                      <TableCell>
                        {permissions.canApprove ? (
                          <Select
                            aria-label={`Status surat ${row.letterNumber}`}
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
                              const next = event.target.value as OutgoingStatus;

                              startTransition(async () => {
                                const result = await setOutgoingLetterStatus(
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
                            {OUTGOING_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {outgoingLetterStatus(value).label}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        )}
                      </TableCell>

                      {hasActions ? (
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-1.5">
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
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(1, Math.ceil(total / daftar.ukuranHalaman))}
          total={total}
          pageSize={daftar.ukuranHalaman}
        />
      </Card>

      <OutgoingDialog
        key={editing?.id ?? "out-edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        memberOptions={memberOptions}
        documentOptions={documentOptions}
        letter={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;

          startTransition(async () => {
            const result = await deleteLetter(
              organizationId,
              target.id,
              "outgoing",
            );
            setDeleting(null);
            showToast(
              result.success ? "Surat dihapus." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title="Hapus surat keluar ini?"
        description="Surat disembunyikan dari daftar. Nomornya kembali dapat dipakai."
      />
    </div>
  );
}

function OutgoingDialog({
  open,
  onClose,
  organizationId,
  memberOptions,
  documentOptions,
  letter,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  memberOptions: LetterOption[];
  documentOptions: LetterOption[];
  letter?: OutgoingRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(letter);

  const action = isEdit
    ? updateOutgoingLetter.bind(null, organizationId, letter!.id)
    : createOutgoingLetter.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Surat keluar diperbarui." : "Surat keluar dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Surat Keluar" : "Buat Surat Keluar"}
      description="Penomoran mengikuti aturan organisasi Anda. Sistem hanya memastikan nomornya belum terpakai."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Perihal"
          htmlFor="out-subject"
          required
          error={fieldErrors?.subject?.[0]}
        >
          <Input
            id="out-subject"
            name="subject"
            required
            maxLength={300}
            defaultValue={letter?.subject ?? ""}
            aria-invalid={Boolean(fieldErrors?.subject)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nomor Surat"
            htmlFor="out-number"
            required
            hint="Ditulis manual sesuai format organisasi."
            error={fieldErrors?.letterNumber?.[0]}
          >
            <Input
              id="out-number"
              name="letterNumber"
              required
              maxLength={120}
              defaultValue={letter?.letterNumber ?? ""}
              aria-invalid={Boolean(fieldErrors?.letterNumber)}
            />
          </Field>

          <Field
            label="Tanggal Surat"
            htmlFor="out-date"
            required
            error={fieldErrors?.letterDate?.[0]}
          >
            <Input
              id="out-date"
              name="letterDate"
              type="date"
              required
              defaultValue={
                letter?.letterDate ?? new Date().toISOString().slice(0, 10)
              }
              aria-invalid={Boolean(fieldErrors?.letterDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Penerima"
            htmlFor="out-recipient"
            required
            error={fieldErrors?.recipient?.[0]}
          >
            <Input
              id="out-recipient"
              name="recipient"
              required
              maxLength={160}
              defaultValue={letter?.recipient ?? ""}
              aria-invalid={Boolean(fieldErrors?.recipient)}
            />
          </Field>

          <Field label="Penandatangan" htmlFor="out-signer">
            <Select
              id="out-signer"
              name="signerMemberId"
              defaultValue={letter?.signerMemberId ?? ""}
            >
              <option value="">Belum ditentukan</option>
              {memberOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Lampiran"
          htmlFor="out-document"
          hint="Unggah berkasnya lebih dulu di menu Dokumen."
        >
          <Select
            id="out-document"
            name="documentId"
            defaultValue={letter?.documentId ?? ""}
          >
            <option value="">Tanpa lampiran</option>
            {documentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Catatan" htmlFor="out-notes">
          <Textarea
            id="out-notes"
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={letter?.notes ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
