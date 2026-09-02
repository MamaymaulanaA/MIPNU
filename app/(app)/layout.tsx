import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getOwnAvatarUrl } from "@/features/profile/queries/get-avatar-url";
import { getOwnGender } from "@/features/profile/queries/get-own-gender";
import {
  getAccessContext,
  getCurrentProfile,
  listAccessibleOrganizations,
} from "@/lib/auth/context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

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
      identity={context?.memberId ?? profile.id}
    >
      {children}
    </AppShell>
  );
}
