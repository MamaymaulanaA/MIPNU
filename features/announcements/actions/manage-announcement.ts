"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUSES,
  type AnnouncementStatus,
} from "@/features/announcements/schemas/announcement.schema";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
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

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  content: z
    .string()
    .trim()
    .min(10, "Isi pengumuman minimal 10 karakter")
    .max(20000, "Isi pengumuman terlalu panjang"),
  audienceType: z.enum(ANNOUNCEMENT_AUDIENCES, {
    error: "Sasaran tidak valid",
  }),
  expiresAt: optionalDateTime,
});

const ANNOUNCEMENT_FIELDS = [
  "title",
  "content",
  "audienceType",
  "expiresAt",
] as const;

/**
 * Membuat pengumuman.
 *
 * Selalu lahir sebagai DRAF. Menerbitkan adalah tindakan terpisah dengan
 * permission terpisah — dan penegakannya tidak berhenti di sini: trigger
 * `guard_announcement_columns()` menolak perubahan status dari jalur mana pun
 * tanpa announcements.publish.
 */
export async function createAnnouncement(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.announcements.create,
    );

    const parsed = parseForm(announcementSchema, formData, ANNOUNCEMENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const audience = context.permissions.has(
      PERMISSIONS.announcements.manageAudience,
    )
      ? parsed.data.audienceType
      : "ALL_MEMBERS";

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("announcements")
      .insert({
        organization_id: context.organizationId!,
        title: parsed.data.title,
        content: parsed.data.content,
        audience_type: audience,
        expires_at: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt).toISOString()
          : null,
        status: "DRAFT",
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "announcement.created",
      resourceType: "announcement",
      resourceId: data.id,
      metadata: { audience },
    });

    revalidatePath("/pengumuman");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateAnnouncement(
  organizationId: string,
  announcementId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.announcements.edit,
    );

    const parsed = parseForm(announcementSchema, formData, ANNOUNCEMENT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const canSetAudience = context.permissions.has(
      PERMISSIONS.announcements.manageAudience,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("announcements")
      .update({
        title: parsed.data.title,
        content: parsed.data.content,
        expires_at: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt).toISOString()
          : null,
        ...(canSetAudience ? { audience_type: parsed.data.audienceType } : {}),
      })
      .eq("id", announcementId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "announcement.updated",
      resourceType: "announcement",
      resourceId: announcementId,
    });

    revalidatePath("/pengumuman");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setAnnouncementStatus(
  organizationId: string,
  announcementId: string,
  status: AnnouncementStatus,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.announcements.publish,
    );

    if (!ANNOUNCEMENT_STATUSES.includes(status)) {
      return {
        success: false,
        error: "Status tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("announcements")
      .update({
        status,
        published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
      })
      .eq("id", announcementId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action:
        status === "PUBLISHED"
          ? "announcement.published"
          : "announcement.status_changed",
      resourceType: "announcement",
      resourceId: announcementId,
      metadata: { status },
    });

    revalidatePath("/pengumuman");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAnnouncement(
  organizationId: string,
  announcementId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.announcements.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("announcements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", announcementId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "announcement.deleted",
      resourceType: "announcement",
      resourceId: announcementId,
    });

    revalidatePath("/pengumuman");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
