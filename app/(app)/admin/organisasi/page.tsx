import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import {
  OrganizationManager,
  type OrganizationRow,
} from "@/features/organizations/components/organization-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Organisasi",
};

/**
 * Daftar seluruh organisasi platform.
 *
 * Berbeda dari organization switcher, yang hanya memuat organisasi tempat
 * pengguna benar-benar punya membership. Halaman ini administrasi platform:
 * super admin dapat melihat semua organisasi tanpa menjadi pengurus di
 * dalamnya (docs/PERMISSIONS.md §46-§47).
 *
 * Jenis, tingkat, dan calon induk ikut dimuat di sini karena dialog pembuatan
 * membutuhkannya. Dulu ketiganya dimuat halaman `/admin/organisasi/baru`
 * tersendiri; setelah pembuatan pindah ke dialog, halaman itu tidak ada lagi
 * dan datanya ikut ke sini — satu kali muat untuk satu layar, bukan satu
 * perjalanan tambahan setiap kali dialog dibuka.
 */
/** Ukuran halaman daftar organisasi. */
const UKURAN_HALAMAN = 20;

/** Status organisasi yang benar-benar tersimpan pada kolomnya. */
const STATUS_ORGANISASI = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Tidak aktif" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
  { value: "ARCHIVED", label: "Diarsipkan" },
];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function satuNilai(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Konteks platform: permission global, tanpa organisasi aktif.
  const context = await requireAccessContext(null);

  if (!can(context, PERMISSIONS.organization.create)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const cari = satuNilai(params.search).trim();
  const status = satuNilai(params.status);
  const halaman = Math.max(1, Number(satuNilai(params.page)) || 1);
  const dari = (halaman - 1) * UKURAN_HALAMAN;

  const supabase = await createClient();

  let daftarQuery = supabase
    .from("organizations")
    .select(
      `
        id, name, short_name, slug, status,
        address, village, district, city_regency, province,
        email, phone, description,
        organization_types!inner ( code ),
        organization_levels!inner ( code, hierarchy_rank )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (status) daftarQuery = daftarQuery.eq("status", status);
  if (cari) {
    const aman = cari.replace(/[%_,]/g, "");
    if (aman)
      daftarQuery = daftarQuery.or(`name.ilike.%${aman}%,slug.ilike.%${aman}%`);
  }

  const [organizationsResult, typesResult, levelsResult, parentsResult] =
    await Promise.all([
      daftarQuery
        .order("name", { ascending: true })
        .range(dari, dari + UKURAN_HALAMAN - 1),

      supabase
        .from("organization_types")
        .select("id, code, name")
        .eq("is_active", true)
        .order("code"),

      supabase
        .from("organization_levels")
        .select("id, code, name, hierarchy_rank")
        .eq("is_active", true)
        .order("hierarchy_rank"),

      // Calon induk TIDAK boleh ikut terpotong pagination: dialog pembuatan
      // harus dapat menunjuk organisasi mana pun, bukan hanya yang kebetulan
      // ada di halaman yang sedang dibuka. Kolomnya sengaja hanya dua.
      supabase
        .from("organizations")
        .select("id, name")
        .is("deleted_at", null)
        .eq("status", "ACTIVE")
        .order("name"),
    ]);

  type Row = {
    id: string;
    name: string;
    short_name: string | null;
    slug: string;
    status: string;
    address: string | null;
    village: string | null;
    district: string | null;
    city_regency: string | null;
    province: string | null;
    email: string | null;
    phone: string | null;
    description: string | null;
    organization_types: { code: string };
    organization_levels: { code: string; hierarchy_rank: number };
  };

  const rows = (organizationsResult.data as unknown as Row[] | null) ?? [];

  const organizations: OrganizationRow[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status,
    typeCode: row.organization_types.code,
    levelCode: row.organization_levels.code,
    name: row.name,
    shortName: row.short_name ?? "",
    address: row.address ?? "",
    village: row.village ?? "",
    district: row.district ?? "",
    cityRegency: row.city_regency ?? "",
    province: row.province ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    description: row.description ?? "",
  }));

  return (
    <OrganizationManager
      organizations={organizations}
      cari={cari}
      status={status}
      statusOptions={STATUS_ORGANISASI}
      halaman={halaman}
      total={organizationsResult.count ?? 0}
      ukuranHalaman={UKURAN_HALAMAN}
      types={(typesResult.data ?? []).map((type) => ({
        id: type.id,
        label: `${type.code} — ${type.name}`,
      }))}
      levels={(levelsResult.data ?? []).map((level) => ({
        id: level.id,
        label: `${level.code} — ${level.name}`,
      }))}
      parents={(parentsResult.data ?? []).map((organization) => ({
        id: organization.id,
        label: organization.name,
      }))}
    />
  );
}
