import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { CalendarRange, Vote } from "lucide-react";

import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ElectionCreateDialog } from "@/features/elections/components/election-form";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { ELECTION_STATUSES } from "@/features/elections/schemas/election.schema";
import { listElections } from "@/features/elections/queries/get-election";
import { bacaParamDaftar } from "@/lib/list-params";
import { ELECTION_TYPE_LABEL } from "@/features/elections/schemas/election.schema";
import type { ElectionType } from "@/features/elections/schemas/election.schema";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { electionStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pemilihan",
};

const UKURAN_HALAMAN = 9;

export default async function ElectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.elections.view)) {
    return <ForbiddenState />;
  }

  const organizationId = context.organizationId;
  const canCreate = can(context, PERMISSIONS.elections.create);

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  const [halaman, periodsResult] = await Promise.all([
    listElections(organizationId, {
      dari: daftar.dari,
      sampai: daftar.sampai,
      cari: daftar.cari || undefined,
      status: daftar.saring.status || undefined,
    }),
    canCreate
      ? supabase
          .from("organization_periods")
          .select("id, name")
          .eq("organization_id", organizationId)
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const periodOptions = (periodsResult.data ?? []).map((row) => ({
    id: row.id,
    label: row.name,
  }));

  const elections = halaman.rows;
  const disaring = daftar.cari !== "" || daftar.saring.status !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pemilihan"
        description="Pemilihan internal organisasi, dari penyusunan kandidat sampai hasil resmi."
        actions={
          canCreate ? (
            <ElectionCreateDialog
              organizationId={organizationId}
              periodOptions={periodOptions}
            />
          ) : null
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari pemilihan…"
          searchLabel="Cari pemilihan"
          filters={[
            {
              key: "status",
              label: "Saring menurut status",
              value: daftar.saring.status,
              allLabel: "Semua status",
              options: ELECTION_STATUSES.map((value) => ({
                value,
                label: electionStatus(value).label,
              })),
            },
          ]}
        />

        {elections.length === 0 ? (
          <EmptyState
            icon={Vote}
            title={
              disaring
                ? "Tidak ada pemilihan yang cocok"
                : "Belum ada pemilihan"
            }
            description={
              disaring
                ? "Ubah kata pencarian atau saringan statusnya."
                : canCreate
                  ? "Buat pemilihan baru untuk mulai menyusun kandidat dan daftar pemilih."
                  : "Belum ada pemilihan yang dapat Anda lihat pada organisasi ini."
            }
          />
        ) : (
          <div className="scroll-area grid max-h-[calc(100dvh-16rem)] gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {elections.map((election) => {
              const status = electionStatus(election.status);

              return (
                <Link
                  key={election.id}
                  href={`/pemilihan/${election.id}` as Route}
                  className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[15px] font-semibold leading-snug text-foreground">
                          {election.name}
                        </h2>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-[13px] text-muted-foreground">
                        {ELECTION_TYPE_LABEL[
                          election.electionType as ElectionType
                        ] ?? election.electionType}
                        {election.periodName ? ` · ${election.periodName}` : ""}
                      </p>

                      <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                        <CalendarRange size={14} aria-hidden="true" />
                        <span>
                          {formatDateTime(election.startAt)} –{" "}
                          {formatDateTime(election.endAt)}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(1, Math.ceil(halaman.total / UKURAN_HALAMAN))}
          total={halaman.total}
          pageSize={UKURAN_HALAMAN}
          label="pemilihan"
        />
      </Card>
    </div>
  );
}
