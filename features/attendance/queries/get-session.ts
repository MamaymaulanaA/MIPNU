import "server-only";

import type { AttendanceMemberRow } from "@/features/attendance/components/attendance-panels";
import { createClient } from "@/lib/supabase/server";

export type AttendanceSessionDetail = {
  id: string;
  name: string;
  eventId: string;
  eventName: string;
  status: string;
  openAt: string | null;
  closeAt: string | null;
  isOpen: boolean;
  method: string;
  hasActiveQrToken: boolean;
  qrExpiresAt: string | null;
  roster: AttendanceMemberRow[];
};

export async function getAttendanceSession(
  sessionId: string,
  organizationId: string,
): Promise<AttendanceSessionDetail | null> {
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from("attendance_sessions")
    .select(
      "id, name, event_id, status, method, open_at, close_at, qr_token_hash, qr_token_expires_at, events!inner ( name )",
    )
    .eq("id", sessionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    console.error("[mipnu] gagal memuat sesi presensi", error.message);
    return null;
  }
  if (!session) return null;

  const row = session as unknown as {
    id: string;
    name: string;
    event_id: string;
    status: string;
    method: string;
    open_at: string | null;
    close_at: string | null;
    qr_token_hash: string | null;
    qr_token_expires_at: string | null;
    events: { name: string };
  };

  const [participantsResult, recordsResult] = await Promise.all([
    supabase
      .from("event_participants")
      .select("member_id, members!inner ( full_name, member_number )")
      .eq("event_id", row.event_id)
      .in("registration_status", ["REGISTERED", "CONFIRMED"]),

    supabase
      .from("attendance_records")
      .select("member_id, status, check_in_at")
      .eq("attendance_session_id", sessionId),
  ]);

  type ParticipantRow = {
    member_id: string;
    members: { full_name: string; member_number: string | null };
  };

  const recordByMember = new Map(
    (recordsResult.data ?? []).map((record) => [record.member_id, record]),
  );

  const roster: AttendanceMemberRow[] = (
    (participantsResult.data as unknown as ParticipantRow[] | null) ?? []
  )
    .map((participant) => {
      const record = recordByMember.get(participant.member_id);

      return {
        memberId: participant.member_id,
        memberName: participant.members.full_name,
        memberNumber: participant.members.member_number,
        status: record?.status ?? null,
        checkInAt: record?.check_in_at ?? null,
      };
    })
    .sort((a, b) => a.memberName.localeCompare(b.memberName, "id"));

  const now = Date.now();

  return {
    id: row.id,
    name: row.name,
    eventId: row.event_id,
    eventName: row.events.name,
    status: row.status,
    openAt: row.open_at,
    closeAt: row.close_at,
    method: row.method,
    hasActiveQrToken:
      row.qr_token_hash !== null &&
      row.qr_token_expires_at !== null &&
      Date.parse(row.qr_token_expires_at) > now,
    qrExpiresAt: row.qr_token_expires_at,
    isOpen:
      row.status === "OPEN" &&
      (!row.open_at || Date.parse(row.open_at) <= now) &&
      (!row.close_at || Date.parse(row.close_at) >= now),
    roster,
  };
}
