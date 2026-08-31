import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import {
  DocumentManager,
  type DocumentRow,
} from "@/features/documents/components/document-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dokumen",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; cari?: string }>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.documents.view)) {
    return <ForbiddenState />;
  }

  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select(
      `
      id, title, category, original_filename, mime_type, file_size,
      visibility, created_at,
      profiles ( display_name )
    `,
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (filters.kategori) query = query.eq("category", filters.kategori);
  if (filters.cari) {
    const escaped = filters.cari.replace(/[%_,()\\]/g, (m) => `\\${m}`);
    query = query.ilike("title", `%${escaped}%`);
  }

  const { data } = await query.order("created_at", { ascending: false });

  type Row = {
    id: string;
    title: string;
    category: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    visibility: string;
    created_at: string;
    profiles: { display_name: string } | null;
  };

  const documents: DocumentRow[] = (
    (data as unknown as Row[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    visibility: row.visibility,
    createdAt: row.created_at,
    uploaderName: row.profiles?.display_name ?? null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dokumen"
        description="Arsip berkas organisasi. Tersimpan pada bucket privat, diakses lewat tautan berumur pendek."
      />

      <form className="flex flex-wrap items-end gap-2.5">
        <input
          type="search"
          name="cari"
          placeholder="Cari judul dokumen"
          defaultValue={filters.cari ?? ""}
          aria-label="Cari dokumen"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-64"
        />

        <select
          name="kategori"
          defaultValue={filters.kategori ?? ""}
          aria-label="Filter kategori"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua kategori</option>
          <option value="LETTER">Surat</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="LPJ">LPJ</option>
          <option value="SK">SK</option>
          <option value="CERTIFICATE">Sertifikat</option>
          <option value="REPORT">Laporan</option>
          <option value="EVENT_DOCUMENTATION">Dokumentasi Kegiatan</option>
          <option value="OTHER">Lainnya</option>
        </select>

        <button
          type="submit"
          className="h-10 rounded-md border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Terapkan
        </button>
      </form>

      <DocumentManager
        organizationId={context.organizationId}
        documents={documents}
        permissions={{
          canCreate: can(context, PERMISSIONS.documents.create),
          canDownload: can(context, PERMISSIONS.documents.download),
          canManageVisibility: can(
            context,
            PERMISSIONS.documents.manageVisibility,
          ),
          canDelete: can(context, PERMISSIONS.documents.delete),
        }}
      />
    </div>
  );
}
