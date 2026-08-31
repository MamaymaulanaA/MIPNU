import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Menukar tautan pemulihan menjadi session.
 *
 * Tanpa route ini tautan pemulihan tidak pernah menjadi apa pun: Supabase
 * mengembalikan token pada FRAGMENT url (`#access_token=...`), dan fragment
 * tidak pernah sampai ke server — sehingga halaman /atur-ulang-sandi
 * menampilkan formulir yang mustahil berhasil. Aplikasi ini menyimpan session
 * di cookie, jadi penukarannya harus terjadi di server.
 *
 * Karena itu tautan yang kita terbitkan menunjuk ke sini dengan `token_hash`,
 * bukan langsung ke halaman formulir.
 *
 * Yang TIDAK dilakukan route ini: memutuskan apa pun tentang hak akses.
 * verifyOtp() hanya membuktikan pemegang tautan adalah pemilik email
 * tersebut; seluruh authorization tetap dievaluasi ulang di halaman tujuan.
 */

const ALLOWED_TYPES: EmailOtpType[] = ["recovery", "invite", "email"];

/**
 * Hanya path internal. Tujuan dari luar tidak pernah diikuti — `next` datang
 * dari url, jadi ia adalah masukan, bukan instruksi.
 *
 * Cast ke Route dilakukan SETELAH bentuknya diperiksa: typedRoutes tidak dapat
 * memeriksa nilai yang baru diketahui saat runtime.
 */
function safeNext(value: string | null): Route {
  const internal =
    value && value.startsWith("/") && !value.startsWith("//")
      ? value
      : "/atur-ulang-sandi";

  return internal as Route;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNext(params.get("next"));

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    redirect("/login?alasan=tautan-tidak-valid" as Route);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Alasannya sengaja tidak dirinci: tautan kedaluwarsa dan tautan karangan
    // menghasilkan jawaban yang sama.
    redirect("/login?alasan=tautan-kedaluwarsa" as Route);
  }

  redirect(next);
}
