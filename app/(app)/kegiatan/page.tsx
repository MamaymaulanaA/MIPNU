import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, MapPin, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { EVENT_STATUSES } from "@/features/events/schemas/event.schema";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventFormDialog } from "@/features/events/components/event-form-dialog";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, formatNumber } from "@/lib/format";
import { eventStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Event",
};

const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.events.view)) {
    return <ForbiddenState />;
  }

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  let eventQuery = supabase
    .from("events")
    .select(
      `
      id, name, description, start_at, end_at, location, capacity, status,
      event_participants ( count )
    `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.status)
    eventQuery = eventQuery.eq("status", daftar.saring.status);
  if (daftar.cari) eventQuery = eventQuery.ilike("name", polaCari(daftar.cari));

  const { data, count } = await eventQuery
    .order("start_at", { ascending: false })
    .order("id", { ascending: true })
    .range(daftar.dari, daftar.sampai);

  type Row = {
    id: string;
    name: string;
    description: string | null;
    start_at: string;
    location: string | null;
    capacity: number | null;
    status: string;
    event_participants: { count: number }[];
  };

  const events = (data as unknown as Row[] | null) ?? [];
  const disaring = daftar.cari !== "" || daftar.saring.status !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Event"
        description="Kegiatan yang dikelola organisasi."
        actions={
          can(context, PERMISSIONS.events.create) ? (
            <EventFormDialog organizationId={context.organizationId} />
          ) : undefined
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari event…"
          searchLabel="Cari event"
          filters={[
            {
              key: "status",
              label: "Saring menurut status",
              value: daftar.saring.status,
              allLabel: "Semua status",
              options: EVENT_STATUSES.map((status) => ({
                value: status,
                label: eventStatus(status).label,
              })),
            },
          ]}
        />

        {events.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title={disaring ? "Tidak ada event yang cocok" : "Belum ada event"}
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan status."
                : "Event yang dibuat organisasi akan tampil di sini."
            }
            action={
              !disaring && can(context, PERMISSIONS.events.create) ? (
                <EventFormDialog organizationId={context.organizationId} />
              ) : undefined
            }
          />
        ) : (
          <ul className="scroll-area max-h-[calc(100dvh-20rem)] min-h-[220px] divide-y divide-border">
            {events.map((event) => {
              const status = eventStatus(event.status);
              const participantCount = event.event_participants[0]?.count ?? 0;

              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/kegiatan/${event.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {event.name}
                    </Link>

                    {event.description ? (
                      <p className="line-clamp-2 text-[13px] text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange size={14} aria-hidden="true" />
                        {formatDateTime(event.start_at)}
                      </span>

                      {event.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={14} aria-hidden="true" />
                          {event.location}
                        </span>
                      ) : null}

                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} aria-hidden="true" />
                        {formatNumber(participantCount)} peserta
                        {event.capacity
                          ? ` / ${formatNumber(event.capacity)}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <Badge tone={status.tone} className="w-fit shrink-0" dot>
                    {status.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
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
