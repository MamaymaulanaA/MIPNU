"use server";

import { revalidatePath } from "next/cache";

import {
  ASSIGNABLE_COMMITTEE_PERMISSIONS,
  CANDIDATE_FIELDS,
  ELECTION_FIELDS,
  VOTE_FAILURE_MESSAGE,
  candidateSchema,
  cancelSchema,
  committeeSchema,
  electionSchema,
  voterEligibilitySchema,
} from "@/features/elections/schemas/election.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, formValues, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

const RELATION_FAILURE = {
  "23503": {
    success: false as const,
    error: "Anggota, periode, atau pemilihan tidak valid untuk organisasi ini.",
    kind: "CONFLICT" as const,
  },
  "23505": {
    success: false as const,
    error: "Data itu sudah ada. Nomor urut dan anggota tidak boleh berulang.",
    kind: "CONFLICT" as const,
  },
};

function guardFailure(message: string) {
  return {
    success: false as const,
    error: message,
    kind: "CONFLICT" as const,
  };
}

function revalidateElections(electionId?: string) {
  revalidatePath("/pemilihan");
  if (electionId) revalidatePath(`/pemilihan/${electionId}`);
  revalidatePath("/dashboard");
}

const STAGE_FAILURE: Record<string, string> = {
  FORBIDDEN: "Anda tidak memiliki izin untuk tindakan ini.",
  ELECTION_NOT_FOUND: "Pemilihan tidak ditemukan.",
  INVALID_TRANSITION:
    "Tahapan itu tidak dapat dijalankan dari status saat ini.",
  NO_CANDIDATE: "Pemilihan belum memiliki kandidat aktif.",
  NO_VOTER: "Daftar pemilih tetap masih kosong.",
  SCHEDULE_ENDED: "Jadwal pemilihan sudah berakhir. Perbarui jadwalnya dulu.",
  REASON_REQUIRED: "Alasan pembatalan wajib diisi, minimal 5 karakter.",
  INTEGRITY_MISMATCH:
    "Jumlah surat suara tidak sama dengan jumlah pemilih yang tercatat sudah memilih. Publikasi dihentikan.",
  INTEGRITY_FOREIGN_BALLOT:
    "Ditemukan surat suara yang tidak sesuai organisasi. Publikasi dihentikan.",
};

type StageResult = { ok?: boolean; reason?: string; status?: string };

export async function createElection(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.create,
    );

    const parsed = parseForm(electionSchema, formData, ELECTION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("elections")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: parsed.data.organizationPeriodId,
        name: parsed.data.name,
        description: parsed.data.description,
        election_type: parsed.data.electionType,
        start_at: parsed.data.startAt,
        end_at: parsed.data.endAt,
        result_visibility: parsed.data.resultVisibility,
        status: "DRAFT",
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error, RELATION_FAILURE);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.created",
      resourceType: "election",
      resourceId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidateElections();
    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateElection(
  organizationId: string,
  electionId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.edit,
    );

    const parsed = parseForm(electionSchema, formData, ELECTION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("elections")
      .update({
        organization_period_id: parsed.data.organizationPeriodId,
        name: parsed.data.name,
        description: parsed.data.description,
        election_type: parsed.data.electionType,
        start_at: parsed.data.startAt,
        end_at: parsed.data.endAt,
        result_visibility: parsed.data.resultVisibility,
      })
      .eq("id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error, RELATION_FAILURE);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.updated",
      resourceType: "election",
      resourceId: electionId,
    });

    revalidateElections(electionId);
    return ok({ id: electionId });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteElection(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manage,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("elections")
      .delete()
      .eq("id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.deleted",
      resourceType: "election",
      resourceId: electionId,
    });

    revalidateElections();
    return ok({ id: electionId });
  } catch (error) {
    return fail(error);
  }
}

