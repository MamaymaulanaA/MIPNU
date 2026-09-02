import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, MapPin, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventFormDialog } from "@/features/events/components/event-form-dialog";
import {
  CommitteePanel,
  ParticipantPanel,
  SelfRegistrationControl,
} from "@/features/events/components/event-panels";
import { getEvent } from "@/features/events/queries/get-event";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, formatNumber, orDash } from "@/lib/format";
import { eventStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Detail Event",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.events.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();
  const organizationId = context.organizationId;

  const event = await getEvent(id);
  if (!event) notFound();

  const canManageParticipants = can(
    context,
    PERMISSIONS.events.manageParticipants,
  );
  const canAssignCommittee = can(context, PERMISSIONS.events.assignCommittee);
  const canEdit = can(context, PERMISSIONS.events.edit);

  const [participantsResult, committeeResult, memberResult, catalogResult] =
    await Promise.all([
      supabase
        .from("event_participants")
        .select(
          "id, member_id, registration_status, registered_at, members!inner ( full_name, member_number )",
        )
        .eq("event_id", id)
        .order("registered_at", { ascending: true }),

      supabase
        .from("event_committees")
        .select(
          "id, member_id, position_name, members!inner ( full_name ), event_committee_permissions ( permission_id )",
        )
        .eq("event_id", id)
        .order("created_at", { ascending: true }),

      canManageParticipants || canAssignCommittee
        ? supabase
            .from("members")
            .select("id, full_name, member_number")
            .eq("organization_id", organizationId)
            .eq("status", "ACTIVE")
            .is("deleted_at", null)
            .order("full_name")
        : Promise.resolve({ data: null }),

      canAssignCommittee
        ? supabase
            .from("permissions")
            .select("id, code, resource, description")
            .eq("is_platform", false)
            .order("resource")
            .order("code")
        : Promise.resolve({ data: null }),
    ]);

  type ParticipantQueryRow = {
    id: string;
    member_id: string;
    registration_status: string;
    registered_at: string;
    members: { full_name: string; member_number: string | null };
  };

  type CommitteeQueryRow = {
    id: string;
    member_id: string;
    position_name: string;
    members: { full_name: string };
    event_committee_permissions: { permission_id: string }[];
  };

  const participants = (
    (participantsResult.data as unknown as ParticipantQueryRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.members.full_name,
    memberNumber: row.members.member_number,
    status: row.registration_status,
    registeredAt: row.registered_at,
  }));

  const committee = (
    (committeeResult.data as unknown as CommitteeQueryRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    memberName: row.members.full_name,
    positionName: row.position_name,
    permissionIds: row.event_committee_permissions.map(
      (entry) => entry.permission_id,
    ),
  }));

  const memberOptions = (memberResult.data ?? []).map((member) => ({
    id: member.id,
    label: member.member_number
      ? `${member.full_name} · ${member.member_number}`
      : member.full_name,
  }));

  const status = eventStatus(event.status);

  const ownRegistration = context.memberId
    ? participants.find(
        (participant) =>
          participant.memberId === context.memberId &&
          participant.status !== "CANCELLED",
      )
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={event.name}
        description={formatDateTime(event.startAt)}
        actions={
          <>
            {context.memberId ? (
              <SelfRegistrationControl
                organizationId={organizationId}
                eventId={event.id}
                isRegistered={Boolean(ownRegistration)}
                registrationOpen={event.registrationOpen}
                canRegister={can(context, PERMISSIONS.events.register)}
                canCancel={can(context, PERMISSIONS.events.cancelRegistration)}
              />
            ) : null}

            {canEdit ? (
              <EventFormDialog
                organizationId={organizationId}
                triggerVariant="secondary"
                event={{
                  id: event.id,
                  name: event.name,
                  description: event.description,
                  startAt: event.startAt,
                  endAt: event.endAt,
                  location: event.location,
                  capacity: event.capacity,
                  registrationStartAt: event.registrationStartAt,
                  registrationEndAt: event.registrationEndAt,
                  status: event.status,
                  visibility: event.visibility,
                }}
              />
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Informasi Event</CardTitle>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Detail
              label="Waktu"
              value={
                event.endAt
                  ? `${formatDateTime(event.startAt)} – ${formatDateTime(event.endAt)}`
                  : formatDateTime(event.startAt)
              }
              icon={CalendarRange}
            />
            <Detail label="Lokasi" value={event.location} icon={MapPin} />
            <Detail
              label="Kapasitas"
              value={
                event.capacity
                  ? `${formatNumber(event.capacity)} peserta`
                  : "Tanpa batas"
              }
              icon={Users}
            />
            <Detail
              label="Pendaftaran"
              value={
                event.registrationStartAt || event.registrationEndAt
                  ? `${formatDateTime(event.registrationStartAt)} – ${formatDateTime(event.registrationEndAt)}`
                  : "Tidak dijadwalkan"
              }
            />
            <Detail
              label="Deskripsi"
              value={event.description}
              className="sm:col-span-2"
            />
          </dl>
        </CardContent>
      </Card>

      <ParticipantPanel
        organizationId={organizationId}
        eventId={event.id}
        participants={participants}
        memberOptions={memberOptions}
        capacity={event.capacity}
        canManage={canManageParticipants}
      />

      <CommitteePanel
        organizationId={organizationId}
        eventId={event.id}
        committee={committee}
        memberOptions={memberOptions}
        permissionCatalog={catalogResult.data ?? []}
        canManage={canAssignCommittee}
      />
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | null;
  icon?: typeof CalendarRange;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-start gap-1.5 text-sm break-words text-foreground">
        {Icon ? (
          <Icon
            size={15}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-muted-foreground"
          />
        ) : null}
        <span>{orDash(value)}</span>
      </dd>
    </div>
  );
}
