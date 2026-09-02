"use server";

import { revalidatePath } from "next/cache";

import {
  requireAccessContext,
  requireOrganizationPermission,
} from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  AppError,
  ForbiddenError,
  fail,
  ok,
  type ActionResult,
} from "@/lib/errors";
import { databaseFailure } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const CAPACITY_FULL: ActionResult<never> = {
  success: false,
  error: "Kuota peserta event sudah penuh.",
  kind: "CONFLICT",
};

/**
 * Mendaftarkan diri sendiri ke sebuah event.
 *
 * `member_id` TIDAK diterima dari client. Ia diresolusi dari access context,
 * sehingga tidak ada cara mendaftarkan orang lain lewat jalur ini
 * (docs/RLS.md §63).
 */
export async function registerSelfForEvent(
  organizationId: string,
  eventId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireAccessContext(organizationId);

    if (context.organizationId !== organizationId) {
      throw new ForbiddenError("cross_tenant");
    }
    if (!context.permissions.has(PERMISSIONS.events.register)) {
      throw new ForbiddenError("missing_permission:events.register");
    }
    if (!context.memberId) {
      throw new AppError(
        "VALIDATION",
        "Akun Anda belum ditautkan ke data anggota, sehingga belum dapat mendaftar event.",
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      organization_id: organizationId,
      member_id: context.memberId,
      registration_status: "REGISTERED",
    });

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Anda sudah terdaftar pada event ini.",
          kind: "CONFLICT",
        },
        "23514": CAPACITY_FULL,
        "42501": {
          success: false,
          error: "Pendaftaran event ini sedang tidak dibuka.",
          kind: "FORBIDDEN",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.self_registered",
      resourceType: "event",
      resourceId: eventId,
    });

    revalidatePath(`/kegiatan/${eventId}`);
    revalidatePath("/kegiatan");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function cancelOwnRegistration(
  organizationId: string,
  eventId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireAccessContext(organizationId);

    if (context.organizationId !== organizationId) {
      throw new ForbiddenError("cross_tenant");
    }
    if (!context.permissions.has(PERMISSIONS.events.cancelRegistration)) {
      throw new ForbiddenError("missing_permission:events.cancel_registration");
    }
    if (!context.memberId) {
      throw new ForbiddenError("no_member_record");
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("event_participants")
      .update({
        registration_status: "CANCELLED",
        cancelled_at: new Date().toISOString(),
      })
      .eq("event_id", eventId)
      .eq("member_id", context.memberId);

    if (error) return databaseFailure(error);

    revalidatePath(`/kegiatan/${eventId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function addParticipant(
  organizationId: string,
  eventId: string,
  memberId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.manageParticipants,
    );

    const supabase = await createClient();

    const { error } = await supabase.from("event_participants").insert({
      event_id: eventId,
      organization_id: organizationId,
      member_id: memberId,
      registration_status: "CONFIRMED",
    });

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Anggota tersebut sudah terdaftar pada event ini.",
          kind: "CONFLICT",
        },
        "23514": CAPACITY_FULL,
        "23503": {
          success: false,
          error: "Anggota tidak valid untuk event ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.participant_added",
      resourceType: "event",
      resourceId: eventId,
      metadata: { member_id: memberId },
    });

    revalidatePath(`/kegiatan/${eventId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setParticipantStatus(
  organizationId: string,
  eventId: string,
  participantId: string,
  status: "REGISTERED" | "CONFIRMED" | "CANCELLED" | "WAITLISTED",
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.events.manageParticipants,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("event_participants")
      .update({
        registration_status: status,
        cancelled_at: status === "CANCELLED" ? new Date().toISOString() : null,
      })
      .eq("id", participantId)
      .eq("event_id", eventId)
      .eq("organization_id", organizationId);

    if (error) {
      return databaseFailure(error, { "23514": CAPACITY_FULL });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "event.participant_status_changed",
      resourceType: "event",
      resourceId: eventId,
      metadata: { participant_id: participantId, status },
    });

    revalidatePath(`/kegiatan/${eventId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}
