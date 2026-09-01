import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarRange, FileClock } from "lucide-react";

import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import {
  exportParticipation,
  exportResult,
  exportVoters,
} from "@/features/elections/actions/export-elections";
import { CandidatePanel } from "@/features/elections/components/candidate-panel";
import { CommitteePanel } from "@/features/elections/components/committee-panel";
import { ElectionEditDialog } from "@/features/elections/components/election-form";
import {
  ElectionTabs,
  parseTab,
  type ElectionTab,
} from "@/features/elections/components/election-tabs";
import { LifecycleActions } from "@/features/elections/components/lifecycle-actions";
import { ParticipationView } from "@/features/elections/components/participation-view";
import { ResultView } from "@/features/elections/components/result-view";
import { ExportButton } from "@/features/exports/components/export-button";
import { VotePanel } from "@/features/elections/components/vote-panel";
import {
  getElection,
  getElectionResult,
  getIntegrity,
  getOwnVoterState,
  getParticipation,
  listCandidates,
  listCommittee,
  listVoters,
} from "@/features/elections/queries/get-election";
import {
  ELECTION_TYPE_LABEL,
  EDITABLE_STATUSES,
  RESULT_VISIBILITY_LABEL,
  type ElectionStatus,
  type ElectionType,
  type ResultVisibility,
} from "@/features/elections/schemas/election.schema";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, orDash } from "@/lib/format";
import { electionStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Detail Pemilihan",
};

