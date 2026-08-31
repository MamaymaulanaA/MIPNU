"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AttendanceStatus } from "@/features/attendance/schemas/attendance.schema";
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
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const optionalDateTime = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Waktu tidak valid",
  );

/**
 * Sesi presensi.
 *
 * Sesi selalu lahir sebagai MANUAL. Metode berubah menjadi QR hanya ketika
 * token diterbitkan lewat `mipnu_issue_attendance_qr()`, karena CHECK
 * constraint menuntut sesi QR selalu memiliki token — menyetel method='QR'
 * dari form ini akan membuat sesi yang tidak dapat disimpan.
 */
const sessionSchema = z
  .object({
    eventId: z.uuid({ error: "Event wajib dipilih" }),
    name: z
      .string()
      .trim()
      .min(3, "Nama sesi minimal 3 karakter")
      .max(120, "Nama sesi maksimal 120 karakter"),
    openAt: optionalDateTime,
    closeAt: optionalDateTime,
    status: z.enum(["DRAFT", "OPEN", "CLOSED"], {
      error: "Status tidak valid",
    }),
  })
  .refine(
    (value) =>
      value.closeAt === null ||
      value.openAt === null ||
      Date.parse(value.closeAt) >= Date.parse(value.openAt),
    { message: "Waktu tutup harus setelah waktu buka", path: ["closeAt"] },
  );

const SESSION_FIELDS = [
  "eventId",
  "name",
  "openAt",
  "closeAt",
  "status",
] as const;

export async function createAttendanceSession(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.createSession,
    );

    const parsed = parseForm(sessionSchema, formData, SESSION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({
        organization_id: context.organizationId!,
        event_id: parsed.data.eventId,
        name: parsed.data.name,
        open_at: parsed.data.openAt
          ? new Date(parsed.data.openAt).toISOString()
          : null,
        close_at: parsed.data.closeAt
          ? new Date(parsed.data.closeAt).toISOString()
          : null,
        method: "MANUAL",
        status: parsed.data.status,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23503": {
          success: false,
          error: "Event tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "attendance.session_created",
      resourceType: "attendance_session",
      resourceId: data.id,
    });

    revalidatePath("/presensi");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateAttendanceSession(
  organizationId: string,
  sessionId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.editSession,
    );

    const parsed = parseForm(sessionSchema, formData, SESSION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("attendance_sessions")
      .update({
        name: parsed.data.name,
        open_at: parsed.data.openAt
          ? new Date(parsed.data.openAt).toISOString()
          : null,
        close_at: parsed.data.closeAt
          ? new Date(parsed.data.closeAt).toISOString()
          : null,
        status: parsed.data.status,
      })
      .eq("id", sessionId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "attendance.session_updated",
      resourceType: "attendance_session",
      resourceId: sessionId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/presensi");
    revalidatePath(`/presensi/${sessionId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mencatat kehadiran seorang anggota.
 *
 * Presensi ganda dicegah unique constraint
 * `(attendance_session_id, member_id)`, bukan oleh tombol yang di-disable —
 * karena itu operasi ini memakai upsert dan aman diulang.
 */
export async function recordAttendance(
  organizationId: string,
  sessionId: string,
  memberId: string,
  status: AttendanceStatus,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.manage,
    );

    const supabase = await createClient();

    const { error } = await supabase.from("attendance_records").upsert(
      {
        attendance_session_id: sessionId,
        organization_id: organizationId,
        member_id: memberId,
        status,
        // CHECK menuntut PRESENT selalu punya waktu check-in.
        check_in_at: status === "PRESENT" ? new Date().toISOString() : null,
        recorded_by: context.profileId,
      },
      { onConflict: "attendance_session_id,member_id" },
    );

    if (error) return databaseFailure(error);

    revalidatePath(`/presensi/${sessionId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Check-in mandiri.
 *
 * `member_id` diresolusi dari access context, tidak pernah dari client.
 * Sesi yang belum dibuka ditolak policy RLS lewat
 * `app_private.attendance_session_open()`.
 */
export async function checkInSelf(
  organizationId: string,
  sessionId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireAccessContext(organizationId);

    if (context.organizationId !== organizationId) {
      throw new ForbiddenError("cross_tenant");
    }
    if (!context.permissions.has(PERMISSIONS.attendance.checkIn)) {
      throw new ForbiddenError("missing_permission:attendance.check_in");
    }
    if (!context.memberId) {
      throw new AppError(
        "VALIDATION",
        "Akun Anda belum ditautkan ke data anggota, sehingga belum dapat melakukan presensi.",
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("attendance_records").insert({
      attendance_session_id: sessionId,
      organization_id: organizationId,
      member_id: context.memberId,
      status: "PRESENT",
      check_in_at: new Date().toISOString(),
    });

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Anda sudah tercatat hadir pada sesi ini.",
          kind: "CONFLICT",
        },
        "42501": {
          success: false,
          error: "Sesi presensi ini sedang tidak dibuka.",
          kind: "FORBIDDEN",
        },
      });
    }

    revalidatePath(`/presensi/${sessionId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}
