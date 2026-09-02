"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  MEETING_ATTENDANCE,
  MEETING_STATUSES,
  type MeetingAttendance,
} from "@/features/meetings/schemas/meeting.schema";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable();

const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Waktu tidak valid",
  );

const meetingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Judul rapat minimal 3 karakter")
      .max(160, "Judul rapat maksimal 160 karakter"),
    agenda: optionalText(2000),
    startAt: z
      .string()
      .trim()
      .min(1, "Waktu mulai wajib diisi")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Waktu tidak valid"),
    endAt: optionalDateTime,
    location: optionalText(160),
    status: z.enum(MEETING_STATUSES, { error: "Status tidak valid" }),
  })
  .refine(
    (value) =>
      value.endAt === null ||
      Date.parse(value.endAt) >= Date.parse(value.startAt),
    { message: "Waktu selesai harus setelah waktu mulai", path: ["endAt"] },
  );

const MEETING_FIELDS = [
  "title",
  "agenda",
  "startAt",
  "endAt",
  "location",
  "status",
] as const;

export async function createMeeting(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.create,
    );

    const parsed = parseForm(meetingSchema, formData, MEETING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        organization_id: context.organizationId!,
        title: parsed.data.title,
        agenda: parsed.data.agenda,
        start_at: new Date(parsed.data.startAt).toISOString(),
        end_at: parsed.data.endAt
          ? new Date(parsed.data.endAt).toISOString()
          : null,
        location: parsed.data.location,
        status: parsed.data.status,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "meeting.created",
      resourceType: "meeting",
      resourceId: data.id,
    });

    revalidatePath("/rapat");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateMeeting(
  organizationId: string,
  meetingId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.edit,
    );

    const parsed = parseForm(meetingSchema, formData, MEETING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("meetings")
      .update({
        title: parsed.data.title,
        agenda: parsed.data.agenda,
        start_at: new Date(parsed.data.startAt).toISOString(),
        end_at: parsed.data.endAt
          ? new Date(parsed.data.endAt).toISOString()
          : null,
        location: parsed.data.location,
        status: parsed.data.status,
      })
      .eq("id", meetingId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "meeting.updated",
      resourceType: "meeting",
      resourceId: meetingId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/rapat");
    revalidatePath(`/rapat/${meetingId}`);
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMeeting(
  organizationId: string,
  meetingId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("meetings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", meetingId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "meeting.deleted",
      resourceType: "meeting",
      resourceId: meetingId,
    });

    revalidatePath("/rapat");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function addMeetingParticipant(
  organizationId: string,
  meetingId: string,
  memberId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.manageParticipants,
    );

    if (!z.uuid().safeParse(memberId).success) {
      return {
        success: false,
        error: "Anggota tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("meeting_participants").insert({
      meeting_id: meetingId,
      organization_id: context.organizationId!,
      member_id: memberId,
    });

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Anggota ini sudah terdaftar sebagai peserta rapat.",
          kind: "CONFLICT",
        },
        "23503": {
          success: false,
          error: "Anggota tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    revalidatePath(`/rapat/${meetingId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setMeetingAttendance(
  organizationId: string,
  meetingId: string,
  participantId: string,
  attendance: MeetingAttendance,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.manageParticipants,
    );

    if (!MEETING_ATTENDANCE.includes(attendance)) {
      return {
        success: false,
        error: "Status kehadiran tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("meeting_participants")
      .update({ attendance_status: attendance })
      .eq("id", participantId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    revalidatePath(`/rapat/${meetingId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function removeMeetingParticipant(
  organizationId: string,
  meetingId: string,
  participantId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.manageParticipants,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("meeting_participants")
      .delete()
      .eq("id", participantId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    revalidatePath(`/rapat/${meetingId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

const minutesSchema = z.object({
  content: z
    .string()
    .trim()
    .min(10, "Ringkasan notulen minimal 10 karakter")
    .max(20000, "Ringkasan notulen terlalu panjang"),
  decisions: optionalText(10000),
  followUp: optionalText(10000),
});

export async function saveMeetingMinutes(
  organizationId: string,
  meetingId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.manageMinutes,
    );

    const parsed = parseForm(minutesSchema, formData, [
      "content",
      "decisions",
      "followUp",
    ]);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase.from("meeting_minutes").upsert(
      {
        meeting_id: meetingId,
        organization_id: context.organizationId!,
        content: parsed.data.content,
        decisions: parsed.data.decisions,
        follow_up: parsed.data.followUp,
        created_by: context.profileId,
      },
      { onConflict: "meeting_id" },
    );

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "meeting.minutes_saved",
      resourceType: "meeting",
      resourceId: meetingId,
    });

    revalidatePath(`/rapat/${meetingId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}
