"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Field, Input } from "@/components/ui/field";
import {
  requestPasswordReset,
  resetPassword,
} from "@/features/auth/actions/password-recovery";
import type { ActionResult } from "@/lib/errors";

/**
 * Permintaan tautan atur ulang.
 *
 * Konfirmasinya sengaja netral: pesan yang sama muncul entah email tersebut
 * terdaftar atau tidak.
 */
export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(requestPasswordReset, null);

  if (state?.success) {
    return (
      <div className="space-y-3 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-10 place-items-center rounded-md bg-success-soft text-success"
        >
          <CheckCircle2 size={18} strokeWidth={1.9} />
        </span>
        <p className="text-sm font-medium text-foreground">
          Periksa kotak masuk Anda
        </p>
        <p className="text-[13px] text-muted-foreground">
          Jika email tersebut terdaftar, kami telah mengirimkan tautan untuk
          mengatur ulang kata sandi. Tautan berlaku terbatas.
        </p>
        <p className="pt-2 text-[13px]">
          <Link href="/login" className="text-primary hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    );
  }

  const failed = state && !state.success ? state : null;

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={failed?.fieldErrors ? undefined : failed?.error} />

      <Field
        label="Email"
        htmlFor="email"
        required
        error={failed?.fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="nama@contoh.id"
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Mengirim…">
        Kirim Tautan
      </SubmitButton>

      <p className="text-center text-[13px]">
        <Link href="/login" className="text-primary hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </form>
  );
}

/**
 * Penyetelan kata sandi baru.
 *
 * Bersandar pada recovery session yang sudah dibuat Supabase Auth dari
 * tautan email. Halaman ini tidak pernah memegang token apa pun sendiri.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(resetPassword, null);

  useEffect(() => {
    if (!state?.success) return;
    // Sesi pemulihan sudah menjadi sesi biasa setelah sandi diganti.
    const timer = setTimeout(() => router.push("/dashboard"), 1200);
    return () => clearTimeout(timer);
  }, [state, router]);

  if (state?.success) {
    return (
      <div className="space-y-3 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid size-10 place-items-center rounded-md bg-success-soft text-success"
        >
          <CheckCircle2 size={18} strokeWidth={1.9} />
        </span>
        <p className="text-sm font-medium text-foreground">
          Kata sandi berhasil diperbarui
        </p>
        <p className="text-[13px] text-muted-foreground">
          Mengalihkan Anda ke dashboard…
        </p>
      </div>
    );
  }

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <FormAlert message={fieldErrors ? undefined : failed?.error} />

      <Field
        label="Kata Sandi Baru"
        htmlFor="password"
        required
        hint="Minimal 12 karakter."
        error={fieldErrors?.password?.[0]}
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={12}
            className="pr-11"
            aria-invalid={Boolean(fieldErrors?.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </Field>

      <Field
        label="Ulangi Kata Sandi"
        htmlFor="confirmPassword"
        required
        error={fieldErrors?.confirmPassword?.[0]}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          aria-invalid={Boolean(fieldErrors?.confirmPassword)}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="Menyimpan…">
        Simpan Kata Sandi
      </SubmitButton>
    </form>
  );
}