export default async function ElectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const context = await requireAccessContext();

  if (!context.organizationId) return <ForbiddenState />;

  // RLS yang menentukan keterlihatan: pemegang elections.view, dan anggota
  // yang namanya ada di DPT. Pemilihan tenant lain menghasilkan NULL.
  const election = await getElection(id);
  if (!election) notFound();

  const organizationId = context.organizationId;

  const canManageCandidates = can(
    context,
    PERMISSIONS.elections.manageCandidates,
  );
  const canManageVoters = can(context, PERMISSIONS.elections.manageVoters);
  const canAssignCommittee = can(
    context,
    PERMISSIONS.elections.assignCommittee,
  );
  const canViewAudit = can(context, PERMISSIONS.elections.viewAudit);
  const canEdit = can(context, PERMISSIONS.elections.edit);
  const canManage = can(context, PERMISSIONS.elections.manage);
  const canVote = can(context, PERMISSIONS.elections.vote);

  const status = electionStatus(election.status);
  const locked = !EDITABLE_STATUSES.includes(election.status as ElectionStatus);
  const votingOpen =
    election.status === "OPEN" &&
    new Date(election.startAt) <= new Date() &&
    new Date(election.endAt) >= new Date();

  // Tab yang tidak berhak dilihat tidak ditawarkan — dan tetap ditolak lagi di
  // bawah bila URL-nya diketik langsung.
  const visibleTabs: ElectionTab[] = ["ringkasan", "kandidat"];
  if (canManageVoters) visibleTabs.push("dpt");
  if (canAssignCommittee) visibleTabs.push("panitia");
  if (canManageVoters || canViewAudit || canManage) {
    visibleTabs.push("partisipasi");
  }
  visibleTabs.push("hasil");
  if (canViewAudit) visibleTabs.push("audit");

  const requested = parseTab(rawTab);
  const tab = visibleTabs.includes(requested) ? requested : "ringkasan";

  const supabase = await createClient();

  return (
    <div className="space-y-5">
      <PageHeader
        title={election.name}
        description={
          ELECTION_TYPE_LABEL[election.electionType as ElectionType] ??
          election.electionType
        }
        /*
          Aksi ekspor mengikuti tab yang sedang dibuka, dan berdiri di sini —
          bukan sebagai baris `flex justify-end` melayang di atas isi tabnya.
          Sebelumnya tiap seksi menaruh tombolnya sendiri di sana, dengan
          `size="sm"` pula: 36px di DPT dan Partisipasi, 44px di Panitia, pada
          halaman yang sama.
        */
        actions={
          <>
            {tab === "dpt" && canManageVoters ? (
              <ExportButton
                label="Ekspor DPT"
                action={exportVoters.bind(null, organizationId, id)}
              />
            ) : null}

            {tab === "partisipasi" ? (
              <ExportButton
                label="Ekspor Partisipasi"
                action={exportParticipation.bind(null, organizationId, id)}
              />
            ) : null}

            {canEdit && !locked ? (
              <ElectionEditDialog
                organizationId={organizationId}
                periodOptions={await periodOptions(organizationId)}
                election={{
                  id: election.id,
                  name: election.name,
                  description: election.description,
                  electionType: election.electionType,
                  periodId: election.periodId,
                  startAt: election.startAt,
                  endAt: election.endAt,
                  resultVisibility: election.resultVisibility,
                }}
              />
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
        <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <CalendarRange size={14} aria-hidden="true" />
          {formatDateTime(election.startAt)} – {formatDateTime(election.endAt)}
        </p>
      </div>

      {election.status === "CANCELLED" && election.cancelReason ? (
        <div className="rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive">
          Pemilihan dibatalkan: {election.cancelReason}
        </div>
      ) : null}

      <ElectionTabs electionId={id} active={tab} visible={visibleTabs} />

      {tab === "ringkasan" ? (
        <SummaryTab
          organizationId={organizationId}
          election={election}
          votingOpen={votingOpen}
          canVote={canVote}
          permissions={{
            canEdit,
            canOpen: can(context, PERMISSIONS.elections.open),
            canClose: can(context, PERMISSIONS.elections.close),
            canPublish: can(context, PERMISSIONS.elections.publishResult),
            canArchive: can(context, PERMISSIONS.elections.archive),
            canManage,
          }}
          memberId={context.memberId}
        />
      ) : null}

      {tab === "kandidat" ? (
        <CandidatePanel
          organizationId={organizationId}
          electionId={id}
          candidates={await listCandidates(id)}
          memberOptions={await memberOptions(organizationId)}
          canManage={canManageCandidates}
          locked={locked}
        />
      ) : null}

      {tab === "dpt" && canManageVoters ? (
        <VoterPanelSection
          organizationId={organizationId}
          electionId={id}
          locked={locked}
        />
      ) : null}

      {tab === "panitia" && canAssignCommittee ? (
        <CommitteeSection organizationId={organizationId} electionId={id} />
      ) : null}

      {tab === "partisipasi" ? (
        <ParticipationSection electionId={id} live={votingOpen} />
      ) : null}

      {tab === "hasil" ? (
        <ResultSection organizationId={organizationId} electionId={id} />
      ) : null}

      {tab === "audit" && canViewAudit ? (
        <AuditSection electionId={id} supabase={supabase} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ data */

async function periodOptions(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_periods")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });

  return (data ?? []).map((row) => ({ id: row.id, label: row.name }));
}

async function memberOptions(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, full_name, member_number")
    .eq("organization_id", organizationId)
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .order("full_name", { ascending: true })
    .limit(500);

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name,
    memberNumber: row.member_number,
  }));
}

/* ------------------------------------------------------------- ringkasan */

async function SummaryTab({
  organizationId,
  election,
  votingOpen,
  canVote,
  permissions,
  memberId,
}: {
  organizationId: string;
  election: Awaited<ReturnType<typeof getElection>> & object;
  votingOpen: boolean;
  canVote: boolean;
  permissions: React.ComponentProps<typeof LifecycleActions>["permissions"];
  memberId: string | null;
}) {
  const [integrity, voterState, candidates] = await Promise.all([
    getIntegrity(election.id),
    getOwnVoterState(election.id, memberId),
    listCandidates(election.id),
  ]);

  const anyLifecycle =
    permissions.canEdit ||
    permissions.canOpen ||
    permissions.canClose ||
    permissions.canPublish ||
    permissions.canArchive ||
    permissions.canManage;

  return (
    <div className="space-y-5">
      {voterState.inDpt ? (
        <Card>
          <CardHeader>
            <CardTitle>Hak Pilih Anda</CardTitle>
          </CardHeader>
          <CardContent>
            <VotePanel
              organizationId={organizationId}
              electionId={election.id}
              candidates={candidates}
              voterState={voterState}
              votingOpen={votingOpen}
              canVote={canVote}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rincian</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
              <Detail label="Periode" value={orDash(election.periodName)} />
              <Detail
                label="Visibilitas hasil"
                value={
                  RESULT_VISIBILITY_LABEL[
                    election.resultVisibility as ResultVisibility
                  ] ?? election.resultVisibility
                }
              />
              <Detail
                label="Dibuka"
                value={
                  election.openedAt ? formatDateTime(election.openedAt) : "—"
                }
              />
              <Detail
                label="Ditutup"
                value={
                  election.closedAt ? formatDateTime(election.closedAt) : "—"
                }
              />
              <Detail
                label="Dipublikasikan"
                value={
                  election.publishedAt
                    ? formatDateTime(election.publishedAt)
                    : "—"
                }
              />
              <Detail
                label="Surat suara"
                value={
                  integrity ? String(integrity.ballotCount) : "Tidak tersedia"
                }
              />
            </dl>

            {election.description ? (
              <p className="mt-4 border-t border-border pt-4 text-[13px] text-muted-foreground">
                {election.description}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {integrity ? (
          <Card>
            <CardHeader>
              <CardTitle>Pemeriksaan Integritas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-[13px]">
                <Check
                  ok={integrity.checks.has_candidates ?? false}
                  label={`Kandidat aktif (${integrity.activeCandidateCount})`}
                />
                <Check
                  ok={integrity.checks.has_voters ?? false}
                  label={`DPT berhak memilih (${integrity.eligibleCount})`}
                />
                <Check
                  ok={integrity.checks.schedule_valid ?? false}
                  label="Jadwal valid"
                />
                <Check
                  ok={integrity.checks.ballot_count_matches_voted ?? false}
                  label={`Surat suara = pemilih yang memilih (${integrity.ballotCount} : ${integrity.votedCount})`}
                />
                <Check
                  ok={integrity.checks.no_foreign_candidate ?? false}
                  label="Tidak ada kandidat lintas organisasi"
                />
                <Check
                  ok={integrity.checks.no_foreign_ballot ?? false}
                  label="Tidak ada surat suara lintas organisasi"
                />
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {anyLifecycle ? (
        <Card>
          <CardHeader>
            <CardTitle>Tahapan</CardTitle>
          </CardHeader>
          <CardContent>
            <LifecycleActions
              organizationId={organizationId}
              electionId={election.id}
              status={election.status}
              permissions={permissions}
              readyToOpen={integrity?.readyToOpen ?? false}
              readyToPublish={integrity?.readyToPublish ?? false}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Badge tone={ok ? "success" : "warning"}>{ok ? "Lolos" : "Belum"}</Badge>
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

/* ------------------------------------------------------------- tab lain */

async function VoterPanelSection({
  organizationId,
  electionId,
  locked,
}: {
  organizationId: string;
  electionId: string;
  locked: boolean;
}) {
  const { VoterPanel } =
    await import("@/features/elections/components/voter-panel");

  const [voters, members] = await Promise.all([
    listVoters(electionId),
    memberOptions(organizationId),
  ]);

  return (
    <div className="space-y-4">
      <VoterPanel
        organizationId={organizationId}
        electionId={electionId}
        voters={voters}
        memberOptions={members}
        canManage
        locked={locked}
      />
    </div>
  );
}

async function CommitteeSection({
  organizationId,
  electionId,
}: {
  organizationId: string;
  electionId: string;
}) {
  const supabase = await createClient();

  const [committee, members, permissionsResult] = await Promise.all([
    listCommittee(electionId),
    memberOptions(organizationId),
    supabase.from("permissions").select("id, code").like("code", "elections.%"),
  ]);

  const permissionNames: Record<string, string> = {};
  for (const row of permissionsResult.data ?? []) {
    permissionNames[row.id] = row.code;
  }

  return (
    <CommitteePanel
      organizationId={organizationId}
      electionId={electionId}
      committee={committee}
      memberOptions={members}
      permissionNames={permissionNames}
      canAssign
    />
  );
}

async function ParticipationSection({
  electionId,
  live,
}: {
  electionId: string;
  live: boolean;
}) {
  const participation = await getParticipation(electionId);

  if (!participation) {
    return (
      <EmptyState
        icon={FileClock}
        title="Partisipasi tidak tersedia"
        description="Anda tidak berhak melihat angka partisipasi pemilihan ini."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <ParticipationView
            electionId={electionId}
            participation={participation}
            live={live}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function ResultSection({
  organizationId,
  electionId,
}: {
  organizationId: string;
  electionId: string;
}) {
  const { result, reason } = await getElectionResult(electionId);

  return (
    <div className="space-y-4">
      {/* Tombol ekspor hanya muncul bila hasilnya memang sudah boleh dilihat.
          Menawarkannya lebih awal berarti menjanjikan berkas yang pasti
          ditolak server. */}
      {result ? (
        /*
          Ekspor hasil tetap di seksinya, bukan di kepala halaman: ia hanya
          boleh muncul ketika hasilnya memang sudah boleh dilihat, dan
          pengetahuan itu baru ada setelah `getElectionResult` dijawab di
          dalam seksi ini. Menaikkannya ke kepala berarti memanggil query
          hasil pada SETIAP tab, termasuk tab yang tidak berhak melihatnya.

          Ukurannya kini sama dengan tombol lain — bukan `size="sm"`.
        */
        <div className="flex justify-end">
          <ExportButton
            label={result.official ? "Ekspor Hasil Resmi" : "Ekspor Hasil"}
            action={exportResult.bind(null, organizationId, electionId)}
          />
        </div>
      ) : null}

      <ResultView result={result} reason={reason} />
    </div>
  );
}

async function AuditSection({
  electionId,
  supabase,
}: {
  electionId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  // Jejak audit pemilihan. Perhatikan yang TIDAK pernah muncul di sini:
  // kandidat pilihan seorang pemilih. Baris `elections.vote_cast` mencatat
  // bahwa seseorang memilih, tidak pernah apa yang ia pilih.
  // Kolomnya `display_name`, bukan `full_name` — profil bukan anggota. Salah
  // sebut membuat PostgREST menolak seluruh query, dan karena hasilnya hanya
  // dibaca sebagai "tidak ada baris", tab audit tampak kosong padahal
  // jejaknya ada. Error-nya karena itu ikut dicatat.
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, metadata, profiles ( display_name )")
    .eq("resource_type", "election")
    .eq("resource_id", electionId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[mipnu] gagal memuat audit pemilihan", error.message);
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    action: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
    profiles: { display_name: string } | null;
  }[];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileClock}
        title="Belum ada jejak audit"
        description="Peristiwa pemilihan akan tercatat di sini."
      />
    );
  }

  return (
    // Tabel audit di dalam kartu, seperti setiap tabel lain di aplikasi ini.
    // Sebelumnya ia berdiri telanjang di atas halaman.
    <Card>
      <TableScroll bounded>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Waktu</TableHeaderCell>
              <TableHeaderCell>Peristiwa</TableHeaderCell>
              <TableHeaderCell className="hidden sm:table-cell">
                Pelaku
              </TableHeaderCell>
              <TableHeaderCell className="hidden md:table-cell">
                Keterangan
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(row.created_at)}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.action}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {row.profiles?.display_name ?? "Sistem"}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {describeAudit(row.metadata)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </Card>
  );
}

function describeAudit(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";

  const parts: string[] = [];
  const previous = metadata.previous_status;
  const next = metadata.new_status;

  if (typeof previous === "string" && typeof next === "string") {
    parts.push(`${previous} → ${next}`);
  }
  if (typeof metadata.reason === "string") parts.push(metadata.reason);
  if (typeof metadata.count === "number") parts.push(`${metadata.count} baris`);

  return parts.length > 0 ? parts.join(" · ") : "—";
}
