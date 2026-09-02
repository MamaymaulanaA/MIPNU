"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";

import { useJagaIsian } from "@/components/forms/use-jaga-isian";
import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { TINGGI_KONTROL_RINGKAS } from "@/components/ui/control";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createWorkProgram,
  deleteWorkProgram,
  updateProgramProgress,
  updateProgramStatus,
  updateWorkProgram,
} from "@/features/programs/actions/manage-program";
import {
  PROGRAM_STATUSES,
  type ProgramStatus,
} from "@/features/programs/schemas/program.schema";
import type { ActionResult } from "@/lib/errors";
import { formatNumber, formatShortDate } from "@/lib/format";
import { programStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ProgramRow = {
  id: string;
  periodId: string;
  periodName: string;
  name: string;
  description: string | null;
  positionId: string | null;
  positionName: string | null;
  memberId: string | null;
  memberName: string | null;
  startDate: string | null;
  endDate: string | null;
  target: string | null;
  budgetAmount: number | null;
  progress: number;
  status: string;
};

export type ProgramOption = { id: string; label: string };

export type ProgramPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canManage: boolean;
  canUpdateProgress: boolean;
  canDelete: boolean;
};

function KOLOM_PROGRAM(jumlah: number) {
  if (jumlah <= 1) return "";
  if (jumlah === 2) return "md:grid-cols-2";
  return "md:grid-cols-2 xl:grid-cols-3";
}

