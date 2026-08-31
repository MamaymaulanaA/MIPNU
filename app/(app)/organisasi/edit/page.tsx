import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, ForbiddenState } from "@/components/feedback/states";
import { OrganizationForm } from "@/features/organizations/components/organization-form";
import { getOrganizationProfile } from "@/features/organizations/queries/get-organization";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Ubah Profil Organisasi",
};

export default async function EditOrganizationPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.organization.edit)) {
    return <ForbiddenState />;
  }

  const organization = await getOrganizationProfile(context.organizationId);
  if (!organization) return <ErrorState />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Ubah Profil Organisasi"
        description="Jenis, tingkat, dan slug tidak dapat diubah karena menentukan identitas organisasi."
      />

      <OrganizationForm
        mode="edit"
        organizationId={organization.id}
        values={{
          name: organization.name,
          shortName: organization.shortName ?? "",
          address: organization.address ?? "",
          village: organization.village ?? "",
          district: organization.district ?? "",
          cityRegency: organization.cityRegency ?? "",
          province: organization.province ?? "",
          email: organization.email ?? "",
          phone: organization.phone ?? "",
          description: organization.description ?? "",
        }}
      />
    </div>
  );
}
