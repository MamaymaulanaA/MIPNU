import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { MemberForm } from "@/features/members/components/member-form";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Tambah Anggota",
};

export default async function NewMemberPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.members.create)) {
    return <ForbiddenState />;
  }

  return (
    // Form satu resource dibatasi lebarnya. Field teks selebar monitor 27"
    // tidak membuatnya lebih mudah diisi (docs/UI.md §92).
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Tambah Anggota"
        description="Data anggota tersimpan pada organisasi yang sedang aktif."
      />
      <MemberForm organizationId={context.organizationId} />
    </div>
  );
}
