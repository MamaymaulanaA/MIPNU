"use server";

import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/csv";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export type CsvExport = { filename: string; content: string };

/**
 * Ekspor pemilihan.
 *
 * Tiga berkas, dan hanya tiga: DPT, partisipasi, hasil resmi (EVOTING
 * §153-§156).
 *
 * YANG TIDAK PERNAH DIEKSPOR, dan tidak punya fungsi di berkas ini:
 * baris surat suara, tanda terima, urutan waktu masuknya suara, dan apa pun
 * yang memasangkan seorang pemilih dengan sebuah pilihan (§154). Ekspor tidak
 * boleh menjadi pintu belakang yang memberikan apa yang layar menolak
 * menampilkannya.
 *
 * Ekspor DPT memuat siapa yang sudah memilih — itu memang bukan rahasia, dan
 * sudah terlihat di layar DPT. Yang rahasia adalah PILIHANNYA.
 */

const MAX_EXPORT_ROWS = 20_000;

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "pemilihan"
  );
}

async function loadElection(electionId: string, organizationId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("elections")
    .select("id, name, status, start_at, end_at, published_at")
    .eq("id", electionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return data;
}

/* ------------------------------------------------------------------- DPT */

export async function exportVoters(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.manageVoters,
    );

    const election = await loadElection(electionId, context.organizationId!);
    if (!election) {
      return {
        success: false,
        error: "Pemilihan tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("election_voters")
      .select(
        "eligible, has_voted, voted_at, ineligible_reason, members!inner ( full_name, member_number )",
      )
      .eq("election_id", electionId)
      .order("created_at", { ascending: true })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor DPT", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    const rows = (data ?? []) as unknown as {
      eligible: boolean;
      has_voted: boolean;
      voted_at: string | null;
      ineligible_reason: string | null;
      members: { full_name: string; member_number: string | null } | null;
    }[];

    const content = toCsv(
      rows.map((row) => ({
        nomor: row.members?.member_number ?? "",
        nama: row.members?.full_name ?? "",
        berhak: row.eligible ? "Ya" : "Tidak",
        memilih: row.has_voted ? "Ya" : "Tidak",
        waktu: row.voted_at ? formatDateTime(row.voted_at) : "",
        alasan: row.ineligible_reason ?? "",
      })),
      [
        { key: "nomor", label: "Nomor Anggota" },
        { key: "nama", label: "Nama" },
        { key: "berhak", label: "Berhak Memilih" },
        { key: "memilih", label: "Sudah Memilih" },
        { key: "waktu", label: "Waktu Memilih" },
        { key: "alasan", label: "Alasan Tidak Berhak" },
      ],
    );

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.dpt_exported",
      resourceType: "election",
      resourceId: electionId,
      metadata: { rows: rows.length },
    });

    return ok({
      filename: `dpt-${slug(election.name)}-${timestamp()}.csv`,
      content,
    });
  } catch (error) {
    return fail(error);
  }
}

/* ----------------------------------------------------------- partisipasi */

export async function exportParticipation(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.view,
    );

    const election = await loadElection(electionId, context.organizationId!);
    if (!election) {
      return {
        success: false,
        error: "Pemilihan tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const supabase = await createClient();

    const { data } = await supabase.rpc("mipnu_election_participation", {
      p_election_id: electionId,
    });

    const payload = (data ?? {}) as {
      ok?: boolean;
      eligible_count?: number;
      voted_count?: number;
      remaining_count?: number;
      participation_percent?: number;
    };

    if (!payload.ok) {
      return {
        success: false,
        error: "Anda tidak berhak mengekspor partisipasi pemilihan ini.",
        kind: "FORBIDDEN",
      };
    }

    const content = toCsv(
      [
        { keterangan: "Pemilihan", nilai: election.name },
        { keterangan: "Status", nilai: election.status },
        { keterangan: "Mulai", nilai: formatDateTime(election.start_at) },
        { keterangan: "Selesai", nilai: formatDateTime(election.end_at) },
        {
          keterangan: "Total DPT berhak",
          nilai: String(payload.eligible_count ?? 0),
        },
        {
          keterangan: "Sudah memilih",
          nilai: String(payload.voted_count ?? 0),
        },
        {
          keterangan: "Belum memilih",
          nilai: String(payload.remaining_count ?? 0),
        },
        {
          keterangan: "Tingkat partisipasi (%)",
          nilai: String(payload.participation_percent ?? 0),
        },
      ],
      [
        { key: "keterangan", label: "Keterangan" },
        { key: "nilai", label: "Nilai" },
      ],
    );

    return ok({
      filename: `partisipasi-${slug(election.name)}-${timestamp()}.csv`,
      content,
    });
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------------------ hasil resmi */

/**
 * Hasil pemilihan.
 *
 * Gerbangnya sama persis dengan layar: `mipnu_election_result`. Selama
 * pemungutan suara berlangsung fungsi itu menolak, sehingga tidak ada berkas
 * untuk disusun — bukan berkas kosong, melainkan penolakan yang menyebut
 * alasannya.
 */
export async function exportResult(
  organizationId: string,
  electionId: string,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.elections.view,
    );

    const election = await loadElection(electionId, context.organizationId!);
    if (!election) {
      return {
        success: false,
        error: "Pemilihan tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const supabase = await createClient();

    const { data } = await supabase.rpc("mipnu_election_result", {
      p_election_id: electionId,
    });

    const payload = (data ?? {}) as {
      ok?: boolean;
      reason?: string;
      official?: boolean;
      total_ballots?: number;
      outcome?: string;
      candidates?: {
        candidate_number: number;
        display_name: string;
        vote_count: number;
        vote_percent: number;
      }[];
    };

    if (!payload.ok) {
      return {
        success: false,
        error:
          payload.reason === "RESULT_NOT_AVAILABLE"
            ? "Hasil belum dapat diekspor selama pemungutan suara berlangsung."
            : "Anda tidak berhak mengekspor hasil pemilihan ini.",
        kind: "FORBIDDEN",
      };
    }

    const content = toCsv(
      (payload.candidates ?? []).map((row) => ({
        nomor: String(row.candidate_number),
        nama: row.display_name,
        suara: String(row.vote_count),
        persen: String(row.vote_percent),
      })),
      [
        { key: "nomor", label: "Nomor Urut" },
        { key: "nama", label: "Nama Kandidat" },
        { key: "suara", label: "Perolehan Suara" },
        { key: "persen", label: "Persentase" },
      ],
    );

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "elections.result_exported",
      resourceType: "election",
      resourceId: electionId,
      metadata: {
        official: payload.official ?? false,
        total_ballots: payload.total_ballots ?? 0,
      },
    });

    const prefix = payload.official ? "hasil-resmi" : "hasil-sementara";

    return ok({
      filename: `${prefix}-${slug(election.name)}-${timestamp()}.csv`,
      content,
    });
  } catch (error) {
    return fail(error);
  }
}
