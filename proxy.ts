import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

/** Route yang boleh diakses tanpa session. */
const PUBLIC_ROUTES = [
  "/login",
  "/lupa-sandi",
  "/atur-ulang-sandi",
  // Menukar tautan pemulihan menjadi session; pemanggilnya memang belum
  // punya session.
  "/auth/konfirmasi",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Menyegarkan session Supabase pada setiap request dan menahan pengguna
 * anonim di depan pintu.
 *
 * Proxy BUKAN batas keamanan — ia hanya mengurus pengalaman navigasi.
 * Authorization sesungguhnya tetap dilakukan server-side per halaman/aksi
 * dan RLS di database (docs/AUTHORIZATION.md §4-§5).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() memvalidasi token ke server Auth. getSession() hanya membaca
  // cookie, sehingga tidak layak dipakai untuk keputusan apa pun.
  //
  // Bila panggilan itu gagal (Auth tidak terjangkau, konfigurasi salah),
  // request diperlakukan sebagai anonim — gagal menutup, bukan gagal membuka.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error("[mipnu] gagal memverifikasi session", error);
  }

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Simpan tujuan awal supaya pengguna kembali ke tempat yang ia maksud.
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Lewati aset statis dan berkas gambar. Semua route lain melewati
     * proxy supaya cookie session selalu disegarkan.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
