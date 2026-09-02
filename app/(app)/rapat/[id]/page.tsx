import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DeleteMeetingButton,
  MeetingFormDialog,
  MeetingMinutes,
  MeetingParticipants,
  type MeetingParticipantRow,
} from "@/features/meetings/components/meeting-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, orDash } from "@/lib/format";
import { meetingStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Detail Rapat",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.meetings.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, title, agenda, start_at, end_at, location, status")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!meeting) notFound();

  const [participantsResult, minutesResult, membersResult] = await Promise.all([
    supabase
      .from("meeting_participants")
      .select(
        `
        id, member_id, attendance_status,
        members!meeting_participants_member_fk ( full_name, member_number )
      `,
      )
      .eq("meeting_id", id)
      .eq("organization_id", context.organizationId),

    supabase
      .from("meeting_minutes")
      .select("content, decisions, follow_up")
      .eq("meeting_id", id)
      .maybeSingle(),

    supabase
      .from("members")
      .select("id, full_name, member_number")
      .eq("organization_id", context.organizationId)
      .is("deleted_at", null)
      .order("full_name"),
  ]);

  type ParticipantRow = {
    id: string;
    member_id: string;
    attendance_status: string;
    members: { full_name: string; member_number: string | null } | null;
  };

  const participants: MeetingParticipantRow[] = (
    (participantsResult.data as unknown as ParticipantRow[] | null) ?? []
  )
    .map((row) => ({
      id: row.id,
      memberId: row.member_id,
      memberName: row.members?.full_name ?? "—",
      memberNumber: row.members?.member_number ?? null,
      attendanceStatus: row.attendance_status,
    }))
    .sort((a, b) => a.memberName.localeCompare(b.memberName, "id"));

  const status = meetingStatus(meeting.status);
  const canEdit = can(context, PERMISSIONS.meetings.edit);

  return (
    <div className="space-y-5">
      <PageHeader
        title={meeting.title}
        description={`${formatDateTime(meeting.start_at)}${
          meeting.location ? ` · ${meeting.location}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>

            {canEdit ? (
              <MeetingFormDialog
                organizationId={context.organizationId}
                triggerVariant="outline"
                meeting={{
                  id: meeting.id,
                  title: meeting.title,
                  agenda: meeting.agenda,
                  startAt: meeting.start_at,
                  endAt: meeting.end_at,
                  location: meeting.location,
                  status: meeting.status,
                }}
              />
            ) : null}

            {can(context, PERMISSIONS.meetings.delete) ? (
              <DeleteMeetingButton
                organizationId={context.organizationId}
                meetingId={meeting.id}
                meetingTitle={meeting.title}
              />
            ) : null}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Agenda Rapat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] whitespace-pre-line text-muted-foreground">
            {orDash(meeting.agenda)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peserta</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingParticipants
            organizationId={context.organizationId}
            meetingId={meeting.id}
            participants={participants}
            canManage={can(context, PERMISSIONS.meetings.manageParticipants)}
            memberOptions={(
              (membersResult.data as
                | {
                    id: string;
                    full_name: string;
                    member_number: string | null;
                  }[]
                | null) ?? []
            ).map((member) => ({
              id: member.id,
              label: member.member_number
                ? `${member.full_name} · ${member.member_number}`
                : member.full_name,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notulen</CardTitle>
        </CardHeader>
        <CardContent>
          <MeetingMinutes
            organizationId={context.organizationId}
            meetingId={meeting.id}
            canManage={can(context, PERMISSIONS.meetings.manageMinutes)}
            minutes={
              minutesResult.data
                ? {
                    content: minutesResult.data.content,
                    decisions: minutesResult.data.decisions,
                    followUp: minutesResult.data.follow_up,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
