"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Archive, CalendarRange, Pencil, Plus } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
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
  activatePeriod,
  archivePeriod,
  closePeriod,
  createPeriod,
  updatePeriod,
} from "@/features/periods/actions/manage-period";
import type { ActionResult } from "@/lib/errors";
import { formatShortDate } from "@/lib/format";
import { periodStatus } from "@/lib/status";

export type PeriodRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type PeriodPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canActivate: boolean;
  canClose: boolean;
  canArchive: boolean;
};

export type KeadaanDaftar = {
  cari: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  halaman: number;
  total: number;
  ukuranHalaman: number;
};

export function PeriodManager({
  organizationId,
  periods,
  permissions,
  daftar,
}: {
  organizationId: string;
  periods: PeriodRow[];
  permissions: PeriodPermissions;
  daftar: KeadaanDaftar;
}) {
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodRow | null>(null);
  const [activating, setActivating] = useState<PeriodRow | null>(null);
  const [closing, setClosing] = useState<PeriodRow | null>(null);
  const [archiving, setArchiving] = useState<PeriodRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runActivate() {
    if (!activating) return;
    const target = activating;

    startTransition(async () => {
      const result = await activatePeriod(organizationId, target.id);
      setActivating(null);
      showToast(
        result.success ? `Periode ${target.name} kini aktif.` : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  function runClose() {
    if (!closing) return;
    const target = closing;

    startTransition(async () => {
      const result = await closePeriod(organizationId, target.id);
      setClosing(null);
      showToast(
        result.success ? `Periode ${target.name} ditutup.` : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  function runArchive() {
    if (!archiving) return;
    const target = archiving;

    startTransition(async () => {
      const result = await archivePeriod(organizationId, target.id);
      setArchiving(null);
      showToast(
        result.success ? `Periode ${target.name} diarsipkan.` : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  const disaring = daftar.cari !== "" || daftar.status !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Periode Kepengurusan"
        description="Periode lama tetap tersimpan ketika periode baru dibuat."
        actions={
          permissions.canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Tambah Periode
            </Button>
          ) : undefined
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari periode…"
          searchLabel="Cari periode"
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

        {periods.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={
              disaring ? "Tidak ada periode yang cocok" : "Belum ada periode"
            }
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan status."
                : "Periode kepengurusan menjadi konteks bagi struktur pengurus, program kerja, dan laporan."
            }
            action={
              !disaring && permissions.canCreate ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Buat periode pertama
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Periode</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">
                    Mulai
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">
                    Selesai
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {periods.map((period) => {
                  const status = periodStatus(period.status);

                  return (
                    <TableRow key={period.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {period.name}
                        </span>
                        <span className="block text-[13px] text-muted-foreground sm:hidden">
                          {formatShortDate(period.startDate)} –{" "}
                          {formatShortDate(period.endDate)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatShortDate(period.startDate)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatShortDate(period.endDate)}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {permissions.canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(period)}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Ubah
                            </Button>
                          ) : null}

                          {permissions.canActivate &&
                          period.status !== "ACTIVE" &&
                          period.status !== "ARCHIVED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActivating(period)}
                            >
                              Aktifkan
                            </Button>
                          ) : null}

                          {permissions.canClose &&
                          period.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setClosing(period)}
                            >
                              Tutup
                            </Button>
                          ) : null}

                          {permissions.canArchive &&
                          period.status === "CLOSED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setArchiving(period)}
                            >
                              <Archive size={14} aria-hidden="true" />
                              Arsipkan
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

      <PeriodDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
      />

      <PeriodDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        period={editing}
      />

      <ConfirmDialog
        open={Boolean(activating)}
        onClose={() => setActivating(null)}
        onConfirm={runActivate}
        pending={isPending}
        confirmLabel="Aktifkan"
        title="Aktifkan periode ini?"
        description={`Periode yang sedang aktif akan ditutup. Permission jabatan yang bersandar pada periode lama berhenti berlaku, dan strukturnya tetap tersimpan sebagai riwayat.`}
      />

      <ConfirmDialog
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        onConfirm={runClose}
        pending={isPending}
        destructive
        confirmLabel="Tutup Periode"
        title="Tutup periode ini?"
        description="Organisasi akan berada tanpa periode aktif sampai periode lain diaktifkan. Permission yang berasal dari jabatan pada periode ini berhenti berlaku."
      />

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={runArchive}
        pending={isPending}
        confirmLabel="Arsipkan"
        title="Arsipkan periode ini?"
        description="Periode disingkirkan dari daftar kerja sehari-hari. Tidak ada data yang dihapus: struktur kepengurusan periode ini tetap tersimpan dan tetap dapat dibaca sebagai riwayat."
      />
    </div>
  );
}

function PeriodDialog({
  open,
  onClose,
  organizationId,
  period,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  period?: PeriodRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(period);

  const action = isEdit
    ? updatePeriod.bind(null, organizationId, period!.id)
    : createPeriod.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Periode diperbarui." : "Periode dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Periode" : "Tambah Periode"}
      description={
        isEdit
          ? undefined
          : "Periode baru dibuat sebagai draf. Aktifkan setelah siap."
      }
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Periode"
          htmlFor="period-name"
          required
          hint="Contoh: 2026–2028"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="period-name"
            name="name"
            required
            maxLength={80}
            defaultValue={period?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Tanggal Mulai"
            htmlFor="period-start"
            required
            error={fieldErrors?.startDate?.[0]}
          >
            <Input
              id="period-start"
              name="startDate"
              type="date"
              required
              defaultValue={period?.startDate ?? ""}
            />
          </Field>

          <Field
            label="Tanggal Selesai"
            htmlFor="period-end"
            required
            error={fieldErrors?.endDate?.[0]}
          >
            <Input
              id="period-end"
              name="endDate"
              type="date"
              required
              defaultValue={period?.endDate ?? ""}
              aria-invalid={Boolean(fieldErrors?.endDate)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Periode"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
