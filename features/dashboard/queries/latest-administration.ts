import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Berkas dan pengumuman terbaru organisasi.
 *
 * Satu daftar pendek untuk dua modul administrasi yang paling sering
 * disentuh operator. Dipisah dari agregat karena bentuknya memang berbeda:
 * kartu metrik menjawab "berapa", daftar ini menjawab "yang mana".
 *
 * Setiap sumber hanya ikut bila haknya ada, dan penggabungannya terjadi
 * SETELAH penyaringan — jadi tidak ada berkas yang bocor lewat daftar
 * gabungan. Kolom yang diambil pun seminimal mungkin: judul dan waktu, tanpa
 * deskripsi, tanpa lampiran, tanpa pengunggahnya.
 */

export type AdministrationKind = "document" | "announcement";

export type AdministrationItem = {
  id: string;
  kind: AdministrationKind;
  title: string;
  createdAt: string;
};

export type AdministrationSources = {
  documents: boolean;
  announcements: boolean;
};

export async function getLatestAdministration(
  organizationId: string,
  sources: AdministrationSources,
  limit = 4,
): Promise<AdministrationItem[] | null> {
  if (!sources.documents && !sources.announcements) return null;

  const supabase = await createClient();

  const [documents, announcements] = await Promise.all([
    sources.documents
      ? supabase
          .from("documents")
          .select("id, title, created_at")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(limit)
      : null,
    sources.announcements
      ? supabase
          .from("announcements")
          .select("id, title, created_at")
          .eq("organization_id", organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(limit)
      : null,
  ]);

  const items: AdministrationItem[] = [];

  const kumpulkan = (
    kind: AdministrationKind,
    hasil: { data: unknown; error: { message: string } | null } | null,
  ) => {
    if (!hasil) return;

    if (hasil.error) {
      console.error(
        `[mipnu] gagal memuat administrasi ${kind}`,
        hasil.error.message,
      );
      return;
    }

    const rows = (hasil.data ?? []) as {
      id: string;
      title: string;
      created_at: string;
    }[];

    for (const row of rows) {
      items.push({
        id: `${kind}-${row.id}`,
        kind,
        title: row.title,
        createdAt: row.created_at,
      });
    }
  };

  kumpulkan("document", documents);
  kumpulkan("announcement", announcements);

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return items.slice(0, limit);
}
