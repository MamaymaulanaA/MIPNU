import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { exportLetters } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import {
  LetterCreateDialog,
  LetterTabs,
  type IncomingRow,
  type OutgoingRow,
} from "@/features/letters/components/letter-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Surat",
};

const UKURAN_HALAMAN = 20;

const STATUS_MASUK = [
  { value: "RECEIVED", label: "Diterima" },
  { value: "PROCESSED", label: "Diproses" },
  { value: "ARCHIVED", label: "Diarsipkan" },
];

const STATUS_KELUAR = [
  { value: "DRAFT", label: "Draf" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "SENT", label: "Dikirim" },
  { value: "ARCHIVED", label: "Diarsipkan" },
];

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.letters.view)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const activeTab = params.tab === "keluar" ? "keluar" : "masuk";

  const daftar = bacaParamDaftar(params, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  let masukQuery = supabase
    .from("incoming_letters")
    .select(
      "id, letter_number, sender, subject, letter_date, received_date, status, document_id, notes",
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  let keluarQuery = supabase
    .from("outgoing_letters")
    .select(
      `
          id, letter_number, recipient, subject, letter_date, signer_member_id,
          status, document_id, notes,
          members!outgoing_letters_signer_fk ( full_name )
        `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.status) {
    if (activeTab === "keluar") {
      keluarQuery = keluarQuery.eq("status", daftar.saring.status);
    } else {
      masukQuery = masukQuery.eq("status", daftar.saring.status);
    }
  }

  if (daftar.cari) {
    const pola = polaCari(daftar.cari);
    masukQuery = masukQuery.ilike("subject", pola);
    keluarQuery = keluarQuery.ilike("subject", pola);
  }

  const [incomingResult, outgoingResult, membersResult, documentsResult] =
    await Promise.all([
      masukQuery
        .order("received_date", { ascending: false })
        .order("id", { ascending: true })
        .range(daftar.dari, daftar.sampai),

      keluarQuery
        .order("letter_date", { ascending: false })
        .order("id", { ascending: true })
        .range(daftar.dari, daftar.sampai),

      supabase
        .from("members")
        .select("id, full_name")
        .eq("organization_id", context.organizationId)
        .is("deleted_at", null)
        .order("full_name"),

      supabase
        .from("documents")
        .select("id, title, category")
        .eq("organization_id", context.organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  type OutgoingQueryRow = {
    id: string;
    letter_number: string;
    recipient: string;
    subject: string;
    letter_date: string;
    signer_member_id: string | null;
    status: string;
    document_id: string | null;
    notes: string | null;
    members: { full_name: string } | null;
  };

  const incoming: IncomingRow[] = (incomingResult.data ?? []).map((row) => ({
    id: row.id,
    letterNumber: row.letter_number,
    sender: row.sender,
    subject: row.subject,
    letterDate: row.letter_date,
    receivedDate: row.received_date,
    status: row.status,
    documentId: row.document_id,
    notes: row.notes,
  }));

  const outgoing: OutgoingRow[] = (
    (outgoingResult.data as unknown as OutgoingQueryRow[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    letterNumber: row.letter_number,
    recipient: row.recipient,
    subject: row.subject,
    letterDate: row.letter_date,
    signerMemberId: row.signer_member_id,
    signerName: row.members?.full_name ?? null,
    status: row.status,
    documentId: row.document_id,
    notes: row.notes,
  }));

  const opsiAnggota = (
    (membersResult.data as { id: string; full_name: string }[] | null) ?? []
  ).map((member) => ({ id: member.id, label: member.full_name }));
  const opsiDokumen = (
    (documentsResult.data as { id: string; title: string }[] | null) ?? []
  ).map((document) => ({ id: document.id, label: document.title }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surat"
        description="Arsip surat masuk dan surat keluar organisasi."
        actions={
          <>
            {can(context, PERMISSIONS.letters.export) ? (
              <ExportButton
                label={
                  activeTab === "keluar"
                    ? "Ekspor Surat Keluar"
                    : "Ekspor Surat Masuk"
                }
                action={exportLetters.bind(
                  null,
                  context.organizationId,
                  activeTab === "keluar" ? "outgoing" : "incoming",
                  {},
                )}
              />
            ) : null}

            {can(context, PERMISSIONS.letters.create) ? (
              <LetterCreateDialog
                organizationId={context.organizationId}
                activeTab={activeTab}
                memberOptions={opsiAnggota}
                documentOptions={opsiDokumen}
              />
            ) : null}
          </>
        }
      />

      <LetterTabs
        organizationId={context.organizationId}
        activeTab={activeTab}
        daftar={{
          cari: daftar.cari,
          status: daftar.saring.status,
          statusOptions: activeTab === "keluar" ? STATUS_KELUAR : STATUS_MASUK,
          halaman: daftar.halaman,
          totalMasuk: incomingResult.count ?? 0,
          totalKeluar: outgoingResult.count ?? 0,
          ukuranHalaman: UKURAN_HALAMAN,
        }}
        incoming={incoming}
        outgoing={outgoing}
        memberOptions={opsiAnggota}
        documentOptions={opsiDokumen}
        permissions={{
          canCreate: can(context, PERMISSIONS.letters.create),
          canEdit: can(context, PERMISSIONS.letters.edit),
          canApprove: can(context, PERMISSIONS.letters.approve),
          canDelete: can(context, PERMISSIONS.letters.delete),
        }}
      />
    </div>
  );
}
