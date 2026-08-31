"use server";

import { revalidatePath } from "next/cache";

import {
  PERIOD_FIELDS,
  periodSchema,
} from "@/features/periods/schemas/period.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export async function createPeriod(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.periods.create,
    );

    const parsed = parseForm(periodSchema, formData, PERIOD_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    // Periode baru selalu lahir sebagai DRAFT. Mengaktifkannya adalah
    // tindakan terpisah dengan permission tersendiri, karena ia menutup
    // periode berjalan.
    const { data, error } = await supabase
      .from("organization_periods")
      .insert({
        organization_id: context.organizationId!,
        name: parsed.data.name,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: "DRAFT",
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Sudah ada periode dengan nama tersebut.",
          kind: "CONFLICT",
          fieldErrors: { name: ["Nama periode sudah dipakai"] },
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "period.created",
      resourceType: "organization_period",
      resourceId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/organisasi/periode");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updatePeriod(
  organizationId: string,
  periodId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.periods.edit,
    );

    const parsed = parseForm(periodSchema, formData, PERIOD_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("organization_periods")
      .update({
        name: parsed.data.name,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
      })
      .eq("id", periodId)
      // Penyaring tenant eksplisit di samping RLS. RLS sudah cukup, tetapi
      // menuliskannya membuat maksud query jelas saat dibaca ulang.
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "period.updated",
      resourceType: "organization_period",
      resourceId: periodId,
    });

    revalidatePath("/organisasi/periode");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengaktifkan periode.
 *
 * Menutup periode berjalan dan mengaktifkan yang dipilih harus terjadi
 * bersamaan, jadi keduanya dikerjakan oleh `mipnu_activate_period()` di
 * database, bukan dua UPDATE berurutan dari sini.
 */
export async function activatePeriod(
  organizationId: string,
  periodId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.periods.activate,
    );

    const supabase = await createClient();

    const { error } = await supabase.rpc("mipnu_activate_period", {
      p_period_id: periodId,
    });

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "period.activated",
      resourceType: "organization_period",
      resourceId: periodId,
    });

    revalidatePath("/organisasi/periode");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menutup periode.
 *
 * Tindakan sensitif: struktur kepengurusan periode tersebut berhenti berlaku,
 * dan permission jabatan yang bersandar padanya ikut berhenti
 * (docs/PERMISSIONS.md §15).
 */
export async function closePeriod(
  organizationId: string,
  periodId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.periods.close,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("organization_periods")
      .update({ status: "CLOSED", closed_at: new Date().toISOString() })
      .eq("id", periodId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "ACTIVE");

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "period.closed",
      resourceType: "organization_period",
      resourceId: periodId,
    });

    revalidatePath("/organisasi/periode");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengarsipkan periode.
 *
 * Hanya periode yang sudah DITUTUP yang dapat diarsipkan: mengarsipkan
 * periode aktif akan menghilangkan struktur kepengurusan yang sedang berjalan
 * dari layar tanpa pernah menutupnya lebih dulu.
 *
 * Arsip TIDAK menghapus apa pun. Penugasan kepengurusan periode tersebut
 * tetap ada dan tetap terbaca sebagai riwayat (PRD §21); yang berubah hanya
 * bahwa periode itu tidak lagi ikut ditawarkan pada pekerjaan sehari-hari.
 */
export async function archivePeriod(
  organizationId: string,
  periodId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.periods.archive,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("organization_periods")
      .update({ status: "ARCHIVED" })
      .eq("id", periodId)
      .eq("organization_id", context.organizationId!)
      // Syarat status ditulis pada query, bukan diperiksa lebih dulu lalu
      // ditulis: dua langkah terpisah menyisakan celah di antaranya.
      .eq("status", "CLOSED");

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "period.archived",
      resourceType: "organization_period",
      resourceId: periodId,
    });

    revalidatePath("/organisasi/periode");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
