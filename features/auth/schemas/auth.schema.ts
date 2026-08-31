import { z } from "zod";

/**
 * Skema validasi autentikasi.
 *
 * Validasi client hanya untuk UX. Skema yang sama dijalankan ulang di server
 * karena di situlah keamanannya (SYSTEM.md §57).
 */
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Format email tidak valid"))
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type SignInInput = z.infer<typeof signInSchema>;
