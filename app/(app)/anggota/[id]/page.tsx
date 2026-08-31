import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberStatusControl } from "@/features/members/components/member-status-control";
import {
  getMember,
  getMemberAssignments,
  getMemberStatusHistory,
} from "@/features/members/queries/get-member";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, orDash } from "@/lib/format";
import { managementStatus, memberStatus } from "@/lib/status";

export const metadata: Metadata = {
  title: "Detail Anggota",
};

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId) return <ForbiddenState />;

  const includePrivate = can(context, PERMISSIONS.members.viewPrivate);
  const isOwnRecord = context.memberId === id;

  // Anggota biasa boleh membuka halaman ini untuk dirinya sendiri walaupun
  // tidak memiliki `members.view` (docs/PERMISSIONS.md §60).
  if (!can(context, PERMISSIONS.members.view) && !isOwnRecord) {
    return <ForbiddenState />;
  }

  const member = await getMember(id, {
    includePrivate: includePrivate || isOwnRecord,
  });
  if (!member) notFound();

  const [history, assignments] = await Promise.all([
    getMemberStatusHistory(id),
    getMemberAssignments(id),
  ]);

  const status = memberStatus(member.status);
  const canEdit = can(context, PERMISSIONS.members.edit);
  const canManageStatus = can(context, PERMISSIONS.members.manageStatus);

  return (
    <div className="space-y-5">
      <PageHeader
        title={member.fullName}
        description={
          member.memberNumber
            ? `Nomor anggota ${member.memberNumber}`
            : "Belum memiliki nomor anggota"
        }
        actions={
          <>
            {canManageStatus ? (
              <MemberStatusControl
                organizationId={context.organizationId}
                memberId={member.id}
                currentStatus={member.status}
                memberName={member.fullName}
              />
            ) : null}
            {canEdit ? (
              <Button variant="secondary" asChild>
                <Link href={`/anggota/${member.id}/edit`}>
                  <Pencil size={16} aria-hidden="true" />
                  Ubah
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            {/* Avatar bawaan, bukan foto: anggota belum tentu punya akun,
                sehingga tidak ada unggahan yang bisa menang di sini. Namanya
                sudah tertulis di sebelahnya, jadi gambarnya dekoratif. */}
            <Avatar
              gender={
                member.gender === "L" || member.gender === "P"
                  ? member.gender
                  : null
              }
              identity={member.id}
              size="xl"
            />
            <CardTitle>Data Anggota</CardTitle>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
          </CardHeader>

          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Nama Lengkap" value={member.fullName} />
              <Detail label="Nomor Anggota" value={member.memberNumber} />
              <Detail
                label="Jenis Kelamin"
                value={
                  member.gender === "L"
                    ? "Laki-laki"
                    : member.gender === "P"
                      ? "Perempuan"
                      : null
                }
              />
              <Detail
                label="Tanggal Bergabung"
                value={member.joinDate ? formatDate(member.joinDate) : null}
              />
              <Detail label="Tempat Lahir" value={member.birthPlace} />
              <Detail
                label="Tanggal Lahir"
                value={member.birthDate ? formatDate(member.birthDate) : null}
              />

              {includePrivate || isOwnRecord ? (
                <>
                  <Detail label="Email" value={member.email} />
                  <Detail label="Telepon" value={member.phone} />
                  <Detail
                    label="Alamat"
                    value={member.address}
                    className="sm:col-span-2"
                  />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <p className="text-[13px] text-muted-foreground">
                    Data kontak dan alamat disembunyikan. Diperlukan permission
                    tersendiri untuk melihat data pribadi anggota.
                  </p>
                </div>
              )}

              <Detail
                label="Catatan"
                value={member.notes}
                className="sm:col-span-2"
              />
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Jabatan</CardTitle>
            </CardHeader>
            {assignments.length === 0 ? (
              <CardContent>
                <p className="text-[13px] text-muted-foreground">
                  Belum pernah menjabat.
                </p>
              </CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {assignments.map((assignment) => {
                  const assignmentStatus = managementStatus(assignment.status);

                  return (
                    <li key={assignment.id} className="px-4 py-3 sm:px-5">
                      <p className="text-sm font-medium text-foreground">
                        {assignment.positionName}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {assignment.periodName}
                      </p>
                      <Badge tone={assignmentStatus.tone} className="mt-1.5">
                        {assignmentStatus.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat Status</CardTitle>
            </CardHeader>
            {history.length === 0 ? (
              <CardContent>
                <p className="text-[13px] text-muted-foreground">
                  Belum ada perubahan status sejak anggota ini didaftarkan.
                </p>
              </CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((entry) => (
                  <li key={entry.id} className="px-4 py-3 sm:px-5">
                    <p className="text-sm text-foreground">
                      {entry.fromStatus
                        ? `${memberStatus(entry.fromStatus).label} → ${memberStatus(entry.toStatus).label}`
                        : memberStatus(entry.toStatus).label}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {formatDateTime(entry.changedAt)}
                      {entry.changedByName ? ` · ${entry.changedByName}` : ""}
                    </p>
                    {entry.reason ? (
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        {entry.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({
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
