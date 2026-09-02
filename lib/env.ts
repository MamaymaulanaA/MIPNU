import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL harus berupa URL yang valid",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY wajib diisi"),
});

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
