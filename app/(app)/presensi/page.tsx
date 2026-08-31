import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SessionFormDialog } from "@/features/attendance/components/attendance-panels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, formatNumber, formatShortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Presensi",
};

const SESSION_STATUS = {
  DRAFT: { label: "Draf", tone: "neutral" },
  OPEN: { label: "Dibuka", tone: "success" },
  CLOSED: { label: "Ditutup", tone: "neutral" },
} as const;

export default async function AttendancePage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.attendance.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();
  const canCreateSession = can(context, PERMISSIONS.attendance.createSession);

  const { data: eventRows } = canCreateSession
    ? await supabase
        .from("events")
        .select("id, name, start_at")
        .eq("organization_id", context.organizationId)
        .is("deleted_at", null)
        .not("status", "in", '("CANCELLED","COMPLETED")')
        .order("start_at", { ascending: false })
        .limit(100)
    : { data: null };

  const eventOptions = (eventRows ?? []).map((event) => ({
    id: event.id,
    label: `${event.name} · ${formatShortDate(event.start_at)}`,
  }));

  const { data } = await supabase
    .from("attendance_sessions")
    .select(
      `
      id, name, method, status, open_at, close_at,
      events!inner ( name ),
      attendance_records ( count )
    `,
    )
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  type Row = {
    id: string;
    name: string;
    method: string;
    status: string;
    open_at: string | null;
    events: { name: string };
    attendance_records: { count: number }[];
  };

  const sessions = (data as unknown as Row[] | null) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Presensi"
        description="Sesi presensi kegiatan. Satu anggota satu catatan per sesi."
        actions={
          canCreateSession ? (
            <SessionFormDialog
              organizationId={context.organizationId}
              events={eventOptions}
            />
          ) : undefined
        }
      />

      <Card>
        {sessions.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Belum ada sesi presensi"
            description="Sesi presensi dibuat dari sebuah event, lalu dibuka saat kegiatan berlangsung."
            action={
              canCreateSession ? (
                <SessionFormDialog
                  organizationId={context.organizationId}
                  events={eventOptions}
                />
              ) : undefined
            }
          />
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Sesi</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Event
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Tercatat</TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Dibuka
                  </TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {sessions.map((session) => {
                  const status =
                    SESSION_STATUS[
                      session.status as keyof typeof SESSION_STATUS
                    ] ?? SESSION_STATUS.DRAFT;

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Link
                          href={`/presensi/${session.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {session.name}
                        </Link>
                        <span className="block text-[13px] text-muted-foreground md:hidden">
                          {session.events.name}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {session.events.name}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-foreground">
                        {formatNumber(
                          session.attendance_records[0]?.count ?? 0,
                        )}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatDateTime(session.open_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}
