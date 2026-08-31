import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/password-recovery-forms";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lupa Kata Sandi"
      description="Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
