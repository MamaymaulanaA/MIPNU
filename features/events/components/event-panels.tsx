"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { KeyRound, Plus, Trash2, UserPlus, Users } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  addCommitteeMember,
  removeCommitteeMember,
  setCommitteePermissions,
} from "@/features/events/actions/manage-committee";
import {
  addParticipant,
  cancelOwnRegistration,
  registerSelfForEvent,
  setParticipantStatus,
} from "@/features/events/actions/manage-participants";
import { PARTICIPANT_STATUSES } from "@/features/events/schemas/event.schema";
import type { ActionResult } from "@/lib/errors";
import { formatDateTime, formatNumber } from "@/lib/format";
import { participantStatus } from "@/lib/status";

export type ParticipantRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: string | null;
  status: string;
  registeredAt: string;
};

export type CommitteeRow = {
  id: string;
  memberId: string;
  memberName: string;
  positionName: string;
  permissionIds: string[];
};

export type MemberOption = { id: string; label: string };
export type PermissionOption = {
  id: string;
  code: string;
  resource: string;
  description: string | null;
};

export function SelfRegistrationControl({
  organizationId,
  eventId,
  isRegistered,
  registrationOpen,
  canRegister,
  canCancel,
}: {
  organizationId: string;
  eventId: string;
  isRegistered: boolean;
  registrationOpen: boolean;
  canRegister: boolean;
  canCancel: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  if (isRegistered) {
    if (!canCancel) {
      return <Badge tone="success">Anda terdaftar</Badge>;
    }

    return (
      <div className="flex items-center gap-2">
        <Badge tone="success">Anda terdaftar</Badge>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelOwnRegistration(
                organizationId,
                eventId,
              );
              showToast(
                result.success ? "Pendaftaran dibatalkan." : result.error,
                result.success ? "success" : "error",
              );
            })
          }
        >
          Batalkan
        </Button>
      </div>
    );
  }

  if (!canRegister) return null;

  return (
    <Button
      disabled={isPending || !registrationOpen}
      onClick={() =>
        startTransition(async () => {
          const result = await registerSelfForEvent(organizationId, eventId);
          showToast(
            result.success ? "Anda terdaftar pada event ini." : result.error,
            result.success ? "success" : "error",
          );
        })
      }
    >
      <UserPlus size={16} aria-hidden="true" />
      {registrationOpen ? "Daftar Event" : "Pendaftaran ditutup"}
    </Button>
  );
}

