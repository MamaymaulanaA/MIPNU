import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/features/auth/components/password-recovery-forms";

export const metadata: Metadata = {
  title: "Atur Ulang Kata Sandi",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Atur Ulang Kata Sandi"
      description="Pilih kata sandi baru untuk akun Anda."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
