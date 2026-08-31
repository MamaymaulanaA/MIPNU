import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { MemberForm } from "@/features/members/components/member-form";
import { getMember } from "@/features/members/queries/get-member";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Ubah Anggota",
};

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.members.edit)) {
    return <ForbiddenState />;
  }

  const canEditPrivate = can(context, PERMISSIONS.members.viewPrivate);
  const member = await getMember(id, { includePrivate: canEditPrivate });
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Ubah Anggota" description={member.fullName} />

      <MemberForm
        organizationId={context.organizationId}
        memberId={member.id}
        canEditPrivate={canEditPrivate}
        canEditStatus={can(context, PERMISSIONS.members.manageStatus)}
        values={{
          fullName: member.fullName,
          memberNumber: member.memberNumber ?? "",
          gender: member.gender ?? "",
          birthPlace: member.birthPlace ?? "",
          birthDate: member.birthDate ?? "",
          email: member.email ?? "",
          phone: member.phone ?? "",
          address: member.address ?? "",
          joinDate: member.joinDate ?? "",
          status: member.status,
          notes: member.notes ?? "",
        }}
      />
    </div>
  );
}
