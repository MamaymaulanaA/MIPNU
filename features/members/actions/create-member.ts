"use server";

import { revalidatePath } from "next/cache";

import { createMemberSchema } from "@/features/members/schemas/member.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Menambah anggota.
 *
 * Mengikuti pola mutasi wajib (SYSTEM.md §13):
 *   Authenticate -> Authorize -> Validate -> Execute -> Audit -> Safe result
 *
 * Organisasi TIDAK dibaca dari form. Ia berasal dari access context yang
 * sudah diresolusi server, sehingga anggota tidak mungkin ditulis ke tenant
 * lain walau payload dimodifikasi.
 */
export async function createMember(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.create,
    );

    const parsed = createMemberSchema.safeParse({
      fullName: formData.get("fullName") ?? "",
      memberNumber: formData.get("memberNumber") ?? "",
      gender: formData.get("gender") ?? "",
      birthPlace: formData.get("birthPlace") ?? "",
      birthDate: formData.get("birthDate") ?? "",
      email: formData.get("email") ?? "",
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      joinDate: formData.get("joinDate") ?? "",
      status: formData.get("status") ?? "ACTIVE",
      notes: formData.get("notes") ?? "",
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        (fieldErrors[key] ??= []).push(issue.message);
      }

      return {
        success: false,
        error: "Periksa kembali isian Anda.",
        kind: "VALIDATION",
        fieldErrors,
      };
    }

    const input = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("members")
      .insert({
        organization_id: context.organizationId!,
        full_name: input.fullName,
        member_number: input.memberNumber,
        gender: input.gender,
        birth_place: input.birthPlace,
        birth_date: input.birthDate,
        email: input.email,
        phone: input.phone,
        address: input.address,
        join_date: input.joinDate,
        status: input.status,
        notes: input.notes,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation. Satu-satunya unique yang dapat dilanggar
      // dari form ini adalah nomor anggota per organisasi.
      if (error.code === "23505") {
        return {
          success: false,
          error: "Nomor anggota sudah digunakan di organisasi ini.",
          kind: "CONFLICT",
          fieldErrors: { memberNumber: ["Nomor anggota sudah digunakan"] },
        };
      }

      console.error("[mipnu] gagal membuat anggota", error.message);
      throw new AppError("DATABASE", "Gagal menyimpan data anggota.");
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.created",
      resourceType: "member",
      resourceId: data.id,
      // Metadata sengaja minimal: cukup untuk menelusuri, tanpa menyalin
      // data pribadi ke tabel audit (docs/DATABASE.md §130).
      metadata: { member_number: input.memberNumber },
    });

    revalidatePath("/anggota");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}
