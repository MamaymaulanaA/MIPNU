"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  INCOMING_STATUSES,
  OUTGOING_STATUSES,
  type OutgoingStatus,
} from "@/features/letters/schemas/letter.schema";

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

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || !Number.isNaN(Date.parse(value)),
    "Tanggal tidak valid",
  );

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.uuid().safeParse(value).success,
    "Pilihan tidak valid",
  );

const incomingSchema = z
  .object({
    letterNumber: optionalText(120),
    sender: z
      .string()
      .trim()
      .min(2, "Pengirim minimal 2 karakter")
      .max(160, "Pengirim maksimal 160 karakter"),
    subject: z
      .string()
      .trim()
      .min(3, "Perihal minimal 3 karakter")
      .max(300, "Perihal maksimal 300 karakter"),
    letterDate: optionalDate,
    receivedDate: z
      .string()
      .trim()
      .min(1, "Tanggal diterima wajib diisi")
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Tanggal tidak valid",
      ),
    status: z.enum(INCOMING_STATUSES, { error: "Status tidak valid" }),
    documentId: optionalUuid,
    notes: optionalText(2000),
  })
  .refine(
    (value) =>
      value.letterDate === null ||
      Date.parse(value.receivedDate) >= Date.parse(value.letterDate),
    {
      message: "Tanggal diterima tidak boleh mendahului tanggal surat",
      path: ["receivedDate"],
    },
  );

const INCOMING_FIELDS = [
  "letterNumber",
  "sender",
  "subject",
  "letterDate",
  "receivedDate",
  "status",
  "documentId",
  "notes",
] as const;

export async function createIncomingLetter(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.create,
    );

    const parsed = parseForm(incomingSchema, formData, INCOMING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("incoming_letters")
      .insert({
        organization_id: context.organizationId!,
        letter_number: parsed.data.letterNumber,
        sender: parsed.data.sender,
        subject: parsed.data.subject,
        letter_date: parsed.data.letterDate,
        received_date: parsed.data.receivedDate,
        status: parsed.data.status,
        document_id: parsed.data.documentId,
        notes: parsed.data.notes,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.incoming_created",
      resourceType: "incoming_letter",
      resourceId: data.id,
    });

    revalidatePath("/surat");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateIncomingLetter(
  organizationId: string,
  letterId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.edit,
    );

    const parsed = parseForm(incomingSchema, formData, INCOMING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("incoming_letters")
      .update({
        letter_number: parsed.data.letterNumber,
        sender: parsed.data.sender,
        subject: parsed.data.subject,
        letter_date: parsed.data.letterDate,
        received_date: parsed.data.receivedDate,
        status: parsed.data.status,
        document_id: parsed.data.documentId,
        notes: parsed.data.notes,
      })
      .eq("id", letterId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.incoming_updated",
      resourceType: "incoming_letter",
      resourceId: letterId,
    });

    revalidatePath("/surat");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

const outgoingSchema = z.object({
  letterNumber: z
    .string()
    .trim()
    .min(1, "Nomor surat wajib diisi")
    .max(120, "Nomor surat maksimal 120 karakter"),
  recipient: z
    .string()
    .trim()
    .min(2, "Penerima minimal 2 karakter")
    .max(160, "Penerima maksimal 160 karakter"),
  subject: z
    .string()
    .trim()
    .min(3, "Perihal minimal 3 karakter")
    .max(300, "Perihal maksimal 300 karakter"),
  letterDate: z
    .string()
    .trim()
    .min(1, "Tanggal surat wajib diisi")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Tanggal tidak valid"),
  signerMemberId: optionalUuid,
  documentId: optionalUuid,
  notes: optionalText(2000),
});

const OUTGOING_FIELDS = [
  "letterNumber",
  "recipient",
  "subject",
  "letterDate",
  "signerMemberId",
  "documentId",
  "notes",
] as const;

const DUPLICATE_NUMBER = {
  success: false as const,
  error: "Nomor surat ini sudah dipakai pada periode yang sama.",
  kind: "CONFLICT" as const,
};

export async function createOutgoingLetter(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.create,
    );

    const parsed = parseForm(outgoingSchema, formData, OUTGOING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("outgoing_letters")
      .insert({
        organization_id: context.organizationId!,
        letter_number: parsed.data.letterNumber,
        recipient: parsed.data.recipient,
        subject: parsed.data.subject,
        letter_date: parsed.data.letterDate,
        signer_member_id: parsed.data.signerMemberId,
        document_id: parsed.data.documentId,
        notes: parsed.data.notes,
        status: "DRAFT",
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error, { "23505": DUPLICATE_NUMBER });

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.outgoing_created",
      resourceType: "outgoing_letter",
      resourceId: data.id,
    });

    revalidatePath("/surat");
    revalidatePath("/dashboard");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateOutgoingLetter(
  organizationId: string,
  letterId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.edit,
    );

    const parsed = parseForm(outgoingSchema, formData, OUTGOING_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("outgoing_letters")
      .update({
        letter_number: parsed.data.letterNumber,
        recipient: parsed.data.recipient,
        subject: parsed.data.subject,
        letter_date: parsed.data.letterDate,
        signer_member_id: parsed.data.signerMemberId,
        document_id: parsed.data.documentId,
        notes: parsed.data.notes,
      })
      .eq("id", letterId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error, { "23505": DUPLICATE_NUMBER });

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.outgoing_updated",
      resourceType: "outgoing_letter",
      resourceId: letterId,
    });

    revalidatePath("/surat");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menyetujui / mengubah status surat keluar.
 *
 * Permission terpisah dari letters.edit, dan pemisahan itu tidak berhenti di
 * sini: trigger `guard_letter_approval()` menolak perubahan kolom status dari
 * jalur mana pun tanpa letters.approve.
 */
export async function setOutgoingLetterStatus(
  organizationId: string,
  letterId: string,
  status: OutgoingStatus,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.approve,
    );

    if (!OUTGOING_STATUSES.includes(status)) {
      return {
        success: false,
        error: "Status tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const approving = status !== "DRAFT";

    const { error } = await supabase
      .from("outgoing_letters")
      .update({
        status,
        approved_by: approving ? context.profileId : null,
        approved_at: approving ? new Date().toISOString() : null,
      })
      .eq("id", letterId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.outgoing_status_changed",
      resourceType: "outgoing_letter",
      resourceId: letterId,
      metadata: { status },
    });

    revalidatePath("/surat");
    revalidatePath("/dashboard");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLetter(
  organizationId: string,
  letterId: string,
  kind: "incoming" | "outgoing",
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.delete,
    );

    const supabase = await createClient();

    const table = kind === "incoming" ? "incoming_letters" : "outgoing_letters";

    const { error } = await supabase
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", letterId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: `letter.${kind}_deleted`,
      resourceType: table,
      resourceId: letterId,
    });

    revalidatePath("/surat");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