async function runStage(
  organizationId: string,
  electionId: string,
  call: (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<ActionResult<{ status: string }>> {
  try {
    await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.view,
    );

    const supabase = await createClient();
    const { data, error } = await call(supabase);

    if (error) {
      return { success: false, error: error.message, kind: "DATABASE" };
    }

    const result = (data ?? {}) as StageResult;

    if (!result.ok) {
      const reason = result.reason ?? "INTERNAL";
      return {
        success: false,
        error: STAGE_FAILURE[reason] ?? "Tindakan tidak dapat dijalankan.",
        kind: reason === "FORBIDDEN" ? "FORBIDDEN" : "CONFLICT",
      };
    }

    revalidateElections(electionId);
    return ok({ status: result.status ?? "" });
  } catch (error) {
    return fail(error);
  }
}

export async function advanceElectionStage(
  organizationId: string,
  electionId: string,
  nextStatus: string,
): Promise<ActionResult<{ status: string }>> {
  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_advance_election_stage", {
      p_election_id: electionId,
      p_next_status: nextStatus,
    }),
  );
}

export async function openElection(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<{ status: string }>> {
  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_open_election", { p_election_id: electionId }),
  );
}

export async function closeElection(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<{ status: string }>> {
  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_close_election", { p_election_id: electionId }),
  );
}

export async function publishElectionResult(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<{ status: string }>> {
  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_publish_election_result", {
      p_election_id: electionId,
    }),
  );
}

export async function archiveElection(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<{ status: string }>> {
  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_archive_election", { p_election_id: electionId }),
  );
}

export async function cancelElection(
  organizationId: string,
  electionId: string,
  _previousState: ActionResult<{ status: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ status: string }>> {
  const parsed = parseForm(cancelSchema, formData, ["reason"]);
  if (!parsed.ok) return parsed.result;

  return runStage(organizationId, electionId, (supabase) =>
    supabase.rpc("mipnu_cancel_election", {
      p_election_id: electionId,
      p_reason: parsed.data.reason,
    }),
  );
}

export async function createCandidate(
  organizationId: string,
  electionId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageCandidates,
    );

    const parsed = parseForm(candidateSchema, formData, CANDIDATE_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        election_id: electionId,
        organization_id: context.organizationId!,
        member_id: parsed.data.memberId,
        candidate_number: parsed.data.candidateNumber,
        display_name_snapshot: parsed.data.displayName,
        vision: parsed.data.vision,
        mission: parsed.data.mission,
        profile_text: parsed.data.profileText,
        status: parsed.data.status,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error, RELATION_FAILURE);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.candidate_added",
      resourceType: "election",
      resourceId: electionId,
      metadata: { candidate_number: parsed.data.candidateNumber },
    });

    revalidateElections(electionId);
    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateCandidate(
  organizationId: string,
  electionId: string,
  candidateId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageCandidates,
    );

    const parsed = parseForm(candidateSchema, formData, CANDIDATE_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("candidates")
      .update({
        member_id: parsed.data.memberId,
        candidate_number: parsed.data.candidateNumber,
        display_name_snapshot: parsed.data.displayName,
        vision: parsed.data.vision,
        mission: parsed.data.mission,
        profile_text: parsed.data.profileText,
        status: parsed.data.status,
      })
      .eq("id", candidateId)
      .eq("election_id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error, RELATION_FAILURE);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.candidate_updated",
      resourceType: "election",
      resourceId: electionId,
      metadata: { candidate_id: candidateId },
    });

    revalidateElections(electionId);
    return ok({ id: candidateId });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteCandidate(
  organizationId: string,
  electionId: string,
  candidateId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageCandidates,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", candidateId)
      .eq("election_id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.candidate_removed",
      resourceType: "election",
      resourceId: electionId,
      metadata: { candidate_id: candidateId },
    });

    revalidateElections(electionId);
    return ok({ id: candidateId });
  } catch (error) {
    return fail(error);
  }
}

export async function addVoters(
  organizationId: string,
  electionId: string,
  memberIds: string[],
): Promise<ActionResult<{ added: number }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageVoters,
    );

    if (memberIds.length === 0) {
      return {
        success: false,
        error: "Pilih minimal satu anggota.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("election_voters")
      .insert(
        memberIds.map((memberId) => ({
          election_id: electionId,
          organization_id: context.organizationId!,
          member_id: memberId,
        })),
      )
      .select("id");

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error, RELATION_FAILURE);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.voters_added",
      resourceType: "election",
      resourceId: electionId,
      metadata: { count: data.length },
    });

    revalidateElections(electionId);
    return ok({ added: data.length });
  } catch (error) {
    return fail(error);
  }
}

