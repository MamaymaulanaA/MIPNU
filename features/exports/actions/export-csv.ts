"use server";

import {
  memberListParamsSchema,
  type MemberListParams,
} from "@/features/members/schemas/member.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { toCsv } from "@/lib/csv";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { recordAudit } from "@/services/audit/record";

export type CsvExport = { filename: string; content: string };

const MAX_EXPORT_ROWS = 20_000;

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ekspor anggota.
 *
 * Dua permission berbeda bekerja di sini, dan itu disengaja:
 *
 *   `members.export`       menentukan boleh-tidaknya mengekspor sama sekali.
 *   `members.view_private` menentukan apakah kolom email/telepon/alamat ikut.
 *
 * Pemegang export tanpa view_private mendapat berkas TANPA kolom pribadi.
 * Ekspor tidak boleh menjadi pintu belakang yang memberi apa yang tidak
 * boleh dilihat di layar (docs/PERMISSIONS.md §76).
 *
 * Filter yang sedang aktif ikut diterapkan, sehingga yang diunduh sama
 * dengan yang dilihat.
 */
export async function exportMembers(
  organizationId: string,
  rawParams: Partial<MemberListParams>,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.members.export,
    );

    const includePrivate = context.permissions.has(
      PERMISSIONS.members.viewPrivate,
    );

    const params = memberListParamsSchema.parse(rawParams);
    const supabase = await createClient();

    let query = supabase
      .from("members")
      .select(
        "member_number, full_name, gender, birth_place, birth_date, join_date, status, email, phone, address",
      )
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (params.status) query = query.eq("status", params.status);
    if (params.search) {
      const escaped = params.search.replace(/[%_,()\\]/g, (m) => `\\${m}`);
      query = query.or(
        `full_name.ilike.%${escaped}%,member_number.ilike.%${escaped}%`,
      );
    }

    const { data, error } = await query
      .order(params.sort, { ascending: params.direction === "asc" })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor anggota", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    const columns = [
      { key: "member_number" as const, label: "Nomor Anggota" },
      { key: "full_name" as const, label: "Nama Lengkap" },
      { key: "gender" as const, label: "Jenis Kelamin" },
      { key: "birth_place" as const, label: "Tempat Lahir" },
      { key: "birth_date" as const, label: "Tanggal Lahir" },
      { key: "join_date" as const, label: "Tanggal Bergabung" },
      { key: "status" as const, label: "Status" },
      ...(includePrivate
        ? [
            { key: "email" as const, label: "Email" },
            { key: "phone" as const, label: "Telepon" },
            { key: "address" as const, label: "Alamat" },
          ]
        : []),
    ];

    const rows = (data ?? []).map((row) => {
      if (includePrivate) return row;
      const { email: _e, phone: _p, address: _a, ...safe } = row;
      return safe as typeof row;
    });

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "member.exported",
      resourceType: "member",
      metadata: { rows: rows.length, include_private: includePrivate },
    });

    return ok({
      filename: `anggota-${timestamp()}.csv`,
      content: toCsv(rows, columns),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Ekspor struktur kepengurusan. Tenant-scoped, permission-aware. */
export async function exportManagement(
  organizationId: string,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.management.export,
    );

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("management_assignments")
      .select(
        `
        status, start_date, end_date,
        members!inner ( full_name, member_number ),
        positions!inner ( name, sort_order ),
        organization_periods!inner ( name )
      `,
      )
      .eq("organization_id", context.organizationId!)
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor kepengurusan", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      status: string;
      start_date: string | null;
      end_date: string | null;
      members: { full_name: string; member_number: string | null };
      positions: { name: string; sort_order: number };
      organization_periods: { name: string };
    };

    const rows = ((data as unknown as Row[] | null) ?? [])
      .map((row) => ({
        periode: row.organization_periods.name,
        nomor_anggota: row.members.member_number ?? "",
        nama: row.members.full_name,
        jabatan: row.positions.name,
        urutan: row.positions.sort_order,
        status: row.status,
        mulai: row.start_date ?? "",
        berakhir: row.end_date ?? "",
      }))
      .sort(
        (a, b) => a.periode.localeCompare(b.periode) || a.urutan - b.urutan,
      );

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "management.exported",
      resourceType: "management_assignment",
      metadata: { rows: rows.length },
    });

    return ok({
      filename: `kepengurusan-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "periode", label: "Periode" },
        { key: "nomor_anggota", label: "Nomor Anggota" },
        { key: "nama", label: "Nama" },
        { key: "jabatan", label: "Jabatan" },
        { key: "status", label: "Status" },
        { key: "mulai", label: "Mulai" },
        { key: "berakhir", label: "Berakhir" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function exportAttendance(
  organizationId: string,
  sessionId: string,
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.export,
    );

    const supabase = await createClient();

    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id, name, events!inner ( name )")
      .eq("id", sessionId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (!session) {
      return {
        success: false,
        error: "Sesi presensi tidak ditemukan.",
        kind: "NOT_FOUND",
      };
    }

    const sessionRow = session as unknown as {
      id: string;
      name: string;
      events: { name: string };
    };

    const { data, error } = await supabase
      .from("attendance_records")
      .select("status, check_in_at, members!inner ( full_name, member_number )")
      .eq("attendance_session_id", sessionId)
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor presensi", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      status: string;
      check_in_at: string | null;
      members: { full_name: string; member_number: string | null };
    };

    const rows = ((data as unknown as Row[] | null) ?? [])
      .map((row) => ({
        event: sessionRow.events.name,
        sesi: sessionRow.name,
        nomor_anggota: row.members.member_number ?? "",
        nama: row.members.full_name,
        status: row.status,
        waktu_check_in: row.check_in_at ? formatDateTime(row.check_in_at) : "",
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "attendance.exported",
      resourceType: "attendance_session",
      resourceId: sessionId,
      metadata: { rows: rows.length },
    });

    return ok({
      filename: `presensi-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "event", label: "Event" },
        { key: "sesi", label: "Sesi" },
        { key: "nomor_anggota", label: "Nomor Anggota" },
        { key: "nama", label: "Nama" },
        { key: "status", label: "Status" },
        { key: "waktu_check_in", label: "Waktu Check-in" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function exportCadreship(
  organizationId: string,
  filters: { typeId?: string; status?: string; search?: string } = {},
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.cadreship.export,
    );

    const supabase = await createClient();

    let query = supabase
      .from("cadreship_records")
      .select(
        `
        activity_name, organizer, location, start_date, end_date, status,
        certificate_number, verified_at,
        members!cadreship_records_member_fk ( full_name, member_number ),
        cadreship_types!inner ( name )
      `,
      )
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (filters.typeId) query = query.eq("cadreship_type_id", filters.typeId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) {
      const escaped = filters.search.replace(/[%_,()\\]/g, (m) => `\\${m}`);
      query = query.ilike("activity_name", `%${escaped}%`);
    }

    const { data, error } = await query
      .order("start_date", { ascending: false, nullsFirst: false })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor kaderisasi", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      activity_name: string;
      organizer: string | null;
      location: string | null;
      start_date: string | null;
      end_date: string | null;
      status: string;
      certificate_number: string | null;
      verified_at: string | null;
      members: { full_name: string; member_number: string | null } | null;
      cadreship_types: { name: string };
    };

    const rows = ((data as unknown as Row[] | null) ?? []).map((row) => ({
      member_number: row.members?.member_number ?? "",
      full_name: row.members?.full_name ?? "",
      type_name: row.cadreship_types.name,
      activity_name: row.activity_name,
      organizer: row.organizer ?? "",
      location: row.location ?? "",
      start_date: row.start_date ?? "",
      end_date: row.end_date ?? "",
      status: row.status,
      certificate_number: row.certificate_number ?? "",
      verified_at: row.verified_at ? formatDateTime(row.verified_at) : "",
    }));

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "cadreship.exported",
      resourceType: "cadreship_record",
      metadata: { rows: rows.length },
    });

    return ok({
      filename: `kaderisasi-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "member_number", label: "Nomor Anggota" },
        { key: "full_name", label: "Nama" },
        { key: "type_name", label: "Jenjang" },
        { key: "activity_name", label: "Kegiatan" },
        { key: "organizer", label: "Penyelenggara" },
        { key: "location", label: "Lokasi" },
        { key: "start_date", label: "Tanggal Mulai" },
        { key: "end_date", label: "Tanggal Selesai" },
        { key: "status", label: "Status" },
        { key: "certificate_number", label: "Nomor Sertifikat" },
        { key: "verified_at", label: "Diverifikasi" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function exportMeetings(
  organizationId: string,
  filters: { status?: string } = {},
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.meetings.export,
    );

    const supabase = await createClient();

    let query = supabase
      .from("meetings")
      .select(
        `
        title, agenda, start_at, end_at, location, status,
        meeting_participants ( attendance_status ),
        meeting_minutes ( id )
      `,
      )
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (filters.status) query = query.eq("status", filters.status);

    const { data, error } = await query
      .order("start_at", { ascending: false })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor rapat", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      title: string;
      agenda: string | null;
      start_at: string;
      end_at: string | null;
      location: string | null;
      status: string;
      meeting_participants: { attendance_status: string }[];
      meeting_minutes: { id: string }[];
    };

    const rows = ((data as unknown as Row[] | null) ?? []).map((row) => ({
      title: row.title,
      agenda: row.agenda ?? "",
      start_at: formatDateTime(row.start_at),
      end_at: row.end_at ? formatDateTime(row.end_at) : "",
      location: row.location ?? "",
      status: row.status,
      participants: String(row.meeting_participants.length),
      present: String(
        row.meeting_participants.filter(
          (participant) => participant.attendance_status === "PRESENT",
        ).length,
      ),
      minutes: row.meeting_minutes.length > 0 ? "Ada" : "Belum",
    }));

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "meeting.exported",
      resourceType: "meeting",
      metadata: { rows: rows.length },
    });

    return ok({
      filename: `rapat-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "title", label: "Judul" },
        { key: "agenda", label: "Agenda" },
        { key: "start_at", label: "Mulai" },
        { key: "end_at", label: "Selesai" },
        { key: "location", label: "Lokasi" },
        { key: "status", label: "Status" },
        { key: "participants", label: "Jumlah Peserta" },
        { key: "present", label: "Hadir" },
        { key: "minutes", label: "Notulen" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function exportLetters(
  organizationId: string,
  kind: "incoming" | "outgoing",
  filters: { status?: string; search?: string } = {},
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.letters.export,
    );

    const supabase = await createClient();

    if (kind === "incoming") {
      let query = supabase
        .from("incoming_letters")
        .select(
          "letter_number, sender, subject, letter_date, received_date, status, notes, document_id",
        )
        .eq("organization_id", context.organizationId!)
        .is("deleted_at", null);

      if (filters.status) query = query.eq("status", filters.status);
      if (filters.search) {
        const escaped = filters.search.replace(/[%_,()\\]/g, (m) => `\\${m}`);
        query = query.ilike("subject", `%${escaped}%`);
      }

      const { data, error } = await query
        .order("received_date", { ascending: false })
        .limit(MAX_EXPORT_ROWS);

      if (error) {
        console.error("[mipnu] gagal mengekspor surat masuk", error.message);
        return {
          success: false,
          error: "Gagal menyiapkan berkas ekspor.",
          kind: "DATABASE",
        };
      }

      const rows = (data ?? []).map((row) => ({
        letter_number: row.letter_number ?? "",
        sender: row.sender,
        subject: row.subject,
        letter_date: row.letter_date ?? "",
        received_date: row.received_date,
        status: row.status,
        notes: row.notes ?? "",
        attachment: row.document_id ? "Ada" : "Tidak",
      }));

      await recordAudit({
        actorProfileId: context.profileId,
        organizationId: context.organizationId,
        action: "letter.exported",
        resourceType: "incoming_letter",
        metadata: { rows: rows.length, kind },
      });

      return ok({
        filename: `surat-masuk-${timestamp()}.csv`,
        content: toCsv(rows, [
          { key: "letter_number", label: "Nomor Surat" },
          { key: "sender", label: "Pengirim" },
          { key: "subject", label: "Perihal" },
          { key: "letter_date", label: "Tanggal Surat" },
          { key: "received_date", label: "Tanggal Diterima" },
          { key: "status", label: "Status" },
          { key: "attachment", label: "Lampiran" },
          { key: "notes", label: "Catatan" },
        ]),
      });
    }

    let query = supabase
      .from("outgoing_letters")
      .select(
        `
        letter_number, recipient, subject, letter_date, status, notes,
        document_id, approved_at,
        members!outgoing_letters_signer_fk ( full_name )
      `,
      )
      .eq("organization_id", context.organizationId!)
      .is("deleted_at", null);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) {
      const escaped = filters.search.replace(/[%_,()\\]/g, (m) => `\\${m}`);
      query = query.ilike("subject", `%${escaped}%`);
    }

    const { data, error } = await query
      .order("letter_date", { ascending: false })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor surat keluar", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      letter_number: string;
      recipient: string;
      subject: string;
      letter_date: string;
      status: string;
      notes: string | null;
      document_id: string | null;
      approved_at: string | null;
      members: { full_name: string } | null;
    };

    const rows = ((data as unknown as Row[] | null) ?? []).map((row) => ({
      letter_number: row.letter_number,
      recipient: row.recipient,
      subject: row.subject,
      letter_date: row.letter_date,
      signer: row.members?.full_name ?? "",
      status: row.status,
      approved_at: row.approved_at ? formatDateTime(row.approved_at) : "",
      attachment: row.document_id ? "Ada" : "Tidak",
      notes: row.notes ?? "",
    }));

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "letter.exported",
      resourceType: "outgoing_letter",
      metadata: { rows: rows.length, kind },
    });

    return ok({
      filename: `surat-keluar-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "letter_number", label: "Nomor Surat" },
        { key: "recipient", label: "Penerima" },
        { key: "subject", label: "Perihal" },
        { key: "letter_date", label: "Tanggal Surat" },
        { key: "signer", label: "Penandatangan" },
        { key: "status", label: "Status" },
        { key: "approved_at", label: "Disetujui" },
        { key: "attachment", label: "Lampiran" },
        { key: "notes", label: "Catatan" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function exportTransactions(
  organizationId: string,
  filters: {
    type?: string;
    accountId?: string;
    categoryId?: string;
    status?: string;
    start?: string;
    end?: string;
    search?: string;
  } = {},
): Promise<ActionResult<CsvExport>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.export,
    );

    if (
      filters.start &&
      filters.end &&
      Date.parse(filters.start) > Date.parse(filters.end)
    ) {
      return {
        success: false,
        error: "Tanggal awal tidak boleh melewati tanggal akhir.",
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    let query = supabase
      .from("financial_transactions")
      .select(
        `
        transaction_date, transaction_type, amount, description,
        reference_number, status, proof_document_id, void_reason,
        financial_accounts!financial_transactions_account_fk ( name ),
        financial_categories!financial_transactions_category_fk ( name )
      `,
      )
      .eq("organization_id", context.organizationId!);

    if (filters.type) query = query.eq("transaction_type", filters.type);
    if (filters.accountId) query = query.eq("account_id", filters.accountId);
    if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.start) query = query.gte("transaction_date", filters.start);
    if (filters.end) query = query.lte("transaction_date", filters.end);
    if (filters.search) {
      const escaped = filters.search.replace(/[%_,()\\]/g, (m) => `\\${m}`);
      query = query.or(
        `description.ilike.%${escaped}%,reference_number.ilike.%${escaped}%`,
      );
    }

    const { data, error } = await query
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(MAX_EXPORT_ROWS);

    if (error) {
      console.error("[mipnu] gagal mengekspor transaksi", error.message);
      return {
        success: false,
        error: "Gagal menyiapkan berkas ekspor.",
        kind: "DATABASE",
      };
    }

    type Row = {
      transaction_date: string;
      transaction_type: string;
      amount: number;
      description: string;
      reference_number: string | null;
      status: string;
      proof_document_id: string | null;
      void_reason: string | null;
      financial_accounts: { name: string } | null;
      financial_categories: { name: string } | null;
    };

    const rows = ((data as unknown as Row[] | null) ?? []).map((row) => ({
      transaction_date: row.transaction_date,
      transaction_type: row.transaction_type,
      account: row.financial_accounts?.name ?? "",
      category: row.financial_categories?.name ?? "",
      amount: String(row.amount),
      description: row.description,
      reference_number: row.reference_number ?? "",
      status: row.status,
      proof: row.proof_document_id ? "Ada" : "Tidak",
      void_reason: row.void_reason ?? "",
    }));

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "finance.exported",
      resourceType: "financial_transaction",
      metadata: { rows: rows.length, filters },
    });

    return ok({
      filename: `transaksi-keuangan-${timestamp()}.csv`,
      content: toCsv(rows, [
        { key: "transaction_date", label: "Tanggal" },
        { key: "transaction_type", label: "Jenis" },
        { key: "account", label: "Akun Kas" },
        { key: "category", label: "Kategori" },
        { key: "amount", label: "Nominal" },
        { key: "description", label: "Keterangan" },
        { key: "reference_number", label: "Nomor Referensi" },
        { key: "status", label: "Status" },
        { key: "proof", label: "Bukti" },
        { key: "void_reason", label: "Alasan Pembatalan" },
      ]),
    });
  } catch (error) {
    return fail(error);
  }
}
