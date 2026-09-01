"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BadgeCheck, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
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
  createCadreshipRecord,
  deleteCadreshipRecord,
  updateCadreshipRecord,
  verifyCadreshipRecord,
} from "@/features/cadreship/actions/manage-cadreship";
import { CADRESHIP_STATUSES } from "@/features/cadreship/schemas/cadreship.schema";
import type { ActionResult } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { cadreshipStatus } from "@/lib/status";

export type CadreshipRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string | null;
  typeId: string;
  typeName: string;
  activityName: string;
  organizer: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  certificateNumber: string | null;
  notes: string | null;
};

export type CadreshipOption = { id: string; label: string };

export type CadreshipPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canVerify: boolean;
  canDelete: boolean;
};

export function CadreshipManager({
  organizationId,
  records,
  memberOptions,
  typeOptions,
  permissions,
  ownOnly,
}: {
  organizationId: string;
  records: CadreshipRow[];
  memberOptions: CadreshipOption[];
  typeOptions: CadreshipOption[];
  permissions: CadreshipPermissions;
  /** Halaman sedang menampilkan riwayat milik pengguna sendiri. */
  ownOnly: boolean;
}) {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CadreshipRow | null>(null);
  const [verifying, setVerifying] = useState<CadreshipRow | null>(null);
  const [deleting, setDeleting] = useState<CadreshipRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runVerify() {
    if (!verifying) return;
    const target = verifying;

    startTransition(async () => {
      const result = await verifyCadreshipRecord(organizationId, target.id);
      setVerifying(null);
      showToast(
        result.success
          ? `Kaderisasi ${target.memberName} diverifikasi.`
          : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  function runDelete() {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      const result = await deleteCadreshipRecord(organizationId, target.id);
      setDeleting(null);
      showToast(
        result.success ? "Riwayat kaderisasi dihapus." : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  const hasActions =
    permissions.canEdit || permissions.canVerify || permissions.canDelete;

  return (
    <>
      {permissions.canCreate ? (
        <div className="flex justify-end">
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={memberOptions.length === 0 || typeOptions.length === 0}
          >
            <Plus size={16} aria-hidden="true" />
            Tambah Riwayat
          </Button>
        </div>
      ) : null}

      {records.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={
            ownOnly
              ? "Belum ada riwayat kaderisasi"
              : "Belum ada data kaderisasi"
          }
          description={
            ownOnly
              ? "Riwayat kaderisasi Anda akan tampil di sini setelah dicatat pengurus."
              : "Catat penempuhan MAKESTA, LAKMUD, atau LAKUT anggota di sini."
          }
        />
      ) : (
        <TableScroll bounded>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                {ownOnly ? null : <TableHeaderCell>Anggota</TableHeaderCell>}
                <TableHeaderCell>Jenjang</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">
                  Kegiatan
                </TableHeaderCell>
                <TableHeaderCell className="hidden lg:table-cell">
                  Tanggal
                </TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {hasActions ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {records.map((row) => {
                const status = cadreshipStatus(row.status);

                return (
                  <TableRow key={row.id}>
                    {ownOnly ? null : (
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {row.memberName}
                        </span>
                        {row.memberNumber ? (
                          <span className="block text-[13px] text-muted-foreground">
                            {row.memberNumber}
                          </span>
                        ) : null}
                      </TableCell>
                    )}

                    <TableCell className="font-medium text-foreground">
                      {row.typeName}
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {row.activityName}
                      {row.organizer ? (
                        <span className="block text-[13px]">
                          {row.organizer}
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {row.startDate ? formatShortDate(row.startDate) : "—"}
                    </TableCell>

                    <TableCell>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                      {row.certificateNumber ? (
                        <span className="block text-[13px] text-muted-foreground">
                          {row.certificateNumber}
                        </span>
                      ) : null}
                    </TableCell>

                    {hasActions ? (
                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
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

                          {permissions.canVerify &&
                          row.status !== "VERIFIED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVerifying(row)}
                            >
                              <BadgeCheck size={14} aria-hidden="true" />
                              Verifikasi
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

      <CadreshipDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        memberOptions={memberOptions}
        typeOptions={typeOptions}
      />

      <CadreshipDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        memberOptions={memberOptions}
        typeOptions={typeOptions}
        record={editing}
      />

      <ConfirmDialog
        open={Boolean(verifying)}
        onClose={() => setVerifying(null)}
        onConfirm={runVerify}
        pending={isPending}
        confirmLabel="Verifikasi"
        title="Verifikasi kaderisasi ini?"
        description="Verifikasi mencatat nama Anda dan waktunya sebagai penanggung jawab keabsahan riwayat ini."
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={runDelete}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title="Hapus riwayat kaderisasi ini?"
        description="Baris disembunyikan dari daftar, tetapi tidak dihapus dari database — riwayat kaderisasi adalah bukti."
      />
    </>
  );
}

/* ========================================================================== */

function CadreshipDialog({
  open,
  onClose,
  organizationId,
  memberOptions,
  typeOptions,
  record,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  memberOptions: CadreshipOption[];
  typeOptions: CadreshipOption[];
  record?: CadreshipRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(record);

  const action = isEdit
    ? updateCadreshipRecord.bind(null, organizationId, record!.id)
    : createCadreshipRecord.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Riwayat diperbarui." : "Riwayat ditambahkan.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Riwayat Kaderisasi" : "Tambah Riwayat Kaderisasi"}
      description="Satu baris untuk satu penempuhan. Mengulang jenjang yang sama berarti baris baru, bukan menimpa yang lama."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Anggota"
            htmlFor="cadreship-member"
            required
            error={fieldErrors?.memberId?.[0]}
          >
            <Select
              id="cadreship-member"
              name="memberId"
              required
              defaultValue={record?.memberId ?? ""}
            >
              <option value="">Pilih anggota</option>
              {memberOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Jenjang"
            htmlFor="cadreship-type"
            required
            error={fieldErrors?.cadreshipTypeId?.[0]}
          >
            <Select
              id="cadreship-type"
              name="cadreshipTypeId"
              required
              defaultValue={record?.typeId ?? ""}
            >
              <option value="">Pilih jenjang</option>
              {typeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Nama Kegiatan"
          htmlFor="cadreship-activity"
          required
          hint="Contoh: MAKESTA Angkatan XII"
          error={fieldErrors?.activityName?.[0]}
        >
          <Input
            id="cadreship-activity"
            name="activityName"
            required
            maxLength={160}
            defaultValue={record?.activityName ?? ""}
            aria-invalid={Boolean(fieldErrors?.activityName)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Penyelenggara" htmlFor="cadreship-organizer">
            <Input
              id="cadreship-organizer"
              name="organizer"
              maxLength={160}
              defaultValue={record?.organizer ?? ""}
            />
          </Field>

          <Field label="Lokasi" htmlFor="cadreship-location">
            <Input
              id="cadreship-location"
              name="location"
              maxLength={160}
              defaultValue={record?.location ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal Mulai" htmlFor="cadreship-start">
            <Input
              id="cadreship-start"
              name="startDate"
              type="date"
              defaultValue={record?.startDate ?? ""}
            />
          </Field>

          <Field
            label="Tanggal Selesai"
            htmlFor="cadreship-end"
            error={fieldErrors?.endDate?.[0]}
          >
            <Input
              id="cadreship-end"
              name="endDate"
              type="date"
              defaultValue={record?.endDate ?? ""}
              aria-invalid={Boolean(fieldErrors?.endDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Status"
            htmlFor="cadreship-status"
            required
            hint="Verifikasi dilakukan lewat tombol tersendiri."
            error={fieldErrors?.status?.[0]}
          >
            <Select
              id="cadreship-status"
              name="status"
              required
              defaultValue={
                record && record.status !== "VERIFIED"
                  ? record.status
                  : "REGISTERED"
              }
            >
              {CADRESHIP_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {cadreshipStatus(value).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nomor Sertifikat" htmlFor="cadreship-certificate">
            <Input
              id="cadreship-certificate"
              name="certificateNumber"
              maxLength={80}
              defaultValue={record?.certificateNumber ?? ""}
            />
          </Field>
        </div>

        <Field label="Catatan" htmlFor="cadreship-notes">
          <Textarea
            id="cadreship-notes"
            name="notes"
            rows={3}
            maxLength={1000}
            defaultValue={record?.notes ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Tambah"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
