import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OrganizationProfile = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  typeName: string;
  typeCode: string;
  levelName: string;
  levelCode: string;
  parentName: string | null;
  status: string;
  address: string | null;
  village: string | null;
  district: string | null;
  cityRegency: string | null;
  province: string | null;
  email: string | null;
  phone: string | null;
  description: string | null;
};

/**
 * Profil satu organisasi.
 *
 * Tidak perlu memfilter tenant secara manual: RLS pada `organizations` hanya
 * meloloskan organisasi yang benar-benar dapat diakses pemanggil, sehingga id
 * organisasi lain menghasilkan NULL, bukan data (docs/ARCHITECTURE.md §81).
 */
export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrganizationProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id, name, short_name, slug, status,
      address, village, district, city_regency, province,
      email, phone, description,
      organization_types!inner ( code, name ),
      organization_levels!inner ( code, name ),
      parent:organizations!parent_organization_id ( name )
    `,
    )
    .eq("id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[mipnu] gagal memuat organisasi", error.message);
    return null;
  }
  if (!data) return null;

  type Row = typeof data & {
    organization_types: { code: string; name: string };
    organization_levels: { code: string; name: string };
    parent: { name: string } | null;
  };

  const row = data as unknown as Row;

  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    slug: row.slug,
    typeCode: row.organization_types.code,
    typeName: row.organization_types.name,
    levelCode: row.organization_levels.code,
    levelName: row.organization_levels.name,
    parentName: row.parent?.name ?? null,
    status: row.status,
    address: row.address,
    village: row.village,
    district: row.district,
    cityRegency: row.city_regency,
    province: row.province,
    email: row.email,
    phone: row.phone,
    description: row.description,
  };
}