export function ParticipantPanel({
  organizationId,
  eventId,
  participants,
  memberOptions,
  capacity,
  canManage,
}: {
  organizationId: string;
  eventId: string;
  participants: ParticipantRow[];
  memberOptions: MemberOption[];
  capacity: number | null;
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const taken = participants.filter((participant) =>
    ["REGISTERED", "CONFIRMED"].includes(participant.status),
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Peserta</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            {formatNumber(taken)} memegang kursi
            {capacity ? ` dari ${formatNumber(capacity)}` : ""}
          </p>
        </div>

        {canManage ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={memberOptions.length === 0}
          >
            <Plus size={15} aria-hidden="true" />
            Tambah Peserta
          </Button>
        ) : null}
      </CardHeader>

      {participants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada peserta"
          description="Peserta yang mendaftar atau ditambahkan panitia akan tampil di sini."
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Nama</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">
                  Terdaftar
                </TableHeaderCell>
                {canManage ? (
                  <TableHeaderCell className="text-right">
                    Ubah Status
                  </TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {participants.map((participant) => {
                const status = participantStatus(participant.status);

                return (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {participant.memberName}
                      </span>
                      {participant.memberNumber ? (
                        <span className="block text-[13px] text-muted-foreground">
                          {participant.memberNumber}
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDateTime(participant.registeredAt)}
                    </TableCell>

                    {canManage ? (
                      <TableCell>
                        <div className="flex justify-end">
                          <Select
                            aria-label={`Status ${participant.memberName}`}
                            value={participant.status}
                            disabled={isPending}
                            className={cn(
                              TINGGI_KONTROL_RINGKAS,
                              // Memeluk nilai yang sedang tampil.
                              // `min-w-32` yang lama membatalkan hal itu:
                              // lantai 128px membuat status sependek
                              // "Terdaftar" tetap duduk di kotak selebar itu.
                              // `w-auto` tetap ada sebagai jaring pengaman
                              // untuk peramban tanpa `field-sizing`.
                              "field-sizing-content w-auto text-[13px]",
                            )}
                            onChange={(event) => {
                              const next = event.target
                                .value as (typeof PARTICIPANT_STATUSES)[number];

                              startTransition(async () => {
                                const result = await setParticipantStatus(
                                  organizationId,
                                  eventId,
                                  participant.id,
                                  next,
                                );
                                if (!result.success) {
                                  showToast(result.error, "error");
                                }
                              });
                            }}
                          >
                            {PARTICIPANT_STATUSES.map((value) => (
                              <option key={value} value={value}>
                                {participantStatus(value).label}
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
      )}

      <AddParticipantDialog
        key={addOpen ? "add-open" : "add-closed"}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        organizationId={organizationId}
        eventId={eventId}
        memberOptions={memberOptions}
      />
    </Card>
  );
}

function AddParticipantDialog({
  open,
  onClose,
  organizationId,
  eventId,
  memberOptions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  eventId: string;
  memberOptions: MemberOption[];
}) {
  const { showToast } = useToast();
  const [memberId, setMemberId] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!memberId) return;

    startTransition(async () => {
      const result = await addParticipant(organizationId, eventId, memberId);
      if (result.success) {
        showToast("Peserta ditambahkan.");
        onClose();
      } else {
        showToast(result.error, "error");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah Peserta"
      description="Peserta yang ditambahkan panitia langsung berstatus dikonfirmasi."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={isPending || !memberId}>
            {isPending ? "Menambahkan…" : "Tambah"}
          </Button>
        </>
      }
    >
      <Field label="Anggota" htmlFor="participant-member" required>
        <Select
          id="participant-member"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        >
          <option value="">Pilih anggota</option>
          {memberOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}

export function CommitteePanel({
  organizationId,
  eventId,
  committee,
  memberOptions,
  permissionCatalog,
  canManage,
}: {
  organizationId: string;
  eventId: string;
  committee: CommitteeRow[];
  memberOptions: MemberOption[];
  permissionCatalog: PermissionOption[];
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [permissionTarget, setPermissionTarget] = useState<CommitteeRow | null>(
    null,
  );
  const [removing, setRemoving] = useState<CommitteeRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runRemove() {
    if (!removing) return;
    const target = removing;

    startTransition(async () => {
      const result = await removeCommitteeMember(
        organizationId,
        eventId,
        target.id,
      );
      setRemoving(null);
      showToast(
        result.success ? "Panitia dilepas." : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Panitia</CardTitle>
          <p className="text-[13px] text-muted-foreground">
            Penugasan terikat pada event ini saja, bukan role permanen.
          </p>
        </div>

        {canManage ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={memberOptions.length === 0}
          >
            <Plus size={15} aria-hidden="true" />
            Tunjuk Panitia
          </Button>
        ) : null}
      </CardHeader>

      {committee.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum ada panitia"
          description="Panitia dapat diberi permission khusus yang hanya berlaku untuk event ini."
        />
      ) : (
        <ul className="divide-y divide-border">
          {committee.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {member.memberName}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {member.positionName}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {member.permissionIds.length > 0 ? (
                  <Badge tone="primary">
                    {member.permissionIds.length} permission
                  </Badge>
                ) : null}

                {canManage ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPermissionTarget(member)}
                    >
                      <KeyRound size={14} aria-hidden="true" />
                      Permission
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => setRemoving(member)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span className="sr-only">Lepas {member.memberName}</span>
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddCommitteeDialog
        key={addOpen ? "committee-open" : "committee-closed"}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        organizationId={organizationId}
        eventId={eventId}
        memberOptions={memberOptions}
      />

      <CommitteePermissionDialog
        key={permissionTarget?.id ?? "committee-perm-closed"}
        open={Boolean(permissionTarget)}
        onClose={() => setPermissionTarget(null)}
        organizationId={organizationId}
        eventId={eventId}
        committee={permissionTarget}
        catalog={permissionCatalog}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={runRemove}
        pending={isPending}
        destructive
        confirmLabel="Lepas Panitia"
        title={`Lepas ${removing?.memberName ?? ""} dari kepanitiaan?`}
        description="Permission khusus yang diberikan untuk event ini ikut dicabut seketika."
      />
    </Card>
  );
}

function AddCommitteeDialog({
  open,
  onClose,
  organizationId,
  eventId,
  memberOptions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  eventId: string;
  memberOptions: MemberOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(addCommitteeMember.bind(null, organizationId, eventId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Panitia ditunjuk.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog open={open} onClose={onClose} title="Tunjuk Panitia">
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Anggota"
          htmlFor="committee-member"
          required
          error={fieldErrors?.memberId?.[0]}
        >
          <Select
            id="committee-member"
            name="memberId"
            required
            defaultValue=""
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
          label="Tugas"
          htmlFor="committee-position"
          required
          hint="Contoh: Ketua Panitia, Sekretaris, Koordinator Acara"
          error={fieldErrors?.positionName?.[0]}
        >
          <Input
            id="committee-position"
            name="positionName"
            required
            maxLength={100}
            aria-invalid={Boolean(fieldErrors?.positionName)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Tunjuk</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

function CommitteePermissionDialog({
  open,
  onClose,
  organizationId,
  eventId,
  committee,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  eventId: string;
  committee: CommitteeRow | null;
  catalog: PermissionOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(
    setCommitteePermissions.bind(
      null,
      organizationId,
      eventId,
      committee?.id ?? "",
    ),
    null,
  );

  useEffect(() => {
    if (state?.success) {
      showToast("Permission panitia diperbarui.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionOption[]>();
    for (const permission of catalog) {
      const list = groups.get(permission.resource) ?? [];
      list.push(permission);
      groups.set(permission.resource, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);

  const assigned = new Set(committee?.permissionIds ?? []);
  const failed = state && !state.success ? state : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Permission Panitia — ${committee?.memberName ?? ""}`}
      description="Hanya berlaku untuk event ini. Panitia event lain tidak terpengaruh."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={failed?.error} />

        {grouped.map(([resource, items]) => (
          <fieldset key={resource} className="space-y-2">
            <legend className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              {resource}
            </legend>

            <div className="grid gap-1.5">
              {items.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={permission.id}
                    defaultChecked={assigned.has(permission.id)}
                    className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-foreground">
                      {permission.description ?? permission.code}
                    </span>
                    <span className="block font-mono text-[12px] text-muted-foreground">
                      {permission.code}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card pt-3">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Simpan Permission</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
