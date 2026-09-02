import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .pipe(z.email("Format email tidak valid"))
    .transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type SignInInput = z.infer<typeof signInSchema>;
