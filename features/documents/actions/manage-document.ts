"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VISIBILITIES,
  type DocumentVisibility,
} from "@/features/documents/schemas/document.schema";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const ALLOWED_MIME = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["application/msword", "doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "docx",
  ],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
]);

const MAX_BYTES = 20 * 1024 * 1024;

const metadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
  category: z.enum(DOCUMENT_CATEGORIES, { error: "Kategori tidak valid" }),
  visibility: z.enum(DOCUMENT_VISIBILITIES, {
    error: "Visibilitas tidak valid",
  }),
});

/**
 * Nama berkas yang aman dipakai sebagai bagian path storage.
 *
 * Nama asli tetap disimpan di kolom `original_filename` supaya pengguna
 * mengunduh dengan nama yang ia kenali; yang dibersihkan hanya yang menjadi
 * PATH. Titik dua, garis miring, dan `..` dibuang di sini, dan segmen tenant
 * tetap dijaga policy storage — dua lapis, karena satu lapis untuk path
 * traversal tidak pernah cukup.
 */
function safeFilename(name: string, fallbackExtension: string) {
  const base = name
    .replace(/\\/g, "/")
    .split("/")
    .pop()!
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/^[.\-]+/, "")
    .slice(0, 120);

  if (!base || !base.includes(".")) {
    return `${base || "berkas"}.${fallbackExtension}`;
  }

  return base;
}

export async function uploadDocument(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.documents.create,
    );

    const parsed = metadataSchema.safeParse({
      title: formData.get("title") ?? "",
      category: formData.get("category") ?? "OTHER",
      visibility: formData.get("visibility") ?? "ORGANIZATION",
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Periksa kembali isian dokumen.",
        kind: "VALIDATION",
        fieldErrors: Object.fromEntries(
          Object.entries(parsed.error.flatten().fieldErrors).map(
            ([key, value]) => [key, value ?? []],
          ),
        ),
      };
    }

    const visibility = context.permissions.has(
      PERMISSIONS.documents.manageVisibility,
    )
      ? parsed.data.visibility
      : "ORGANIZATION";

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new AppError("VALIDATION", "Pilih berkas yang akan diunggah.");
    }

    const extension = ALLOWED_MIME.get(file.type);
    if (!extension) {
      throw new AppError(
        "VALIDATION",
        "Format berkas tidak didukung. Gunakan PDF, gambar, Word, atau Excel.",
      );
    }

    if (file.size > MAX_BYTES) {
      throw new AppError("VALIDATION", "Ukuran berkas maksimal 20 MB.");
    }

    const supabase = await createClient();

    const documentId = crypto.randomUUID();
    const filename = safeFilename(file.name, extension);
    const path = `${organizationId}/${documentId}/${filename}`;

    const uploaded = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploaded.error) {
      console.error("[mipnu] gagal mengunggah dokumen", uploaded.error.message);
      throw new AppError(
        "INTERNAL",
        "Berkas tidak dapat diunggah. Coba lagi beberapa saat.",
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        organization_id: context.organizationId!,
        category: parsed.data.category,
        title: parsed.data.title,
        original_filename: file.name.slice(0, 255),
        storage_bucket: "documents",
        storage_path: path,
        mime_type: file.type,
        file_size: file.size,
        visibility,
        uploaded_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      await supabase.storage.from("documents").remove([path]);
      return databaseFailure(error);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "document.uploaded",
      resourceType: "document",
      resourceId: data.id,
      metadata: {
        category: parsed.data.category,
        visibility,
        size: file.size,
      },
    });

    revalidatePath("/dokumen");

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateDocumentVisibility(
  organizationId: string,
  documentId: string,
  visibility: DocumentVisibility,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.documents.manageVisibility,
    );

    if (!DOCUMENT_VISIBILITIES.includes(visibility)) {
      return {
        success: false,
        error: "Visibilitas tidak valid.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("documents")
      .update({ visibility })
      .eq("id", documentId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "document.visibility_changed",
      resourceType: "document",
      resourceId: documentId,
      metadata: { visibility },
    });

    revalidatePath("/dokumen");

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function createDocumentDownloadUrl(
  organizationId: string,
  documentId: string,
): Promise<ActionResult<{ url: string; filename: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.documents.download,
    );

    const supabase = await createClient();

    // Baris ini melewati RLS `documents_select`, sehingga dokumen PRIVATE
    // milik orang lain tidak pernah sampai ke sini sejak awal.
    const { data: document } = await supabase
      .from("documents")
      .select("storage_path, original_filename")
      .eq("id", documentId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null)
      .maybeSingle();

    if (!document) {
      return {
        success: false,
        error: "Dokumen tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.storage_path, 300, {
        download: document.original_filename,
      });

    if (error || !data) {
      return {
        success: false,
        error: "Tautan unduh tidak dapat dibuat.",
        kind: "INTERNAL",
      };
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "document.downloaded",
      resourceType: "document",
      resourceId: documentId,
    });

    return ok({ url: data.signedUrl, filename: document.original_filename });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteDocument(
  organizationId: string,
  documentId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.documents.delete,
    );

    const supabase = await createClient();

    const { data: document } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", documentId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    const { error } = await supabase
      .from("documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (error) return databaseFailure(error);

    if (document?.storage_path) {
      await supabase.storage.from("documents").remove([document.storage_path]);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "document.deleted",
      resourceType: "document",
      resourceId: documentId,
    });

    revalidatePath("/dokumen");

    return ok();
  } catch (error) {
    return fail(error);
  }
}
