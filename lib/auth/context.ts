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
  /**
   * Nilai `members.gender` apa adanya. HANYA untuk memilih avatar bawaan.
   * Ikut di sini supaya tidak menjadi perjalanan tersendiri ke Supabase.
   */
  gender: "L" | "P" | null;
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
type BootstrapPayload = {
  profile: {
    id: string;
    display_name: string;
    avatar_path: string | null;
    status: string;
  } | null;
  organizations: AccessibleOrganization[];
  is_super_admin: boolean;
  organization_id: string | null;
  member_id: string | null;
  has_membership: boolean;
  permissions: string[] | null;
};

/**
 * Seluruh konteks app shell dalam SATU perjalanan ke database.
 *
 * Sebelumnya empat perjalanan berurutan, masing-masing 110-250ms latensi:
 * getUser -> profiles -> memberships -> access_context. Tiga yang terakhir
 * sebenarnya tidak butuh apa pun dari aplikasi — database sudah menurunkan
 * identitas dari `auth.uid()` sendiri. Aplikasi hanya mengambil id lalu
 * mengirimkannya kembali, tiga kali.
 *
 * `getUser()` TETAP memvalidasi token ke Auth server, dan hasilnya tetap
 * menjadi gerbang: tanpa user yang tervalidasi, fungsi ini mengembalikan
 * NULL apa pun isi jawaban database. Ia berjalan BERSAMAAN, bukan dihapus —
 * RPC-nya tidak membutuhkan hasilnya, jadi tidak ada alasan menunggunya.
 *
 * Dan andai token dipalsukan: PostgREST menolaknya sebelum fungsi berjalan,
 * sehingga `auth.uid()` kosong dan RPC mengembalikan konteks kosong. Dua
 * pagar, keduanya tetap berdiri.
 */
const getBootstrap = cache(
  async (): Promise<{
    payload: BootstrapPayload;
    email: string | null;
  } | null> => {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const preferred = cookieStore.get(ORGANIZATION_COOKIE)?.value;

    const [userResult, rpcResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("mipnu_bootstrap", {
        p_preferred_organization_id: preferred ?? undefined,
      }),
    ]);

    const user = userResult.data.user;
    if (!user) return null;

    if (rpcResult.error) {
      console.error("[mipnu] gagal memuat konteks", rpcResult.error.message);
      return null;
    }

    const payload = rpcResult.data as unknown as BootstrapPayload;

    // Profil non-ACTIVE diperlakukan sama seperti tidak punya akses sama sekali,
    // konsisten dengan app_private.current_profile_id() di database.
    if (!payload.profile || payload.profile.status !== "ACTIVE") return null;

    return { payload, email: user.email ?? null };
  },
);

export const getCurrentProfile = cache(async () => {
  const bootstrap = await getBootstrap();
  if (!bootstrap) return null;

  return { ...bootstrap.payload.profile!, email: bootstrap.email };
});

/** Jalur lama, hanya dipakai bila konteks diminta untuk organisasi TERTENTU. */
const getProfileLegacy = cache(async () => {
  const supabase = await createClient();

  /*
    Query profil menunggu `getUser()` selesai, dan itu memang berurutan.

    Sempat dicoba memulainya lebih awal dengan id dari `getSession()` —
    dugaannya `getSession()` hanya membaca cookie tanpa jaringan. Diukur, dan
    hasilnya SEBALIKNYA: dashboard pengurus naik dari 954ms ke 1414ms. Di
    `@supabase/ssr`, `getSession()` bukan operasi lokal murni; ia menambah
    kerja alih-alih menghematnya.

    Dikembalikan ke bentuk berurutan yang jujur. Dicatat di sini supaya
    perbaikan yang sama tidak dicoba lagi tanpa mengukur.
  */
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
    const bootstrap = await getBootstrap();
    return bootstrap?.payload.organizations ?? [];
  },
);

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
  const bootstrap = await getBootstrap();
  return bootstrap?.payload.organization_id ?? null;
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
    /*
      Jalur biasa — organisasi aktif, yaitu yang dipakai hampir setiap
      halaman. Seluruh jawabannya sudah ada di dalam satu panggilan bootstrap
      yang juga memuat profil dan daftar organisasi, jadi tidak ada perjalanan
      tambahan sama sekali di sini.
    */
    if (organizationId === undefined) {
      const bootstrap = await getBootstrap();
      if (!bootstrap) return null;

      const { payload } = bootstrap;
      const hasOrganization =
        payload.organization_id !== null &&
        (payload.has_membership || payload.is_super_admin);

      return {
        profileId: payload.profile!.id,
        displayName: payload.profile!.display_name,
        isSuperAdmin: payload.is_super_admin,
        organizationId: hasOrganization ? payload.organization_id : null,
        memberId: payload.member_id,
        permissions: new Set(payload.permissions ?? []),
      };
    }

    /*
      Jalur organisasi TERTENTU — dipakai `requireOrganizationPermission()`
      ketika sebuah mutasi menyebut organisasinya secara eksplisit. Jarang,
      dan memang harus bertanya ulang: yang ditanyakan bukan "di mana saya
      sekarang" melainkan "apa hak saya di organisasi ini".
    */
    const profile = await getProfileLegacy();
    if (!profile) return null;

    const targetOrganizationId = organizationId;

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
