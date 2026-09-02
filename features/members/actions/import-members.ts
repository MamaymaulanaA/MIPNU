"use server";

import { revalidatePath } from "next/cache";

import { createMemberSchema } from "@/features/members/schemas/member.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import type { TablesInsert } from "@/types/database.types";
import { parseCsvWithHeader } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * Kolom yang dikenali.
 *
 * `organization_id` SENGAJA tidak ada. Tenant tidak pernah datang dari
 * berkas — kolom seperti itu di spreadsheet diabaikan sepenuhnya, bukan
 * dipakai (docs/AUTHORIZATION.md §17).
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  fullName: ["nama_lengkap", "nama", "full_name", "fullname"],
  memberNumber: ["nomor_anggota", "no_anggota", "member_number", "nia"],
  gender: ["jenis_kelamin", "gender", "l_p"],
  birthPlace: ["tempat_lahir", "birth_place"],
  birthDate: ["tanggal_lahir", "birth_date", "tgl_lahir"],
  email: ["email", "surel"],
  phone: ["telepon", "no_telepon", "phone", "hp", "no_hp"],
  address: ["alamat", "address"],
  joinDate: ["tanggal_bergabung", "join_date", "tgl_bergabung"],
  status: ["status"],
  notes: ["catatan", "notes"],
};

export type ImportIssue = {
  row: number;
  field: string;
  message: string;
};

export type ImportPreviewRow = {
  row: number;
  fullName: string;
  memberNumber: string | null;
  status: string;
  valid: boolean;
  duplicate: "NONE" | "IN_FILE" | "IN_DATABASE";
};

export type ImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  unrecognizedColumns: string[];
  issues: ImportIssue[];
  rows: ImportPreviewRow[];
};

type NormalizedRow = {
  row: number;
  values: Record<string, string>;
};

function normalizeRows(csvText: string) {
  const { headers, rows } = parseCsvWithHeader(csvText);

  const headerMap = new Map<string, string>();
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) headerMap.set(alias, field);
  }

  const unrecognizedColumns = headers.filter(
    (header) => header !== "" && !headerMap.has(header),
  );

  const normalized: NormalizedRow[] = rows.map((record, index) => {
    const values: Record<string, string> = {};

    for (const [header, value] of Object.entries(record)) {
      const field = headerMap.get(header);
      if (field) values[field] = value;
    }

    return { row: index + 2, values }; // +2: baris 1 header, index 0-based
  });

  return { normalized, unrecognizedColumns };
}

function coerce(values: Record<string, string>) {
  const gender = (values.gender ?? "").trim().toUpperCase();
  const normalizedGender =
    gender === "L" || gender.startsWith("LAKI")
      ? "L"
      : gender === "P" || gender.startsWith("PEREMPUAN")
        ? "P"
        : "";

  const status = (values.status ?? "").trim().toUpperCase();

  return {
    fullName: values.fullName ?? "",
    memberNumber: values.memberNumber ?? "",
    gender: normalizedGender,
    birthPlace: values.birthPlace ?? "",
    birthDate: values.birthDate ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    address: values.address ?? "",
    joinDate: values.joinDate ?? "",
    status: status === "" ? "ACTIVE" : status,
    notes: values.notes ?? "",
  };
}

