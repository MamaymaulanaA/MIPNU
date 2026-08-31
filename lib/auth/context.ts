import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/auth/permissions";

/** Cookie penyimpan organisasi yang sedang dipilih. */
export const ORGANIZATION_COOKIE = "mipnu_organization";

export type AccessibleOrganization = {
  organizationId: string;
  name: string;
  shortName: string | null;
  slug: string;
  typeCode: string;
  levelCode: string;
  roleCode: string;
  roleName: string;
  memberId: string | null;
};

export type AccessContext = {
  profileId: string;
  displayName: string;
  isSuperAdmin: boolean;
  /** Organisasi aktif. NULL bila user belum/tidak terhubung ke organisasi. */
  organizationId: string | null;
  /** Member record user pada organisasi aktif. NULL bila bukan anggota. */
  memberId: string | null;
  permissions: ReadonlySet<string>;
};

type AccessContextPayload = {
  profile_id: string | null;
  is_super_admin: boolean;
  organization_id: string | null;
  member_id: string | null;
  has_membership: boolean;
  permissions: string[] | null;
};

/**
 * Profil aplikasi milik request saat ini.
 *
 * Memakai `getUser()` (memvalidasi token ke Auth server), bukan
 * `getSession()` yang hanya membaca cookie dan karenanya tidak layak menjadi
 * dasar keputusan apa pun.
 *
 * `cache()` membuatnya dievaluasi sekali per request meski dipanggil banyak
 * component.
 */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_path, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[mipnu] gagal memuat profile", error.message);
    return null;
  }

  // Profil non-ACTIVE diperlakukan sama seperti tidak punya akses sama sekali,
  // konsisten dengan app_private.current_profile_id() di database.
  if (!profile || profile.status !== "ACTIVE") return null;

  return { ...profile, email: user.email ?? null };
});

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) throw new UnauthenticatedError("no_active_profile");
  return profile;
}

/**
 * Organisasi yang benar-benar dapat diakses user.
 *
 * Sumbernya database, bukan daftar kiriman browser. Inilah satu-satunya
 * himpunan yang boleh dipilih organization switcher.
 *
 * Ada DUA jalan masuk, dan keduanya disengaja:
 *
 *   1. Membership aktif — jalur normal bagi hampir semua orang.
 *   2. Super admin global — dapat masuk ke organisasi mana pun untuk
 *      administrasi platform.
 *
 * Tanpa jalur kedua, sistem mengunci dirinya sendiri: super admin membuat
 * organisasi pertama lalu tidak dapat memasukinya, karena policy
 * `organization_memberships_insert` melarang siapa pun menambahkan dirinya
 * sendiri — pagar yang memang harus ada. Jalur kedua ini TIDAK memberi
 * wewenang operasional: permission efektif super admin di dalam organisasi
 * tetap berasal dari role_permissions miliknya, yang sengaja tidak memuat
 * members.view maupun finance apa pun (docs/PERMISSIONS.md §46-§47).
 */
export const listAccessibleOrganizations = cache(
  async (): Promise<AccessibleOrganization[]> => {
    const profile = await getCurrentProfile();
    if (!profile) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organization_memberships")
      .select(
        `
        member_id,
        organizations!inner (
          id,
          name,
          short_name,
          slug,
          status,
          organization_types!inner ( code ),
          organization_levels!inner ( code )
        ),
        roles!inner ( code, name )
      `,
      )
      .eq("profile_id", profile.id)
      .eq("status", "ACTIVE");

    if (error) {
      console.error("[mipnu] gagal memuat organisasi", error.message);
      return [];
    }

    type Row = {
      member_id: string | null;
      organizations: {
        id: string;
        name: string;
        short_name: string | null;
        slug: string;
        status: string;
        organization_types: { code: string };
        organization_levels: { code: string };
      };
      roles: { code: string; name: string };
    };

    const fromMembership = (data as unknown as Row[])
      .filter((row) => row.organizations.status === "ACTIVE")
      .map((row) => ({
        organizationId: row.organizations.id,
        name: row.organizations.name,
        shortName: row.organizations.short_name,
        slug: row.organizations.slug,
        typeCode: row.organizations.organization_types.code,
        levelCode: row.organizations.organization_levels.code,
        roleCode: row.roles.code,
        roleName: row.roles.name,
        memberId: row.member_id,
      }));

    const isSuperAdmin = await isGlobalSuperAdmin();
    if (!isSuperAdmin) {
      return fromMembership.sort((a, b) => a.name.localeCompare(b.name, "id"));
    }

    // RLS pada `organizations` sudah meloloskan seluruh organisasi bagi super
    // admin; query ini hanya menampilkannya, bukan melonggarkan apa pun.
    const { data: allOrganizations } = await supabase
      .from("organizations")
      .select(
        `
        id, name, short_name, slug,
        organization_types!inner ( code ),
        organization_levels!inner ( code )
      `,
      )
      .eq("status", "ACTIVE")
      .is("deleted_at", null);

    type OrganizationRow = {
      id: string;
      name: string;
      short_name: string | null;
      slug: string;
      organization_types: { code: string };
      organization_levels: { code: string };
    };

    const membershipIds = new Set(
      fromMembership.map((organization) => organization.organizationId),
    );

    // Membership sungguhan menang atas akses platform: kalau super admin
    // memang pengurus di suatu organisasi, role aslinya yang ditampilkan.
    const platformOnly = (
      (allOrganizations as unknown as OrganizationRow[] | null) ?? []
    )
      .filter((organization) => !membershipIds.has(organization.id))
      .map((organization) => ({
        organizationId: organization.id,
        name: organization.name,
        shortName: organization.short_name,
        slug: organization.slug,
        typeCode: organization.organization_types.code,
        levelCode: organization.organization_levels.code,
        roleCode: "SUPER_ADMIN",
        roleName: "Akses Platform",
        memberId: null,
      }));

    return [...fromMembership, ...platformOnly].sort((a, b) =>
      a.name.localeCompare(b.name, "id"),
    );
  },
);

