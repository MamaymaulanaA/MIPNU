"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Pencil, Plus } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
  checkInSelf,
  createAttendanceSession,
  recordAttendance,
  updateAttendanceSession,
} from "@/features/attendance/actions/manage-attendance";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from "@/features/attendance/schemas/attendance.schema";
import type { ActionResult } from "@/lib/errors";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { attendanceStatus } from "@/lib/status";

export type SessionFormValues = {
  id: string;
  eventId: string;
  name: string;
  openAt: string | null;
  closeAt: string | null;
  status: string;
};

export type EventOption = { id: string; label: string };

export type AttendanceMemberRow = {
  memberId: string;
  memberName: string;
  memberNumber: string | null;
  /** NULL berarti belum ada catatan sama sekali untuk anggota ini. */
  status: string | null;
  checkInAt: string | null;
};

const SESSION_STATUSES = [
  { value: "DRAFT", label: "Draf" },
  { value: "OPEN", label: "Dibuka" },
  { value: "CLOSED", label: "Ditutup" },
] as const;

/* ========================================================================== */

export function SessionFormDialog({
  organizationId,
  events,
  session,
  triggerVariant = "primary",
}: {
  organizationId: string;
  events: EventOption[];
  session?: SessionFormValues;
  triggerVariant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(session);

  return (
    <>
      <Button
        variant={triggerVariant}
        onClick={() => setOpen(true)}
        disabled={!isEdit && events.length === 0}
      >
        {isEdit ? (
          <>
            <Pencil size={16} aria-hidden="true" />
            Ubah Sesi
          </>
        ) : (
          <>
            <Plus size={16} aria-hidden="true" />
            Buat Sesi
          </>
        )}
      </Button>

      <SessionDialog
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        events={events}
        session={session}
      />
    </>
  );
}

function SessionDialog({
  open,
  onClose,
  organizationId,
  events,
  session,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  events: EventOption[];
  session?: SessionFormValues;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(session);

  const action = isEdit
    ? updateAttendanceSession.bind(null, organizationId, session!.id)
    : createAttendanceSession.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Sesi presensi diperbarui." : "Sesi presensi dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Sesi Presensi" : "Buat Sesi Presensi"}
      description="Presensi dibuka dari sebuah event. Anggota hanya dapat melakukan presensi mandiri selama sesi berstatus dibuka."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Event"
          htmlFor="session-event"
          required
          error={fieldErrors?.eventId?.[0]}
        >
          <Select
            id="session-event"
            name="eventId"
            required
            defaultValue={session?.eventId ?? ""}
            // Event sebuah sesi tidak diubah setelah sesi berjalan; catatan
            // presensi yang sudah ada terikat pada event tersebut.
            disabled={isEdit}
          >
            <option value="">Pilih event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </Select>
          {isEdit ? (
            <input type="hidden" name="eventId" value={session!.eventId} />
          ) : null}
        </Field>

        <Field
          label="Nama Sesi"
          htmlFor="session-name"
          required
          hint="Contoh: Presensi Hari Pertama"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="session-name"
            name="name"
            required
            maxLength={120}
            defaultValue={session?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Dibuka"
            htmlFor="session-open"
            error={fieldErrors?.openAt?.[0]}
          >
            <Input
              id="session-open"
              name="openAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(session?.openAt)}
            />
          </Field>

          <Field
            label="Ditutup"
            htmlFor="session-close"
            error={fieldErrors?.closeAt?.[0]}
          >
            <Input
              id="session-close"
              name="closeAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(session?.closeAt)}
              aria-invalid={Boolean(fieldErrors?.closeAt)}
            />
          </Field>
        </div>

        <Field
          label="Status"
          htmlFor="session-status"
          required
          error={fieldErrors?.status?.[0]}
        >
          <Select
            id="session-status"
            name="status"
            required
            defaultValue={session?.status ?? "DRAFT"}
          >
            {SESSION_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Sesi"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ========================================================================== */

/** Presensi mandiri untuk anggota. */
export function SelfCheckInButton({
  organizationId,
  sessionId,
  alreadyRecorded,
  sessionOpen,
}: {
  organizationId: string;
  sessionId: string;
  alreadyRecorded: boolean;
  sessionOpen: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (alreadyRecorded) {
    return <Badge tone="success">Anda sudah presensi</Badge>;
  }

  return (
    <Button
      disabled={isPending || !sessionOpen}
      onClick={() =>
        startTransition(async () => {
          const result = await checkInSelf(organizationId, sessionId);
          showToast(
            result.success ? "Presensi tercatat." : result.error,
            result.success ? "success" : "error",
          );
        })
      }
    >
      <CheckCircle2 size={16} aria-hidden="true" />
      {sessionOpen ? "Presensi Sekarang" : "Sesi belum dibuka"}
    </Button>
  );
}

/* ========================================================================== */

/**
 * Daftar hadir.
 *
 * Menampilkan SELURUH peserta event, bukan hanya yang sudah tercatat —
 * sehingga yang belum hadir terlihat sebagai baris kosong yang menunggu,
 * bukan sekadar tidak ada.
 */
export function AttendanceRoster({
  organizationId,
  sessionId,
  rows,
  canManage,
}: {
  organizationId: string;
  sessionId: string;
  rows: AttendanceMemberRow[];
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  return (
    <TableScroll bounded>
      <Table>
        <TableHead>
          <TableRow className="hover:bg-transparent">
            <TableHeaderCell>Nama</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="hidden md:table-cell">
              Waktu
            </TableHeaderCell>
            {canManage ? (
              <TableHeaderCell className="text-right">Catat</TableHeaderCell>
            ) : null}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row) => {
            const status = row.status ? attendanceStatus(row.status) : null;

            return (
              <TableRow key={row.memberId}>
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

                <TableCell>
                  {status ? (
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">
                      Belum dicatat
                    </span>
                  )}
                </TableCell>

                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {row.checkInAt ? formatDateTime(row.checkInAt) : "—"}
                </TableCell>

                {canManage ? (
                  <TableCell>
                    <div className="flex justify-end">
                      <Select
                        aria-label={`Status kehadiran ${row.memberName}`}
                        value={row.status ?? ""}
                        disabled={isPending}
                        className="h-8 w-auto min-w-32 text-[13px]"
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!next) return;

                          startTransition(async () => {
                            const result = await recordAttendance(
                              organizationId,
                              sessionId,
                              row.memberId,
                              next as AttendanceStatus,
                            );
                            if (!result.success) {
                              showToast(result.error, "error");
                            }
                          });
                        }}
                      >
                        <option value="">Belum dicatat</option>
                        {ATTENDANCE_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {attendanceStatus(value).label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroll>
  );
}
