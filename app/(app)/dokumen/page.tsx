import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import {
  DocumentManager,
  type DocumentRow,
} from "@/features/documents/components/document-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dokumen",
};

const UKURAN_HALAMAN = 20;

/** Label kategori. Nilainya sama persis dengan `DOCUMENT_CATEGORIES`. */
const KATEGORI_DOKUMEN = [
  { value: "LETTER", label: "Surat" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "LPJ", label: "LPJ" },
  { value: "SK", label: "SK" },
  { value: "CERTIFICATE", label: "Sertifikat" },
  { value: "REPORT", label: "Laporan" },
  { value: "EVENT_DOCUMENTATION", label: "Dokumentasi Kegiatan" },
  { value: "OTHER", label: "Lainnya" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.documents.view)) {
    return <ForbiddenState />;
  }

  // Kunci pencarian mengikuti toolbar bersama (`search`). Sebelumnya halaman
  // ini memakai `cari` beserta form buatan tangan: penyaringnya SUDAH bekerja
  // di server, tetapi kontrolnya berupa <input>/<select> mentah setinggi 40px
  // yang tidak mengikuti tinggi kontrol MIPNU mana pun.
  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["kategori"],
  });

  const supabase = await createClient();

  let query = supabase
    .from("documents")
    .select(
      `
      id, title, category, original_filename, mime_type, file_size,
      visibility, created_at,
      profiles ( display_name )
    `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.kategori)
    query = query.eq("category", daftar.saring.kategori);
  if (daftar.cari) query = query.ilike("title", polaCari(daftar.cari));

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(daftar.dari, daftar.sampai);

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
    <DocumentManager
      organizationId={context.organizationId}
      documents={documents}
      daftar={{
        cari: daftar.cari,
        kategori: daftar.saring.kategori,
        kategoriOptions: KATEGORI_DOKUMEN,
        halaman: daftar.halaman,
        total: count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
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
  );
}
