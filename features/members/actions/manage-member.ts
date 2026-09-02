"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  MEMBER_STATUSES,
  createMemberSchema,
} from "@/features/members/schemas/member.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const MEMBER_FIELDS = [
  "fullName",
  "memberNumber",
  "gender",
  "birthPlace",
  "birthDate",
  "email",
  "phone",
  "address",
  "joinDate",
  "status",
  "notes",
] as const;

export async function updateMember(
  organizationId: string,
  memberId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.edit,
    );

    const parsed = parseForm(createMemberSchema, formData, MEMBER_FIELDS);
    if (!parsed.ok) return parsed.result;

    const input = parsed.data;
    const supabase = await createClient();

    const canEditPrivate = context.permissions.has(
      PERMISSIONS.members.viewPrivate,
    );

    const { error } = await supabase
      .from("members")
      .update({
        full_name: input.fullName,
        member_number: input.memberNumber,
        gender: input.gender,
        birth_place: input.birthPlace,
        birth_date: input.birthDate,
        join_date: input.joinDate,
        status: input.status,
        notes: input.notes,
        ...(canEditPrivate
          ? {
              email: input.email,
              phone: input.phone,
              address: input.address,
            }
          : {}),
      })
      .eq("id", memberId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Nomor anggota sudah digunakan di organisasi ini.",
          kind: "CONFLICT",
          fieldErrors: { memberNumber: ["Nomor anggota sudah digunakan"] },
        },
        "42501": {
          success: false,
          error:
            "Mengubah status keanggotaan membutuhkan permission tersendiri. Ubah data lain terlebih dahulu.",
          kind: "FORBIDDEN",
          fieldErrors: { status: ["Tidak berhak mengubah status"] },
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.updated",
      resourceType: "member",
      resourceId: memberId,
    });

    revalidatePath("/anggota");
    revalidatePath(`/anggota/${memberId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

const statusChangeSchema = z.object({
  status: z.enum(MEMBER_STATUSES, { error: "Status tidak valid" }),
  reason: z
    .string()
    .trim()
    .max(500, "Alasan maksimal 500 karakter")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
});

export async function changeMemberStatus(
  organizationId: string,
  memberId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.manageStatus,
    );

    const parsed = parseForm(statusChangeSchema, formData, [
      "status",
      "reason",
    ]);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data: current, error: readError } = await supabase
      .from("members")
      .select("status, full_name")
      .eq("id", memberId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (readError) return databaseFailure(readError);
    if (!current) {
      return {
        success: false,
        error: "Anggota tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    if (current.status === parsed.data.status) {
      return {
        success: false,
        error: "Status anggota sudah sama dengan pilihan Anda.",
        kind: "VALIDATION",
        fieldErrors: { status: ["Status tidak berubah"] },
      };
    }

    const { error } = await supabase
      .from("members")
      .update({ status: parsed.data.status })
      .eq("id", memberId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    if (parsed.data.reason) {
      const { data: latest } = await supabase
        .from("member_status_history")
        .select("id")
        .eq("member_id", memberId)
        .order("changed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        await supabase
          .from("member_status_history")
          .update({ reason: parsed.data.reason })
          .eq("id", latest.id);
      }
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.status_changed",
      resourceType: "member",
      resourceId: memberId,
      metadata: { from: current.status, to: parsed.data.status },
    });

    revalidatePath("/anggota");
    revalidatePath(`/anggota/${memberId}`);
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMember(
  organizationId: string,
  memberId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("members")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", memberId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.deleted",
      resourceType: "member",
      resourceId: memberId,
    });

    revalidatePath("/anggota");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
