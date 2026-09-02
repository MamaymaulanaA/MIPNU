"use server";

import { revalidatePath } from "next/cache";

import {
  EVENT_FIELDS,
  eventSchema,
} from "@/features/events/schemas/event.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

function toIso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export async function createEvent(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.create,
    );

    const parsed = parseForm(eventSchema, formData, EVENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    const { data: activePeriod } = await supabase
      .from("organization_periods")
      .select("id")
      .eq("organization_id", context.organizationId!)
      .eq("status", "ACTIVE")
      .maybeSingle();

    const { data, error } = await supabase
      .from("events")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: activePeriod?.id ?? null,
        name: input.name,
        description: input.description,
        start_at: new Date(input.startAt).toISOString(),
        end_at: toIso(input.endAt),
        location: input.location,
        capacity: input.capacity,
        registration_start_at: toIso(input.registrationStartAt),
        registration_end_at: toIso(input.registrationEndAt),
        status: input.status,
        visibility: input.visibility,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "event.created",
      resourceType: "event",
      resourceId: data.id,
      metadata: { name: input.name },
    });

    revalidatePath("/kegiatan");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateEvent(
  organizationId: string,
  eventId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.edit,
    );

    const parsed = parseForm(eventSchema, formData, EVENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    if (input.capacity !== null) {
      const { count } = await supabase
        .from("event_participants")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .in("registration_status", ["REGISTERED", "CONFIRMED"]);

      if ((count ?? 0) > input.capacity) {
        return {
          success: false,
          error: "Periksa kembali isian Anda.",
          kind: "VALIDATION",
          fieldErrors: {
            capacity: [
              `Sudah ada ${count} peserta terdaftar. Kapasitas tidak dapat lebih kecil dari itu.`,
            ],
          },
        };
      }
    }

    const { error } = await supabase
      .from("events")
      .update({
        name: input.name,
        description: input.description,
        start_at: new Date(input.startAt).toISOString(),
        end_at: toIso(input.endAt),
        location: input.location,
        capacity: input.capacity,
        registration_start_at: toIso(input.registrationStartAt),
        registration_end_at: toIso(input.registrationEndAt),
        status: input.status,
        visibility: input.visibility,
      })
      .eq("id", eventId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "event.updated",
      resourceType: "event",
      resourceId: eventId,
      metadata: { status: input.status },
    });

    revalidatePath("/kegiatan");
    revalidatePath(`/kegiatan/${eventId}`);
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteEvent(
  organizationId: string,
  eventId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "event.deleted",
      resourceType: "event",
      resourceId: eventId,
    });

    revalidatePath("/kegiatan");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
