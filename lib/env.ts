import { z } from "zod";

/**
 * Validasi environment variable.
 *
 * Dipisah menjadi dua bagian dengan sengaja:
 *   - `publicEnv` boleh sampai ke browser.
 *   - `serverEnv()` memuat service role dan HANYA boleh dipanggil dari server.
 *     Berkas ini tidak menandai dirinya "server-only" secara keseluruhan agar
 *     bagian publik tetap dapat diimpor Client Component; pengamannya ada di
 *     `serverEnv()` yang melempar bila dipanggil di browser.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL harus berupa URL yang valid",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi"),
});

/**
 * Next.js mengganti `process.env.NEXT_PUBLIC_*` saat build, jadi properti
 * harus ditulis lengkap — destructuring atau akses dinamis tidak ikut
 * tergantikan di bundle client.
 */
const parsedPublicEnv = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedPublicEnv.success) {
  const issues = parsedPublicEnv.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Environment variable Supabase belum lengkap.\n${issues}\n\n` +
      "Salin .env.example menjadi .env.local lalu isi nilainya.",
  );
}

export const publicEnv = parsedPublicEnv.data;

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk operasi sistem"),
});

/**
 * Membaca secret server-side.
 *
 * Sengaja berupa function, bukan konstanta modul: secret hanya dibaca ketika
 * benar-benar dibutuhkan, dan pemanggilan dari browser gagal keras alih-alih
 * diam-diam menghasilkan `undefined`.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error(
      "serverEnv() dipanggil dari browser. Service role tidak boleh menyentuh client bundle.",
    );
  }

  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum diset. Diperlukan untuk operasi sistem (audit log).",
    );
  }

  return parsed.data;
}
