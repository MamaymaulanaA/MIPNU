"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

import { signIn } from "@/features/auth/actions/sign-in";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { ActionResult } from "@/lib/errors";

const ALASAN: Record<string, string> = {
  "tautan-tidak-valid":
    "Tautan yang Anda buka tidak lengkap. Minta tautan baru kepada operator organisasi Anda.",
  "tautan-kedaluwarsa":
    "Tautan itu sudah tidak berlaku. Minta tautan baru kepada operator organisasi Anda.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "";

  const alasan = ALASAN[searchParams.get("alasan") ?? ""];

  const [state, formAction, isPending] = useActionState<
    ActionResult<void> | null,
    FormData
  >(signIn, null);

  const [showPassword, setShowPassword] = useState(false);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      {alasan && !failed ? (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md border border-warning/20 bg-warning-soft px-3 py-2.5 text-[13px] text-warning"
        >
          <AlertCircle
            size={16}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
          <span>{alasan}</span>
        </div>
      ) : null}

      {failed && !fieldErrors ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive"
        >
          <AlertCircle
            size={16}
            className="mt-px shrink-0"
            aria-hidden="true"
          />
          <span>{failed.error}</span>
        </div>
      ) : null}

      <Field
        label="Email"
        htmlFor="email"
        required
        error={fieldErrors?.email?.[0]}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="nama@contoh.id"
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Kata Sandi"
        htmlFor="password"
        required
        error={fieldErrors?.password?.[0]}
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Memproses…
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  );
}
