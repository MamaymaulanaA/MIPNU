import "server-only";

import { createClient } from "@/lib/supabase/server";

export type EventDetail = {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  capacity: number | null;
  registrationStartAt: string | null;
  registrationEndAt: string | null;
  status: string;
  visibility: string;
  registrationOpen: boolean;
};

export async function getEvent(eventId: string): Promise<EventDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, name, description, start_at, end_at, location, capacity,
      registration_start_at, registration_end_at, status, visibility
    `,
    )
    .eq("id", eventId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[mipnu] gagal memuat event", error.message);
    return null;
  }
  if (!data) return null;

  const now = Date.now();

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    startAt: data.start_at,
    endAt: data.end_at,
    location: data.location,
    capacity: data.capacity,
    registrationStartAt: data.registration_start_at,
    registrationEndAt: data.registration_end_at,
    status: data.status,
    visibility: data.visibility,
    registrationOpen:
      data.status === "REGISTRATION_OPEN" &&
      (!data.registration_start_at ||
        Date.parse(data.registration_start_at) <= now) &&
      (!data.registration_end_at ||
        Date.parse(data.registration_end_at) >= now),
  };
}
