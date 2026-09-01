import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationProfileDialog } from "@/features/organizations/components/organization-profile-dialog";
import { getOrganizationProfile } from "@/features/organizations/queries/get-organization";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { orDash } from "@/lib/format";
import { organizationStatus } from "@/lib/status";

export const metadata: Metadata = {
  title: "Profil Organisasi",
};

export default async function OrganizationPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.organization.view)) {
    return <ForbiddenState />;
  }

  const organization = await getOrganizationProfile(context.organizationId);
  if (!organization) return <ErrorState />;

  const status = organizationStatus(organization.status);

  const address = [
    organization.address,
    organization.village,
    organization.district,
    organization.cityRegency,
    organization.province,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profil Organisasi"
        description="Identitas dan data dasar organisasi."
        /*
          Tombolnya hanya dirender bagi pemegang `organization.edit`. Itu
          keputusan tampilan, BUKAN pengamanan: `updateOrganization` tetap
          memeriksa permission yang sama di server sebelum menyentuh basis
          data, dan RLS memeriksanya sekali lagi (AGENTS.md §56).
        */
        actions={
          can(context, PERMISSIONS.organization.edit) ? (
            <OrganizationProfileDialog
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
          ) : undefined
        }
      />

      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            {/* Satu perlakuan untuk semua jenis organisasi. Jenisnya sudah
                tertulis pada baris di bawah judul (docs/UI.md §8). */}
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
            >
              <Building2 size={18} strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate">{organization.name}</CardTitle>
              <p className="truncate text-[13px] text-muted-foreground">
                {organization.levelName} · {organization.typeName}
              </p>
            </div>
          </div>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </CardHeader>

        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Nama Singkat" value={organization.shortName} />
            <DetailItem label="Slug" value={organization.slug} />
            <DetailItem label="Jenis" value={organization.typeName} />
            <DetailItem label="Tingkat" value={organization.levelName} />
            <DetailItem
              label="Organisasi Induk"
              value={organization.parentName}
            />
            <DetailItem label="Email" value={organization.email} />
            <DetailItem label="Telepon" value={organization.phone} />
            <DetailItem
              label="Alamat"
              value={address || null}
              className="sm:col-span-2"
            />
            <DetailItem
              label="Deskripsi"
              value={organization.description}
              className="sm:col-span-2"
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-foreground">
        {orDash(value)}
      </dd>
    </div>
  );
}