export async function removeVoter(
  organizationId: string,
  electionId: string,
  voterId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageVoters,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("election_voters")
      .delete()
      .eq("id", voterId)
      .eq("election_id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.voter_removed",
      resourceType: "election",
      resourceId: electionId,
      metadata: { voter_id: voterId },
    });

    revalidateElections(electionId);
    return ok({ id: voterId });
  } catch (error) {
    return fail(error);
  }
}

export async function setVoterEligibility(
  organizationId: string,
  electionId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageVoters,
    );

    const parsed = parseForm(voterEligibilitySchema, formData, [
      "voterId",
      "eligible",
      "reason",
    ]);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("election_voters")
      .update({
        eligible: parsed.data.eligible,
        ineligible_reason: parsed.data.eligible ? null : parsed.data.reason,
      })
      .eq("id", parsed.data.voterId)
      .eq("election_id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) {
      if (error.code === "23514") return guardFailure(error.message);
      return databaseFailure(error);
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.voter_eligibility_changed",
      resourceType: "election",
      resourceId: electionId,
      metadata: {
        voter_id: parsed.data.voterId,
        eligible: parsed.data.eligible,
      },
    });

    revalidateElections(electionId);
    return ok({ id: parsed.data.voterId });
  } catch (error) {
    return fail(error);
  }
}

export async function assignCommittee(
  organizationId: string,
  electionId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.assignCommittee,
    );

    const requested = new Set(formValues(formData, "permissions"));
    const permissions = ASSIGNABLE_COMMITTEE_PERMISSIONS.filter((code) =>
      requested.has(code),
    );

    const parsed = parseForm(committeeSchema, formData, [
      "memberId",
      "positionName",
    ]);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("election_committees")
      .insert({
        election_id: electionId,
        organization_id: context.organizationId!,
        member_id: parsed.data.memberId,
        position_name: parsed.data.positionName,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error, RELATION_FAILURE);

    if (permissions.length > 0) {
      const { data: rows } = await supabase
        .from("permissions")
        .select("id, code")
        .in("code", permissions);

      if (rows && rows.length > 0) {
        const { error: grantError } = await supabase
          .from("election_committee_permissions")
          .insert(
            rows.map((row) => ({
              election_committee_id: data.id,
              permission_id: row.id,
            })),
          );

        if (grantError) return databaseFailure(grantError);
      }
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.committee_assigned",
      resourceType: "election",
      resourceId: electionId,
      metadata: {
        position_name: parsed.data.positionName,
        permissions,
      },
    });

    revalidateElections(electionId);
    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function removeCommittee(
  organizationId: string,
  electionId: string,
  committeeId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.assignCommittee,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("election_committees")
      .delete()
      .eq("id", committeeId)
      .eq("election_id", electionId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.committee_removed",
      resourceType: "election",
      resourceId: electionId,
      metadata: { committee_id: committeeId },
    });

    revalidateElections(electionId);
    return ok({ id: committeeId });
  } catch (error) {
    return fail(error);
  }
}

export async function castVote(
  organizationId: string,
  electionId: string,
  candidateId: string,
): Promise<ActionResult<{ receipt: string; votedAt: string }>> {
  try {
    await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.vote,
    );

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("mipnu_cast_vote", {
      p_election_id: electionId,
      p_candidate_id: candidateId,
    });

    if (error) {
      return {
        success: false,
        error: "Suara tidak dapat dikirim. Coba lagi.",
        kind: "DATABASE",
      };
    }

    const result = (data ?? {}) as {
      ok?: boolean;
      reason?: string;
      receipt?: string;
      voted_at?: string;
    };

    if (!result.ok) {
      const reason = result.reason ?? "INTERNAL";
      return {
        success: false,
        error:
          VOTE_FAILURE_MESSAGE[reason] ?? "Suara tidak dapat dikirim saat ini.",
        kind: reason === "ALREADY_VOTED" ? "CONFLICT" : "FORBIDDEN",
      };
    }

    revalidateElections(electionId);

    return ok({
      receipt: result.receipt ?? "",
      votedAt: result.voted_at ?? new Date().toISOString(),
    });
  } catch (error) {
    return fail(error);
  }
}