export async function previewMemberImport(
  organizationId: string,
  _previousState: ActionResult<ImportPreview> | null,
  formData: FormData,
): Promise<ActionResult<ImportPreview>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.import,
    );

    const csvText = String(formData.get("csv") ?? "");
    if (csvText.trim() === "") {
      return {
        success: false,
        error: "Berkas kosong atau gagal dibaca.",
        kind: "VALIDATION",
      };
    }
    if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
      return {
        success: false,
        error: "Berkas terlalu besar. Maksimal 2 MB.",
        kind: "VALIDATION",
      };
    }

    const { normalized, unrecognizedColumns } = normalizeRows(csvText);

    if (normalized.length === 0) {
      return {
        success: false,
        error: "Tidak ada baris data yang dapat dibaca dari berkas.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("members")
      .select("member_number")
      .eq("organization_id", context.organizationId!)
      .not("member_number", "is", null)
      .is("deleted_at", null);

    const existingNumbers = new Set(
      (existing ?? []).map((member) => member.member_number?.toLowerCase()),
    );

    const seenInFile = new Set<string>();
    const issues: ImportIssue[] = [];
    const rows: ImportPreviewRow[] = [];

    for (const entry of normalized) {
      const candidate = coerce(entry.values);
      const parsed = createMemberSchema.safeParse(candidate);

      let duplicate: ImportPreviewRow["duplicate"] = "NONE";
      const numberKey = candidate.memberNumber.trim().toLowerCase();

      if (numberKey !== "") {
        if (seenInFile.has(numberKey)) {
          duplicate = "IN_FILE";
          issues.push({
            row: entry.row,
            field: "memberNumber",
            message: "Nomor anggota muncul lebih dari sekali dalam berkas",
          });
        } else if (existingNumbers.has(numberKey)) {
          duplicate = "IN_DATABASE";
          issues.push({
            row: entry.row,
            field: "memberNumber",
            message: "Nomor anggota sudah ada di organisasi ini",
          });
        }
        seenInFile.add(numberKey);
      }

      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          issues.push({
            row: entry.row,
            field: String(issue.path[0] ?? "baris"),
            message: issue.message,
          });
        }
      }

      rows.push({
        row: entry.row,
        fullName: candidate.fullName || "(kosong)",
        memberNumber: candidate.memberNumber || null,
        status: candidate.status,
        valid: parsed.success && duplicate === "NONE",
        duplicate,
      });
    }

    const validRows = rows.filter((row) => row.valid).length;

    return ok({
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      duplicateRows: rows.filter((row) => row.duplicate !== "NONE").length,
      unrecognizedColumns,
      issues: issues.slice(0, 200),
      rows: rows.slice(0, 200),
    });
  } catch (error) {
    return fail(error);
  }
}

export type ImportSummary = {
  inserted: number;
  skipped: number;
};

export async function confirmMemberImport(
  organizationId: string,
  _previousState: ActionResult<ImportSummary> | null,
  formData: FormData,
): Promise<ActionResult<ImportSummary>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.import,
    );

    const csvText = String(formData.get("csv") ?? "");
    if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
      return {
        success: false,
        error: "Berkas terlalu besar. Maksimal 2 MB.",
        kind: "VALIDATION",
      };
    }

    const { normalized } = normalizeRows(csvText);
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("members")
      .select("member_number")
      .eq("organization_id", context.organizationId!)
      .not("member_number", "is", null)
      .is("deleted_at", null);

    const existingNumbers = new Set(
      (existing ?? []).map((member) => member.member_number?.toLowerCase()),
    );

    const seenInFile = new Set<string>();
    const payload: TablesInsert<"members">[] = [];
    let skipped = 0;

    for (const entry of normalized) {
      const candidate = coerce(entry.values);
      const parsed = createMemberSchema.safeParse(candidate);

      const numberKey = candidate.memberNumber.trim().toLowerCase();
      const isDuplicate =
        numberKey !== "" &&
        (seenInFile.has(numberKey) || existingNumbers.has(numberKey));

      if (numberKey !== "") seenInFile.add(numberKey);

      if (!parsed.success || isDuplicate) {
        skipped += 1;
        continue;
      }

      payload.push({
        organization_id: context.organizationId!,
        full_name: parsed.data.fullName,
        member_number: parsed.data.memberNumber,
        gender: parsed.data.gender,
        birth_place: parsed.data.birthPlace,
        birth_date: parsed.data.birthDate,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        join_date: parsed.data.joinDate,
        status: parsed.data.status,
        notes: parsed.data.notes,
        created_by: context.profileId,
      });
    }

    if (payload.length === 0) {
      return {
        success: false,
        error: "Tidak ada baris yang memenuhi syarat untuk diimpor.",
        kind: "VALIDATION",
      };
    }

    let inserted = 0;
    const CHUNK = 200;

    for (let index = 0; index < payload.length; index += CHUNK) {
      const chunk = payload.slice(index, index + CHUNK);
      const { error } = await supabase.from("members").insert(chunk);

      if (error) {
        console.error("[mipnu] gagal mengimpor anggota", error.message);
        return {
          success: false,
          error: `Impor berhenti setelah ${inserted} baris tersimpan. Periksa berkas lalu ulangi untuk sisanya.`,
          kind: "DATABASE",
        };
      }

      inserted += chunk.length;
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.imported",
      resourceType: "member",
      metadata: { inserted, skipped },
    });

    revalidatePath("/anggota");
    revalidatePath("/dashboard");

    return ok({ inserted, skipped });
  } catch (error) {
    return fail(error);
  }
}
