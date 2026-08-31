import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, MapPin, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
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

export default async function EventsPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.events.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  // Jumlah peserta dihitung database-side lewat agregat relasi, bukan dengan
  // mengambil seluruh baris peserta lalu menghitungnya di aplikasi.
  const { data } = await supabase
    .from("events")
    .select(
      `
      id, name, description, start_at, end_at, location, capacity, status,
      event_participants ( count )
    `,
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null)
    .order("start_at", { ascending: false })
    .limit(50);

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
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Belum ada event"
            description="Event yang dibuat organisasi akan tampil di sini."
            action={
              can(context, PERMISSIONS.events.create) ? (
                <EventFormDialog organizationId={context.organizationId} />
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border">
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
      </Card>
    </div>
  );
}
