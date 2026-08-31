import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Users2 } from "lucide-react";

import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { exportMeetings } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import { MeetingFormDialog } from "@/features/meetings/components/meeting-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, orDash } from "@/lib/format";
import { meetingStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Rapat",
};

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.meetings.view)) {
    return <ForbiddenState />;
  }

  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("meetings")
    .select("id, title, start_at, end_at, location, status")
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (filters.status) query = query.eq("status", filters.status);

  const { data } = await query.order("start_at", { ascending: false });
  const meetings = data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rapat"
        description="Jadwal rapat, daftar peserta, dan notulennya."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can(context, PERMISSIONS.meetings.export) ? (
              <ExportButton
                action={exportMeetings.bind(null, context.organizationId, {
                  status: filters.status,
                })}
              />
            ) : null}

            {can(context, PERMISSIONS.meetings.create) ? (
              <MeetingFormDialog organizationId={context.organizationId} />
            ) : null}
          </div>
        }
      />

      <Card>
        {meetings.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="Belum ada rapat"
            description="Rapat yang dijadwalkan akan tampil di sini beserta notulennya."
          />
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Rapat</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Waktu
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Lokasi
                  </TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {meetings.map((meeting) => {
                  const status = meetingStatus(meeting.status);

                  return (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        <Link
                          href={`/rapat/${meeting.id}` as Route}
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {meeting.title}
                        </Link>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {formatDateTime(meeting.start_at)}
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {orDash(meeting.location)}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
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
