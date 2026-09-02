import "server-only";

import { cache } from "react";

import { polaCari } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";

export type ElectionRow = {
  id: string;
  name: string;
  description: string | null;
  electionType: string;
  status: string;
  startAt: string;
  endAt: string;
  resultVisibility: string;
  openedAt: string | null;
  closedAt: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  periodId: string | null;
  periodName: string | null;
};

type ElectionRecord = {
  id: string;
  name: string;
  description: string | null;
  election_type: string;
  status: string;
  start_at: string;
  end_at: string;
  result_visibility: string;
  opened_at: string | null;
  closed_at: string | null;
  published_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  organization_period_id: string | null;
  organization_periods: { name: string } | null;
};

const SELECT =
  "id, name, description, election_type, status, start_at, end_at, " +
  "result_visibility, opened_at, closed_at, published_at, cancelled_at, " +
  "cancel_reason, organization_period_id, organization_periods ( name )";

function toRow(record: ElectionRecord): ElectionRow {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    electionType: record.election_type,
    status: record.status,
    startAt: record.start_at,
    endAt: record.end_at,
    resultVisibility: record.result_visibility,
    openedAt: record.opened_at,
    closedAt: record.closed_at,
    publishedAt: record.published_at,
    cancelledAt: record.cancelled_at,
    cancelReason: record.cancel_reason,
    periodId: record.organization_period_id,
    periodName: record.organization_periods?.name ?? null,
  };
}

export const getElection = cache(
  async (electionId: string): Promise<ElectionRow | null> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("elections")
      .select(SELECT)
      .eq("id", electionId)
      .maybeSingle();

    return data ? toRow(data as unknown as ElectionRecord) : null;
  },
);

export type ElectionListPage = {
  rows: ElectionRow[];
  total: number;
};

export const listElections = cache(
  async (
    organizationId: string,
    opsi: {
      dari: number;
      sampai: number;
      cari?: string;
      status?: string;
    },
  ): Promise<ElectionListPage> => {
    const supabase = await createClient();

    let query = supabase
      .from("elections")
      .select(SELECT, { count: "exact" })
      .eq("organization_id", organizationId);

    if (opsi.status) query = query.eq("status", opsi.status);
    if (opsi.cari) query = query.ilike("name", polaCari(opsi.cari));

    const { data, count } = await query
      .order("start_at", { ascending: false })
      .order("id", { ascending: true })
      .range(opsi.dari, opsi.sampai);

    return {
      rows: ((data ?? []) as unknown as ElectionRecord[]).map(toRow),
      total: count ?? 0,
    };
  },
);

export type CandidateRow = {
  id: string;
  candidateNumber: number;
  displayName: string;
  memberId: string | null;
  vision: string | null;
  mission: string | null;
  profileText: string | null;
  status: string;
};

export const listCandidates = cache(
  async (electionId: string): Promise<CandidateRow[]> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("candidates")
      .select(
        "id, candidate_number, display_name_snapshot, member_id, vision, mission, profile_text, status",
      )
      .eq("election_id", electionId)
      .order("candidate_number", { ascending: true });

    return (data ?? []).map((row) => ({
      id: row.id,
      candidateNumber: row.candidate_number,
      displayName: row.display_name_snapshot,
      memberId: row.member_id,
      vision: row.vision,
      mission: row.mission,
      profileText: row.profile_text,
      status: row.status,
    }));
  },
);

export type VoterRow = {
  id: string;
  memberId: string;
  fullName: string;
  memberNumber: string | null;
  eligible: boolean;
  hasVoted: boolean;
  votedAt: string | null;
  ineligibleReason: string | null;
};

type VoterRecord = {
  id: string;
  member_id: string;
  eligible: boolean;
  has_voted: boolean;
  voted_at: string | null;
  ineligible_reason: string | null;
  members: { full_name: string; member_number: string | null } | null;
};

export const listVoters = cache(
  async (electionId: string): Promise<VoterRow[]> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("election_voters")
      .select(
        "id, member_id, eligible, has_voted, voted_at, ineligible_reason, " +
          "members!inner ( full_name, member_number )",
      )
      .eq("election_id", electionId)
      .order("created_at", { ascending: true });

    return ((data ?? []) as unknown as VoterRecord[]).map((row) => ({
      id: row.id,
      memberId: row.member_id,
      fullName: row.members?.full_name ?? "—",
      memberNumber: row.members?.member_number ?? null,
      eligible: row.eligible,
      hasVoted: row.has_voted,
      votedAt: row.voted_at,
      ineligibleReason: row.ineligible_reason,
    }));
  },
);

export type CommitteeRow = {
  id: string;
  memberId: string;
  fullName: string;
  positionName: string;
  permissionIds: string[];
};

type CommitteeRecord = {
  id: string;
  member_id: string;
  position_name: string;
  members: { full_name: string } | null;
  election_committee_permissions: { permission_id: string }[] | null;
};

