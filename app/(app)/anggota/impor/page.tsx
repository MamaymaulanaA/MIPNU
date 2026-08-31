import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { MemberImport } from "@/features/members/components/member-import";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Impor Anggota",
};

export default async function ImportMembersPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.members.import)) {
    return <ForbiddenState />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Impor Anggota"
        description="Berkas diperiksa lebih dulu. Tidak ada baris yang masuk sebelum Anda mengonfirmasi."
      />
      <MemberImport organizationId={context.organizationId} />
    </div>
  );
}
