"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  PROGRAM_STATUSES,
  type ProgramStatus,
} from "@/features/programs/schemas/program.schema";

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

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.uuid().safeParse(value).success,
    "Pilihan tidak valid",
  );

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Tanggal tidak valid",
  );

const programSchema = z
  .object({
    organizationPeriodId: z.uuid({ error: "Periode wajib dipilih" }),
    name: z
      .string()
      .trim()
      .min(3, "Nama program minimal 3 karakter")
      .max(160, "Nama program maksimal 160 karakter"),
    description: optionalText(2000),
    responsiblePositionId: optionalUuid,
    responsibleMemberId: optionalUuid,
    startDate: optionalDate,
    endDate: optionalDate,
    target: optionalText(300),
    budgetAmount: z
      .string()
      .trim()
      .transform((value) => (value.length === 0 ? null : Number(value)))
      .nullable()
      .refine(
        (value) => value === null || (Number.isFinite(value) && value >= 0),
        "Anggaran harus angka tidak negatif",
      ),
    status: z.enum(PROGRAM_STATUSES, { error: "Status tidak valid" }),
  })
  .refine(
    (value) =>
      value.endDate === null ||
      value.startDate === null ||
      Date.parse(value.endDate) >= Date.parse(value.startDate),
    {
      message: "Tanggal selesai harus setelah tanggal mulai",
      path: ["endDate"],
    },
  );

const PROGRAM_FIELDS = [
  "organizationPeriodId",
  "name",
  "description",
  "responsiblePositionId",
  "responsibleMemberId",
  "startDate",
  "endDate",
  "target",
  "budgetAmount",
  "status",
] as const;

export async function createWorkProgram(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.programs.create,
    );

    const parsed = parseForm(programSchema, formData, PROGRAM_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("work_programs")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: parsed.data.organizationPeriodId,
        name: parsed.data.name,
        description: parsed.data.description,
        responsible_position_id: parsed.data.responsiblePositionId,
        responsible_member_id: parsed.data.responsibleMemberId,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        target: parsed.data.target,
        budget_amount: parsed.data.budgetAmount,
        status: parsed.data.status,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23503": {
          success: false,
          error:
            "Periode, jabatan, atau anggota tidak valid untuk organisasi ini.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "program.created",
      resourceType: "work_program",
      resourceId: data.id,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/program-kerja");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateWorkProgram(
  organizationId: string,
  programId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.programs.edit,
    );

    const parsed = parseForm(programSchema, formData, PROGRAM_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("work_programs")
      .update({
        organization_period_id: parsed.data.organizationPeriodId,
        name: parsed.data.name,
        description: parsed.data.description,
        responsible_position_id: parsed.data.responsiblePositionId,
        responsible_member_id: parsed.data.responsibleMemberId,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        target: parsed.data.target,
        budget_amount: parsed.data.budgetAmount,
        status: parsed.data.status,
      })
      .eq("id", programId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "program.updated",
      resourceType: "work_program",
      resourceId: programId,
      metadata: { status: parsed.data.status },
    });

    revalidatePath("/program-kerja");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Memperbarui progress.
 *
 * Permission-nya terpisah dari programs.edit karena pekerjaannya juga
 * terpisah: pelaksana melaporkan sejauh mana program berjalan, perencana
 * menentukan programnya apa. Rentang 0-100 ditegakkan constraint database,
 * bukan hanya oleh slider di layar.
 */
export async function updateProgramProgress(
  organizationId: string,
  programId: string,
  progress: number,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.programs.updateProgress,
    );

    const parsed = z.number().int().min(0).max(100).safeParse(progress);
    if (!parsed.success) {
      return {
        success: false,
        error: "Progress harus bilangan bulat 0 sampai 100.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("work_programs")
      .update({ progress: parsed.data })
      .eq("id", programId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "program.progress_updated",
      resourceType: "work_program",
      resourceId: programId,
      metadata: { progress: parsed.data },
    });

    revalidatePath("/program-kerja");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/** Mengubah status tanpa menyentuh isi program. */
export async function updateProgramStatus(
  organizationId: string,
  programId: string,
  status: ProgramStatus,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.programs.manage,
    );

    if (!PROGRAM_STATUSES.includes(status)) {
      return {
        success: false,
        error: "Status tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("work_programs")
      .update({ status })
      .eq("id", programId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "program.status_changed",
      resourceType: "work_program",
      resourceId: programId,
      metadata: { status },
    });

    revalidatePath("/program-kerja");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteWorkProgram(
  organizationId: string,
  programId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.programs.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("work_programs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", programId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "program.deleted",
      resourceType: "work_program",
      resourceId: programId,
    });

    revalidatePath("/program-kerja");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
