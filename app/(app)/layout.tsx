import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getOwnAvatarUrl } from "@/features/profile/queries/get-avatar-url";
import { getOwnGender } from "@/features/profile/queries/get-own-gender";
import {
  getAccessContext,
  getCurrentProfile,
  listAccessibleOrganizations,
} from "@/lib/auth/context";

/**
 * Layout area aplikasi.
 *
 * Di sinilah identitas, daftar organisasi, dan permission efektif diselesaikan
 * — sekali per request, di server. Client tidak pernah menghitung permission
 * sendiri; ia hanya menerima hasilnya untuk menyusun menu.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Proxy sudah menahan pengunjung anonim. Pemeriksaan ini menangani
  // kasus lain: sudah punya session Auth tetapi profilnya nonaktif/hilang.
  if (!profile) redirect("/login");

  const [organizations, context, avatarUrl, gender] = await Promise.all([
    listAccessibleOrganizations(),
    getAccessContext(),
    getOwnAvatarUrl(),
    getOwnGender(),
  ]);

  return (
    <AppShell
      permissions={[...(context?.permissions ?? [])]}
      organizations={organizations}
      currentOrganizationId={context?.organizationId ?? null}
      displayName={profile.display_name}
      email={profile.email}
      avatarUrl={avatarUrl}
      gender={gender}
      // Id anggota lebih dulu: orang yang sama harus berwajah sama di header
      // dan di daftar anggota, dan daftar itu hanya mengenal member.id.
      identity={context?.memberId ?? profile.id}
    >
      {children}
    </AppShell>
  );
}
