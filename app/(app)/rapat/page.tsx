import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Users2 } from "lucide-react";

import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { MEETING_STATUSES } from "@/features/meetings/schemas/meeting.schema";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
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

const UKURAN_HALAMAN = 20;

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.meetings.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  let query = supabase
    .from("meetings")
    .select("id, title, start_at, end_at, location, status", {
      count: "exact",
    })
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.status) query = query.eq("status", daftar.saring.status);
  if (daftar.cari) query = query.ilike("title", polaCari(daftar.cari));

  const { data, count } = await query
    .order("start_at", { ascending: false })
    .order("id", { ascending: true })
    .range(daftar.dari, daftar.sampai);

  const meetings = data ?? [];
  const disaring = daftar.cari !== "" || daftar.saring.status !== "";

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
                  status: daftar.saring.status || undefined,
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
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari rapat…"
          searchLabel="Cari rapat"
          filters={[
            {
              key: "status",
              label: "Saring menurut status",
              value: daftar.saring.status,
              allLabel: "Semua status",
              options: MEETING_STATUSES.map((status) => ({
                value: status,
                label: meetingStatus(status).label,
              })),
            },
          ]}
        />

        {meetings.length === 0 ? (
          <EmptyState
            icon={Users2}
            title={disaring ? "Tidak ada rapat yang cocok" : "Belum ada rapat"}
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan status."
                : "Rapat yang dijadwalkan akan tampil di sini beserta notulennya."
            }
          />
        ) : (
          <TableScroll bounded>
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
        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(1, Math.ceil((count ?? 0) / UKURAN_HALAMAN))}
          total={count ?? 0}
          pageSize={UKURAN_HALAMAN}
        />
      </Card>
    </div>
  );
}