export function ProgramCreateDialog({
  organizationId,
  periodOptions,
  positionOptions,
  memberOptions,
}: {
  organizationId: string;
  periodOptions: ProgramOption[];
  positionOptions: ProgramOption[];
  memberOptions: ProgramOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={periodOptions.length === 0}
      >
        <Plus size={16} aria-hidden="true" />
        Tambah Program
      </Button>

      <ProgramDialog
        key={open ? "program-create-open" : "program-create-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        periodOptions={periodOptions}
        positionOptions={positionOptions}
        memberOptions={memberOptions}
      />
    </>
  );
}

export function ProgramManager({
  organizationId,
  programs,
  periodOptions,
  positionOptions,
  memberOptions,
  permissions,
}: {
  organizationId: string;
  programs: ProgramRow[];
  periodOptions: ProgramOption[];
  positionOptions: ProgramOption[];
  memberOptions: ProgramOption[];
  permissions: ProgramPermissions;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ProgramRow | null>(null);
  const [deleting, setDeleting] = useState<ProgramRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runDelete() {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      const result = await deleteWorkProgram(organizationId, target.id);
      setDeleting(null);
      showToast(
        result.success ? "Program dihapus." : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  return (
    <>
      {programs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Belum ada program kerja"
          description="Program kerja terikat pada periode kepengurusan. Buat periode lebih dulu bila belum ada."
        />
      ) : (
        <div
          className={cn(
            "grid gap-4 p-4 sm:p-5",
            KOLOM_PROGRAM(programs.length),
          )}
        >
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              organizationId={organizationId}
              program={program}
              permissions={permissions}
              onEdit={() => setEditing(program)}
              onDelete={() => setDeleting(program)}
            />
          ))}
        </div>
      )}

      <ProgramDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        periodOptions={periodOptions}
        positionOptions={positionOptions}
        memberOptions={memberOptions}
        program={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={runDelete}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title="Hapus program kerja ini?"
        description="Program disembunyikan dari daftar, tetapi tetap tersimpan sebagai catatan periode ini."
      />
    </>
  );
}

function ProgramCard({
  organizationId,
  program,
  permissions,
  onEdit,
  onDelete,
}: {
  organizationId: string;
  program: ProgramRow;
  permissions: ProgramPermissions;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(program.progress);
  const status = programStatus(program.status);

  return (
    <Card>
      <CardContent className="space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {program.name}
            </p>
            <p className="text-[13px] text-muted-foreground">
              {program.periodName}
              {program.positionName ? ` · ${program.positionName}` : ""}
            </p>
          </div>
          {permissions.canManage ? null : (
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          )}
        </div>

        {program.description ? (
          <p className="text-[13px] text-muted-foreground">
            {program.description}
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          <div>
            <dt className="text-muted-foreground">Penanggung jawab</dt>
            <dd className="text-foreground">{program.memberName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Jadwal</dt>
            <dd className="text-foreground">
              {program.startDate ? formatShortDate(program.startDate) : "—"}
              {program.endDate ? ` – ${formatShortDate(program.endDate)}` : ""}
            </dd>
          </div>
          {program.budgetAmount !== null ? (
            <div>
              <dt className="text-muted-foreground">Estimasi anggaran</dt>
              <dd className="text-foreground">
                Rp {formatNumber(program.budgetAmount)}
              </dd>
            </div>
          ) : null}
          {program.target ? (
            <div>
              <dt className="text-muted-foreground">Target</dt>
              <dd className="text-foreground">{program.target}</dd>
            </div>
          ) : null}
        </dl>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress ${program.name}`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {permissions.canUpdateProgress ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                disabled={isPending}
                aria-label={`Ubah progress ${program.name}`}
                className="h-9 flex-1 accent-primary"
                onChange={(event) => setProgress(Number(event.target.value))}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || progress === program.progress}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateProgramProgress(
                      organizationId,
                      program.id,
                      progress,
                    );
                    showToast(
                      result.success ? "Progress diperbarui." : result.error,
                      result.success ? "success" : "error",
                    );
                  })
                }
              >
                Simpan
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
          {permissions.canManage ? (
            <Select
              aria-label={`Status ${program.name}`}
              value={program.status}
              disabled={isPending}
              className={cn(
                TINGGI_KONTROL_RINGKAS,
                "field-sizing-content w-auto text-[13px]",
              )}
              onChange={(event) => {
                const next = event.target.value as ProgramStatus;

                startTransition(async () => {
                  const result = await updateProgramStatus(
                    organizationId,
                    program.id,
                    next,
                  );
                  if (!result.success) showToast(result.error, "error");
                });
              }}
            >
              {PROGRAM_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {programStatus(value).label}
                </option>
              ))}
            </Select>
          ) : null}

          {permissions.canEdit ? (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil size={14} aria-hidden="true" />
              Ubah
            </Button>
          ) : null}

          {permissions.canDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 size={14} aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ProgramDialog({
  open,
  onClose,
  organizationId,
  periodOptions,
  positionOptions,
  memberOptions,
  program,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periodOptions: ProgramOption[];
  positionOptions: ProgramOption[];
  memberOptions: ProgramOption[];
  program?: ProgramRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(program);

  const action = isEdit
    ? updateWorkProgram.bind(null, organizationId, program!.id)
    : createWorkProgram.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  const jagaIsian = useJagaIsian(state);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Program diperbarui." : "Program dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Program Kerja" : "Tambah Program Kerja"}
      description="Program kerja selalu terikat pada satu periode kepengurusan."
    >
      <form {...jagaIsian(formAction)} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Program"
          htmlFor="program-name"
          required
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="program-name"
            name="name"
            required
            maxLength={160}
            defaultValue={program?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field label="Deskripsi" htmlFor="program-description">
          <Textarea
            id="program-description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={program?.description ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Periode"
            htmlFor="program-period"
            required
            error={fieldErrors?.organizationPeriodId?.[0]}
          >
            <Select
              id="program-period"
              name="organizationPeriodId"
              required
              defaultValue={program?.periodId ?? periodOptions[0]?.id ?? ""}
            >
              <option value="">Pilih periode</option>
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Status"
            htmlFor="program-status"
            required
            error={fieldErrors?.status?.[0]}
          >
            <Select
              id="program-status"
              name="status"
              required
              defaultValue={program?.status ?? "DRAFT"}
            >
              {PROGRAM_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {programStatus(value).label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jabatan Penanggung Jawab" htmlFor="program-position">
            <Select
              id="program-position"
              name="responsiblePositionId"
              defaultValue={program?.positionId ?? ""}
            >
              <option value="">Tidak ditentukan</option>
              {positionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Anggota Penanggung Jawab" htmlFor="program-member">
            <Select
              id="program-member"
              name="responsibleMemberId"
              defaultValue={program?.memberId ?? ""}
            >
              <option value="">Tidak ditentukan</option>
              {memberOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal Mulai" htmlFor="program-start">
            <Input
              id="program-start"
              name="startDate"
              type="date"
              defaultValue={program?.startDate ?? ""}
            />
          </Field>

          <Field
            label="Tanggal Selesai"
            htmlFor="program-end"
            error={fieldErrors?.endDate?.[0]}
          >
            <Input
              id="program-end"
              name="endDate"
              type="date"
              defaultValue={program?.endDate ?? ""}
              aria-invalid={Boolean(fieldErrors?.endDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target" htmlFor="program-target">
            <Input
              id="program-target"
              name="target"
              maxLength={300}
              defaultValue={program?.target ?? ""}
            />
          </Field>

          <Field
            label="Estimasi Anggaran"
            htmlFor="program-budget"
            hint="Dalam rupiah, tanpa titik."
            error={fieldErrors?.budgetAmount?.[0]}
          >
            <Input
              id="program-budget"
              name="budgetAmount"
              type="number"
              min={0}
              step={1000}
              defaultValue={program?.budgetAmount ?? ""}
              aria-invalid={Boolean(fieldErrors?.budgetAmount)}
            />
          </Field>
        </div>

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
