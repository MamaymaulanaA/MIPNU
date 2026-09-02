"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Users2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
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
  addMeetingParticipant,
  createMeeting,
  deleteMeeting,
  removeMeetingParticipant,
  saveMeetingMinutes,
  setMeetingAttendance,
  updateMeeting,
} from "@/features/meetings/actions/manage-meeting";
import {
  MEETING_ATTENDANCE,
  MEETING_STATUSES,
  type MeetingAttendance,
} from "@/features/meetings/schemas/meeting.schema";
import type { ActionResult } from "@/lib/errors";
import { toDateTimeLocal } from "@/lib/format";
import { meetingAttendance, meetingStatus } from "@/lib/status";

export type MeetingFormValues = {
  id: string;
  title: string;
  agenda: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  status: string;
};

export type MeetingParticipantRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string | null;
  attendanceStatus: string;
};

export type MinutesValues = {
  content: string;
  decisions: string | null;
  followUp: string | null;
} | null;

/* ========================================================================== */

export function MeetingFormDialog({
  organizationId,
  meeting,
  triggerLabel,
  triggerVariant = "primary",
}: {
  organizationId: string;
  meeting?: MeetingFormValues;
  triggerLabel?: string;
  triggerVariant?: "primary" | "outline" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(meeting);

  return (
    <>
      <Button
        variant={triggerVariant}
        size={isEdit ? "sm" : "default"}
        onClick={() => setOpen(true)}
      >
        {isEdit ? (
          <Pencil size={14} aria-hidden="true" />
        ) : (
          <Plus size={16} aria-hidden="true" />
        )}
        {triggerLabel ?? (isEdit ? "Ubah Rapat" : "Buat Rapat")}
      </Button>

      <MeetingDialog
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        meeting={meeting}
      />
    </>
  );
}

function MeetingDialog({
  open,
  onClose,
  organizationId,
  meeting,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  meeting?: MeetingFormValues;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(meeting);

  const action = isEdit
    ? updateMeeting.bind(null, organizationId, meeting!.id)
    : createMeeting.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Rapat diperbarui." : "Rapat dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Rapat" : "Buat Rapat"}
      description="Peserta dan notulen dikelola dari halaman detail rapat."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Judul Rapat"
          htmlFor="meeting-title"
          required
          hint="Contoh: Rapat Pleno Bulanan"
          error={fieldErrors?.title?.[0]}
        >
          <Input
            id="meeting-title"
            name="title"
            required
            maxLength={160}
            defaultValue={meeting?.title ?? ""}
            aria-invalid={Boolean(fieldErrors?.title)}
          />
        </Field>

        <Field label="Agenda Rapat" htmlFor="meeting-agenda">
          <Textarea
            id="meeting-agenda"
            name="agenda"
            rows={3}
            maxLength={2000}
            defaultValue={meeting?.agenda ?? ""}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mulai"
            htmlFor="meeting-start"
            required
            error={fieldErrors?.startAt?.[0]}
          >
            <Input
              id="meeting-start"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(meeting?.startAt)}
              aria-invalid={Boolean(fieldErrors?.startAt)}
            />
          </Field>

          <Field
            label="Selesai"
            htmlFor="meeting-end"
            error={fieldErrors?.endAt?.[0]}
          >
            <Input
              id="meeting-end"
              name="endAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(meeting?.endAt)}
              aria-invalid={Boolean(fieldErrors?.endAt)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lokasi" htmlFor="meeting-location">
            <Input
              id="meeting-location"
              name="location"
              maxLength={160}
              defaultValue={meeting?.location ?? ""}
            />
          </Field>

          <Field label="Status" htmlFor="meeting-status" required>
            <Select
              id="meeting-status"
              name="status"
              required
              defaultValue={meeting?.status ?? "SCHEDULED"}
            >
              {MEETING_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {meetingStatus(value).label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Rapat"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ========================================================================== */

export function DeleteMeetingButton({
  organizationId,
  meetingId,
  meetingTitle,
}: {
  organizationId: string;
  meetingId: string;
  meetingTitle: string;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={14} aria-hidden="true" />
        Hapus
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            const result = await deleteMeeting(organizationId, meetingId);
            setOpen(false);
            showToast(
              result.success ? "Rapat dihapus." : result.error,
              result.success ? "success" : "error",
            );
          })
        }
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title={`Hapus rapat ${meetingTitle}?`}
        description="Rapat disembunyikan dari daftar. Notulen dan daftar pesertanya tetap tersimpan."
      />
    </>
  );
}

/* ========================================================================== */

export function MeetingParticipants({
  organizationId,
  meetingId,
  participants,
  memberOptions,
  canManage,
}: {
  organizationId: string;
  meetingId: string;
  participants: MeetingParticipantRow[];
  memberOptions: { id: string; label: string }[];
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  const taken = new Set(participants.map((row) => row.memberId));
  const available = memberOptions.filter((option) => !taken.has(option.id));

  // Daftar anggota yang dapat dipilih disaring RLS: pemegang
  // meetings.manage_participants yang TIDAK memegang members.view hanya
  // melihat dirinya sendiri. Membedakan kedua sebab kosongnya penting —
  // "semua sudah jadi peserta" dan "Anda tidak dapat melihat anggota lain"
  // menuntut tindakan yang sama sekali berbeda dari pembacanya.
  const noneVisible = memberOptions.length === 0;

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label="Tambah Peserta"
            htmlFor="meeting-participant"
            hint={
              noneVisible
                ? "Memilih peserta menuntut permission members.view pada jabatan Anda."
                : undefined
            }
          >
            <Select
              id="meeting-participant"
              value={selected}
              disabled={isPending || available.length === 0}
              onChange={(event) => setSelected(event.target.value)}
              className="min-w-56"
            >
              <option value="">
                {available.length > 0
                  ? "Pilih anggota"
                  : noneVisible
                    ? "Anda tidak berhak melihat data anggota"
                    : "Semua anggota sudah menjadi peserta"}
              </option>
              {available.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            variant="outline"
            disabled={isPending || !selected}
            onClick={() =>
              startTransition(async () => {
                const result = await addMeetingParticipant(
                  organizationId,
                  meetingId,
                  selected,
                );
                if (result.success) setSelected("");
                showToast(
                  result.success ? "Peserta ditambahkan." : result.error,
                  result.success ? "success" : "error",
                );
              })
            }
          >
            <Plus size={16} aria-hidden="true" />
            Tambah
          </Button>
        </div>
      ) : null}

      {participants.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="Belum ada peserta"
          description="Tambahkan anggota yang diundang ke rapat ini."
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Nama</TableHeaderCell>
                <TableHeaderCell>Kehadiran</TableHeaderCell>
                {canManage ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {participants.map((row) => {
                const status = meetingAttendance(row.attendanceStatus);

                return (
                  <TableRow key={row.id}>
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
                      {canManage ? (
                        <Select
                          aria-label={`Kehadiran ${row.memberName}`}
                          value={row.attendanceStatus}
                          disabled={isPending}
                          className={cn(
                            TINGGI_KONTROL_RINGKAS,
                            // Memeluk nilai yang sedang tampil.
                            // `min-w-32` yang lama membatalkan hal itu:
                            // lantai 128px membuat nilai sependek
                            // "Izin" tetap duduk di kotak selebar itu.
                            // `w-auto` tetap ada sebagai jaring pengaman
                            // untuk peramban tanpa `field-sizing`.
                            "field-sizing-content w-auto text-[13px]",
                          )}
                          onChange={(event) => {
                            const next = event.target
                              .value as MeetingAttendance;

                            startTransition(async () => {
                              const result = await setMeetingAttendance(
                                organizationId,
                                meetingId,
                                row.id,
                                next,
                              );
                              if (!result.success) {
                                showToast(result.error, "error");
                              }
                            });
                          }}
                        >
                          {MEETING_ATTENDANCE.map((value) => (
                            <option key={value} value={value}>
                              {meetingAttendance(value).label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      )}
                    </TableCell>

                    {canManage ? (
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await removeMeetingParticipant(
                                  organizationId,
                                  meetingId,
                                  row.id,
                                );
                                if (!result.success) {
                                  showToast(result.error, "error");
                                }
                              })
                            }
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Keluarkan
                          </Button>
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
    </div>
  );
}

/* ========================================================================== */

export function MeetingMinutes({
  organizationId,
  meetingId,
  minutes,
  canManage,
}: {
  organizationId: string;
  meetingId: string;
  minutes: MinutesValues;
  canManage: boolean;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(saveMeetingMinutes.bind(null, organizationId, meetingId), null);

  useEffect(() => {
    if (state?.success) showToast("Notulen disimpan.");
  }, [state, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  if (!canManage) {
    if (!minutes) {
      return (
        <p className="text-[13px] text-muted-foreground">
          Notulen rapat ini belum ditulis.
        </p>
      );
    }

    return (
      <dl className="space-y-4">
        <div>
          <dt className="text-[13px] font-medium text-foreground">Ringkasan</dt>
          <dd className="mt-1 text-[13px] whitespace-pre-line text-muted-foreground">
            {minutes.content}
          </dd>
        </div>
        {minutes.decisions ? (
          <div>
            <dt className="text-[13px] font-medium text-foreground">
              Keputusan
            </dt>
            <dd className="mt-1 text-[13px] whitespace-pre-line text-muted-foreground">
              {minutes.decisions}
            </dd>
          </div>
        ) : null}
        {minutes.followUp ? (
          <div>
            <dt className="text-[13px] font-medium text-foreground">
              Tindak Lanjut
            </dt>
            <dd className="mt-1 text-[13px] whitespace-pre-line text-muted-foreground">
              {minutes.followUp}
            </dd>
          </div>
        ) : null}
      </dl>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={fieldErrors ? undefined : failed?.error} />

      <Field
        label="Ringkasan"
        htmlFor="minutes-content"
        required
        hint="Jalannya rapat, pembahasan pokok, dan siapa yang menyampaikan apa."
        error={fieldErrors?.content?.[0]}
      >
        <Textarea
          id="minutes-content"
          name="content"
          rows={6}
          required
          maxLength={20000}
          defaultValue={minutes?.content ?? ""}
          aria-invalid={Boolean(fieldErrors?.content)}
        />
      </Field>

      <Field label="Keputusan" htmlFor="minutes-decisions">
        <Textarea
          id="minutes-decisions"
          name="decisions"
          rows={4}
          maxLength={10000}
          defaultValue={minutes?.decisions ?? ""}
        />
      </Field>

      <Field label="Tindak Lanjut" htmlFor="minutes-follow-up">
        <Textarea
          id="minutes-follow-up"
          name="followUp"
          rows={4}
          maxLength={10000}
          defaultValue={minutes?.followUp ?? ""}
        />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>Simpan Notulen</SubmitButton>
      </div>
    </form>
  );
}