export const listCommittee = cache(
  async (electionId: string): Promise<CommitteeRow[]> => {
    const supabase = await createClient();

    const { data } = await supabase
      .from("election_committees")
      .select(
        "id, member_id, position_name, members!inner ( full_name ), " +
          "election_committee_permissions ( permission_id )",
      )
      .eq("election_id", electionId)
      .order("created_at", { ascending: true });

    return ((data ?? []) as unknown as CommitteeRecord[]).map((row) => ({
      id: row.id,
      memberId: row.member_id,
      fullName: row.members?.full_name ?? "—",
      positionName: row.position_name,
      permissionIds: (row.election_committee_permissions ?? []).map(
        (item) => item.permission_id,
      ),
    }));
  },
);

export type Participation = {
  eligibleCount: number;
  votedCount: number;
  remainingCount: number;
  participationPercent: number;
};

export async function getParticipation(
  electionId: string,
): Promise<Participation | null> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("mipnu_election_participation", {
    p_election_id: electionId,
  });

  const result = (data ?? {}) as {
    ok?: boolean;
    eligible_count?: number;
    voted_count?: number;
    remaining_count?: number;
    participation_percent?: number;
  };

  if (!result.ok) return null;

  return {
    eligibleCount: result.eligible_count ?? 0,
    votedCount: result.voted_count ?? 0,
    remainingCount: result.remaining_count ?? 0,
    participationPercent: Number(result.participation_percent ?? 0),
  };
}

export type ElectionResult = {
  official: boolean;
  status: string;
  publishedAt: string | null;
  totalBallots: number;
  outcome: "DECIDED" | "TIE" | "NO_VOTES";
  candidates: {
    candidateId: string;
    candidateNumber: number;
    displayName: string;
    candidateStatus: string;
    voteCount: number;
    votePercent: number;
  }[];
};

export async function getElectionResult(
  electionId: string,
): Promise<{ result: ElectionResult | null; reason: string | null }> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("mipnu_election_result", {
    p_election_id: electionId,
  });

  const payload = (data ?? {}) as {
    ok?: boolean;
    reason?: string;
    official?: boolean;
    status?: string;
    published_at?: string | null;
    total_ballots?: number;
    outcome?: string;
    candidates?: {
      candidate_id: string;
      candidate_number: number;
      display_name: string;
      candidate_status: string;
      vote_count: number;
      vote_percent: number;
    }[];
  };

  if (!payload.ok) {
    return { result: null, reason: payload.reason ?? "RESULT_NOT_AVAILABLE" };
  }

  return {
    reason: null,
    result: {
      official: payload.official ?? false,
      status: payload.status ?? "",
      publishedAt: payload.published_at ?? null,
      totalBallots: payload.total_ballots ?? 0,
      outcome: (payload.outcome ?? "NO_VOTES") as ElectionResult["outcome"],
      candidates: (payload.candidates ?? []).map((row) => ({
        candidateId: row.candidate_id,
        candidateNumber: row.candidate_number,
        displayName: row.display_name,
        candidateStatus: row.candidate_status,
        voteCount: row.vote_count,
        votePercent: Number(row.vote_percent ?? 0),
      })),
    },
  };
}

export type IntegrityReport = {
  status: string;
  candidateCount: number;
  activeCandidateCount: number;
  voterCount: number;
  eligibleCount: number;
  votedCount: number;
  ballotCount: number;
  checks: Record<string, boolean>;
  readyToOpen: boolean;
  readyToPublish: boolean;
};

export async function getIntegrity(
  electionId: string,
): Promise<IntegrityReport | null> {
  const supabase = await createClient();

  const { data } = await supabase.rpc("mipnu_election_integrity", {
    p_election_id: electionId,
  });

  const payload = (data ?? {}) as {
    ok?: boolean;
    status?: string;
    candidate_count?: number;
    active_candidate_count?: number;
    voter_count?: number;
    eligible_count?: number;
    voted_count?: number;
    ballot_count?: number;
    checks?: Record<string, boolean>;
    ready_to_open?: boolean;
    ready_to_publish?: boolean;
  };

  if (!payload.ok) return null;

  return {
    status: payload.status ?? "",
    candidateCount: payload.candidate_count ?? 0,
    activeCandidateCount: payload.active_candidate_count ?? 0,
    voterCount: payload.voter_count ?? 0,
    eligibleCount: payload.eligible_count ?? 0,
    votedCount: payload.voted_count ?? 0,
    ballotCount: payload.ballot_count ?? 0,
    checks: payload.checks ?? {},
    readyToOpen: payload.ready_to_open ?? false,
    readyToPublish: payload.ready_to_publish ?? false,
  };
}

export type OwnVoterState = {
  inDpt: boolean;
  eligible: boolean;
  hasVoted: boolean;
  votedAt: string | null;
};

export async function getOwnVoterState(
  electionId: string,
  memberId: string | null,
): Promise<OwnVoterState> {
  if (!memberId) {
    return { inDpt: false, eligible: false, hasVoted: false, votedAt: null };
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("election_voters")
    .select("eligible, has_voted, voted_at")
    .eq("election_id", electionId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!data) {
    return { inDpt: false, eligible: false, hasVoted: false, votedAt: null };
  }

  return {
    inDpt: true,
    eligible: data.eligible,
    hasVoted: data.has_voted,
    votedAt: data.voted_at,
  };
}
