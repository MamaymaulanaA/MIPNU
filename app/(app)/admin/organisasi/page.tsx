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
export default async function AdminOrganizationsPage() {
  // Konteks platform: permission global, tanpa organisasi aktif.
  const context = await requireAccessContext(null);

  if (!can(context, PERMISSIONS.organization.create)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const [organizationsResult, typesResult, levelsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        `
        id, name, short_name, slug, status,
        address, village, district, city_regency, province,
        email, phone, description,
        organization_types!inner ( code ),
        organization_levels!inner ( code, hierarchy_rank )
      `,
      )
      .is("deleted_at", null)
      .order("name", { ascending: true }),

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
      types={(typesResult.data ?? []).map((type) => ({
        id: type.id,
        label: `${type.code} — ${type.name}`,
      }))}
      levels={(levelsResult.data ?? []).map((level) => ({
        id: level.id,
        label: `${level.code} — ${level.name}`,
      }))}
      // Calon induk diambil dari daftar yang SUDAH dimuat, bukan query
      // keempat: halaman ini memang sudah memegang seluruh organisasi aktif.
      parents={organizations
        .filter((organization) => organization.status === "ACTIVE")
        .map((organization) => ({
          id: organization.id,
          label: organization.name,
        }))}
    />
  );
}
