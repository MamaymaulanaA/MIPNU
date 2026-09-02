import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Upload, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import {
  EmptyState,
  ForbiddenState,
  TableSkeleton,
} from "@/components/feedback/states";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { ExportButton } from "@/features/exports/components/export-button";
import { exportMembers } from "@/features/exports/actions/export-csv";
import { MemberCreateDialog } from "@/features/members/components/member-form-dialog";
import { listMembers } from "@/features/members/queries/list-members";
import {
  MEMBER_STATUSES,
  MEMBERS_PAGE_SIZE,
  memberListParamsSchema,
} from "@/features/members/schemas/member.schema";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatShortDate, orDash } from "@/lib/format";
import { memberStatus } from "@/lib/status";

export const metadata: Metadata = {
  title: "Data Anggota",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.members.view)) {
    return <ForbiddenState />;
  }

  const params = memberListParamsSchema.parse(await searchParams);
  const canCreate = can(context, PERMISSIONS.members.create);
  const includePrivate = can(context, PERMISSIONS.members.viewPrivate);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Anggota"
        description="Basis data anggota organisasi ini."
        actions={
          <>
            {can(context, PERMISSIONS.members.export) ? (
              <ExportButton
                label="Ekspor"
                action={exportMembers.bind(
                  null,
                  context.organizationId,
                  params,
                )}
              />
            ) : null}
            {can(context, PERMISSIONS.members.import) ? (
              <Button variant="secondary" asChild>
                <Link href="/anggota/impor">
                  <Upload size={16} aria-hidden="true" />
                  Impor
                </Link>
              </Button>
            ) : null}
            {canCreate ? (
              <MemberCreateDialog
                organizationId={context.organizationId}
                canEditPrivate={includePrivate}
                canEditStatus={can(context, PERMISSIONS.members.manageStatus)}
              />
            ) : null}
          </>
        }
      />

      <Card>
        <Suspense
          fallback={<div className="h-[77px] border-b border-border" />}
        >
          <TableToolbar
            searchValue={params.search}
            searchPlaceholder="Cari nama atau nomor anggota…"
            searchLabel="Cari anggota"
            filters={[
              {
                key: "status",
                label: "Saring menurut status",
                value: params.status,
                allLabel: "Semua status",
                options: MEMBER_STATUSES.map((status) => ({
                  value: status,
                  label: memberStatus(status).label,
                })),
              },
            ]}
          />
        </Suspense>

        <Suspense
          key={`${params.search}-${params.status}-${params.page}`}
          fallback={<TableSkeleton columns={includePrivate ? 5 : 4} />}
        >
          <MemberTable
            organizationId={context.organizationId}
            params={params}
            includePrivate={includePrivate}
            canCreate={canCreate}
            canManageStatus={can(context, PERMISSIONS.members.manageStatus)}
          />
        </Suspense>
      </Card>
    </div>
  );
}

async function MemberTable({
  organizationId,
  params,
  includePrivate,
  canCreate,
  canManageStatus,
}: {
  organizationId: string;
  params: ReturnType<typeof memberListParamsSchema.parse>;
  includePrivate: boolean;
  canCreate: boolean;
  canManageStatus: boolean;
}) {
  const { rows, total, page, pageCount } = await listMembers(
    organizationId,
    params,
    { includePrivate },
  );

  if (rows.length === 0) {
    const isFiltered = params.search !== "" || params.status !== "";

    return (
      <EmptyState
        icon={Users}
        title={
          isFiltered ? "Tidak ada anggota yang cocok" : "Belum ada anggota"
        }
        description={
          isFiltered
            ? "Coba ubah kata kunci atau filter status."
            : "Anggota yang ditambahkan akan tampil di sini."
        }
        action={
          !isFiltered && canCreate ? (
            <MemberCreateDialog
              organizationId={organizationId}
              canEditPrivate={includePrivate}
              canEditStatus={canManageStatus}
              trigger="ringkas"
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <TableScroll>
        <Table>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableHeaderCell>Nama</TableHeaderCell>
              <TableHeaderCell className="hidden sm:table-cell">
                No. Anggota
              </TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              {includePrivate ? (
                <TableHeaderCell className="hidden lg:table-cell">
                  Kontak
                </TableHeaderCell>
              ) : null}
              <TableHeaderCell className="hidden md:table-cell">
                Bergabung
              </TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.map((member) => {
              const status = memberStatus(member.status);

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        gender={
                          member.gender === "L" || member.gender === "P"
                            ? member.gender
                            : null
                        }
                        identity={member.id}
                        size="lg"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/anggota/${member.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {member.fullName}
                        </Link>
                        <span className="block text-[13px] text-muted-foreground sm:hidden">
                          {orDash(member.memberNumber)}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {orDash(member.memberNumber)}
                  </TableCell>

                  <TableCell>
                    <Badge tone={status.tone} dot>
                      {status.label}
                    </Badge>
                  </TableCell>

                  {includePrivate ? (
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      <span className="block">{orDash(member.email)}</span>
                      <span className="block text-[13px]">
                        {orDash(member.phone)}
                      </span>
                    </TableCell>
                  ) : null}

                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatShortDate(member.joinDate)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroll>

      <Suspense fallback={null}>
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={MEMBERS_PAGE_SIZE}
        />
      </Suspense>
    </>
  );
}