/** Apakah request ini berasal dari super admin global. */
const isGlobalSuperAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("mipnu_access_context", {});
  if (error) return false;

  return (data as unknown as { is_super_admin: boolean }).is_super_admin;
});

/**
 * Menentukan organisasi aktif untuk request ini.
 *
 * Cookie hanyalah PREFERENSI, bukan otorisasi: nilainya selalu diadu dengan
 * daftar organisasi yang benar-benar boleh diakses. Cookie yang menunjuk
 * organisasi lain diabaikan begitu saja, bukan menyebabkan error — sehingga
 * mengutak-atik cookie tidak pernah menghasilkan akses lintas tenant
 * (docs/AUTHORIZATION.md §17).
 */
export const resolveOrganizationId = cache(async (): Promise<string | null> => {
  const organizations = await listAccessibleOrganizations();
  if (organizations.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ORGANIZATION_COOKIE)?.value;

  const match = organizations.find(
    (organization) => organization.organizationId === preferred,
  );

  return match?.organizationId ?? organizations[0]!.organizationId;
});

/**
 * Konteks otorisasi lengkap untuk request ini.
 *
 * Permission TIDAK dihitung di TypeScript. Seluruhnya berasal dari RPC
 * `mipnu_access_context`, yang memakai resolver SQL yang sama dengan RLS —
 * jadi tidak mungkin UI dan database berbeda pendapat tentang siapa boleh
 * apa (docs/PERMISSIONS.md §93).
 */
export const getAccessContext = cache(
  async (organizationId?: string | null): Promise<AccessContext | null> => {
    const profile = await getCurrentProfile();
    if (!profile) return null;

    const targetOrganizationId =
      organizationId === undefined
        ? await resolveOrganizationId()
        : organizationId;

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("mipnu_access_context", {
      // Argumen dihilangkan (bukan dikirim null) ketika tidak ada organisasi
      // aktif; default parameter di SQL sudah NULL, dan itulah jalur
      // permission tingkat platform.
      p_organization_id: targetOrganizationId ?? undefined,
    });

    if (error) {
      console.error("[mipnu] gagal memuat access context", error.message);
      return null;
    }

    const payload = data as unknown as AccessContextPayload;

    // Kalau organisasi diminta tetapi user tidak punya membership aktif di
    // sana, konteksnya dikosongkan alih-alih dibiarkan setengah terisi.
    const hasOrganization =
      targetOrganizationId !== null &&
      (payload.has_membership || payload.is_super_admin);

    return {
      profileId: profile.id,
      displayName: profile.display_name,
      isSuperAdmin: payload.is_super_admin,
      organizationId: hasOrganization ? targetOrganizationId : null,
      memberId: payload.member_id,
      permissions: new Set(payload.permissions ?? []),
    };
  },
);

export async function requireAccessContext(organizationId?: string | null) {
  const context = await getAccessContext(organizationId);
  if (!context) throw new UnauthenticatedError("no_access_context");
  return context;
}

/**
 * Pemeriksaan permission untuk menyusun UI (menyembunyikan menu/tombol).
 *
 * UI BUKAN batas keamanan. Setiap mutasi tetap wajib memanggil
 * `requirePermission()` di server (docs/PERMISSIONS.md §94-§95).
 */
export function can(context: AccessContext | null, permission: Permission) {
  return context?.permissions.has(permission) ?? false;
}

/**
 * Gerbang authorization untuk Server Action dan halaman sensitif.
 *
 * Melempar ForbiddenError bila tidak berhak, sehingga pemanggil tidak dapat
 * lupa memeriksa nilai kembalian.
 */
export async function requirePermission(
  permission: Permission,
  options: { organizationId?: string | null } = {},
): Promise<AccessContext> {
  const context = await requireAccessContext(options.organizationId);

  if (!context.permissions.has(permission)) {
    throw new ForbiddenError(`missing_permission:${permission}`);
  }

  return context;
}

/**
 * Gerbang tenant + permission sekaligus.
 *
 * Dipakai mutasi yang menyebut organisasi secara eksplisit: memastikan
 * organisasi target memang organisasi aktif user, sebelum permission diperiksa.
 */
export async function requireOrganizationPermission(
  organizationId: string,
  permission: Permission,
): Promise<AccessContext> {
  const context = await requireAccessContext(organizationId);

  if (context.organizationId !== organizationId) {
    throw new ForbiddenError("cross_tenant");
  }

  if (!context.permissions.has(permission)) {
    throw new ForbiddenError(`missing_permission:${permission}`);
  }

  return context;
}
