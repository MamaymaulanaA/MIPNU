"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Network, Pencil, Plus } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import {
  TableToolbar,
  type TableFilter,
} from "@/components/data-table/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
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
  createAssignment,
  endAssignment,
  updateAssignment,
} from "@/features/management/actions/manage-assignment";
import type { ActionResult } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { managementStatus } from "@/lib/status";

export type AssignmentRow = {
  id: string;
  memberId: string;
  memberName: string;
  positionId: string;
  positionName: string;
  positionSortOrder: number;
  periodId: string;
  periodName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type Option = { id: string; label: string };

export type KeadaanDaftar = {
  cari: string;
  periode: string;
  jabatan: string;
  periodeOptions: { value: string; label: string }[];
  jabatanOptions: { value: string; label: string }[];
  halaman: number;
  total: number;
  ukuranHalaman: number;
};

export function ManagementManager({
  organizationId,
  assignments,
  periods,
  members,
  positions,
  permissions,
  daftar,
  aksiTambahan,
}: {
  organizationId: string;
  assignments: AssignmentRow[];
  periods: Option[];
  members: Option[];
  positions: Option[];
  permissions: { canAssign: boolean; canEdit: boolean; canEnd: boolean };
  daftar: KeadaanDaftar;
  aksiTambahan?: React.ReactNode;
}) {
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [ending, setEnding] = useState<AssignmentRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const missing: string[] = [];
  if (periods.length === 0) missing.push("periode");
  if (positions.length === 0) missing.push("jabatan");
  if (members.length === 0) missing.push("anggota");
  const canOpenForm = permissions.canAssign && missing.length === 0;

  function runEnd() {
    if (!ending) return;
    const target = ending;

    startTransition(async () => {
      const result = await endAssignment(organizationId, target.id, "ENDED");
      setEnding(null);
      showToast(
        result.success
          ? `Penugasan ${target.memberName} diakhiri.`
          : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  const disaring =
    daftar.cari !== "" || daftar.periode !== "" || daftar.jabatan !== "";

  const filterKepengurusan: TableFilter[] = [];

  if (daftar.periodeOptions.length > 0) {
    filterKepengurusan.push({
      key: "periode",
      label: "Saring menurut periode",
      value: daftar.periode,
      allLabel: "Semua periode",
      options: daftar.periodeOptions,
    });
  }

  if (daftar.jabatanOptions.length > 0) {
    filterKepengurusan.push({
      key: "jabatan",
      label: "Saring menurut jabatan",
      value: daftar.jabatan,
      allLabel: "Semua jabatan",
      options: daftar.jabatanOptions,
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kepengurusan"
        description="Riwayat penugasan pengurus per periode. Jabatan bukan role sistem."
        actions={
          <>
            {aksiTambahan}
            {permissions.canAssign ? (
              <>
                {missing.length > 0 ? (
                  <p className="text-[13px] text-muted-foreground">
                    Lengkapi {missing.join(", ")} terlebih dahulu.
                  </p>
                ) : null}
                <Button
                  onClick={() => setCreateOpen(true)}
                  disabled={!canOpenForm}
                >
                  <Plus size={16} aria-hidden="true" />
                  Tugaskan Pengurus
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari nama pengurus…"
          searchLabel="Cari pengurus"
          filters={filterKepengurusan}
        />

        {assignments.length === 0 ? (
          <EmptyState
            icon={Network}
            title={
              disaring
                ? "Tidak ada penugasan yang cocok"
                : "Belum ada penugasan pengurus"
            }
            description={
              disaring
                ? "Coba ubah kata kunci atau saringannya."
                : "Penugasan menghubungkan anggota, jabatan, dan periode. Dari sinilah permission jabatan mulai berlaku."
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Nama</TableHeaderCell>
                  <TableHeaderCell>Jabatan</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Periode
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Mulai
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {assignments.map((assignment) => {
                  const status = managementStatus(assignment.status);

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {assignment.memberName}
                        </span>
                        <span className="block text-[13px] text-muted-foreground md:hidden">
                          {assignment.periodName}
                        </span>
                      </TableCell>

                      <TableCell className="text-foreground">
                        {assignment.positionName}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {assignment.periodName}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatShortDate(assignment.startDate)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {permissions.canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(assignment)}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Ubah
                            </Button>
                          ) : null}

                          {permissions.canEnd &&
                          assignment.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEnding(assignment)}
                            >
                              Akhiri
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
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

      <AssignmentDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        periods={periods}
        members={members}
        positions={positions}
      />

      <AssignmentDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        periods={periods}
        members={members}
        positions={positions}
        assignment={editing}
      />

      <ConfirmDialog
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        onConfirm={runEnd}
        pending={isPending}
        confirmLabel="Akhiri Penugasan"
        title={`Akhiri penugasan ${ending?.memberName ?? ""}?`}
        description="Permission yang berasal dari jabatan ini berhenti berlaku seketika. Penugasannya tetap tersimpan sebagai riwayat, tidak dihapus."
      />
    </div>
  );
}

function AssignmentDialog({
  open,
  onClose,
  organizationId,
  periods,
  members,
  positions,
  assignment,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periods: Option[];
  members: Option[];
  positions: Option[];
  assignment?: AssignmentRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(assignment);

  const action = isEdit
    ? updateAssignment.bind(null, organizationId, assignment!.id)
    : createAssignment.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Penugasan diperbarui." : "Pengurus ditugaskan.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Penugasan" : "Tugaskan Pengurus"}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Periode"
          htmlFor="assignment-period"
          required
          error={fieldErrors?.organizationPeriodId?.[0]}
        >
          <Select
            id="assignment-period"
            name="organizationPeriodId"
            required
            defaultValue={assignment?.periodId ?? ""}
          >
            <option value="">Pilih periode</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Anggota"
          htmlFor="assignment-member"
          required
          error={fieldErrors?.memberId?.[0]}
        >
          <Select
            id="assignment-member"
            name="memberId"
            required
            defaultValue={assignment?.memberId ?? ""}
          >
            <option value="">Pilih anggota</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Jabatan"
          htmlFor="assignment-position"
          required
          error={fieldErrors?.positionId?.[0]}
        >
          <Select
            id="assignment-position"
            name="positionId"
            required
            defaultValue={assignment?.positionId ?? ""}
          >
            <option value="">Pilih jabatan</option>
            {positions.map((position) => (
              <option key={position.id} value={position.id}>
                {position.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Tanggal Mulai"
            htmlFor="assignment-start"
            error={fieldErrors?.startDate?.[0]}
          >
            <Input
              id="assignment-start"
              name="startDate"
              type="date"
              defaultValue={assignment?.startDate ?? ""}
            />
          </Field>

          <Field
            label="Tanggal Berakhir"
            htmlFor="assignment-end"
            hint="Kosongkan bila mengikuti periode."
            error={fieldErrors?.endDate?.[0]}
          >
            <Input
              id="assignment-end"
              name="endDate"
              type="date"
              defaultValue={assignment?.endDate ?? ""}
              aria-invalid={Boolean(fieldErrors?.endDate)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Tugaskan"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
