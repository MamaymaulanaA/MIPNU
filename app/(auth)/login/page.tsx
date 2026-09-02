import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Masuk"
      description="Gunakan akun yang terdaftar pada organisasi Anda."
    >
      <Suspense fallback={<div className="h-64" />}>
        <LoginForm />
      </Suspense>

      <p className="mt-5 text-[13px] text-muted-foreground">
        Lupa kata sandi?{" "}
        <Link
          href="/lupa-sandi"
          className="font-medium text-primary hover:underline"
        >
          Atur ulang di sini
        </Link>
      </p>
    </AuthShell>
  );
}
