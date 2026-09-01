import type { Metadata } from "next";

import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { exportTransactions } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import {
  TransactionCreateDialog,
  TransactionManager,
  type TransactionRow,
} from "@/features/finance/components/transaction-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { bacaParamDaftar, polaCariOr } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Transaksi Keuangan",
};

const UKURAN_HALAMAN = 25;

/**
 * Daftar transaksi.
 *
 * Seluruh penyaringan, pengurutan, dan pemenggalan halaman terjadi di
 * database. Ledger tidak pernah diambil utuh ke peramban — bukan hanya karena
 * berat, tetapi karena baris yang dikirim ke sana sudah terkirim, betapapun
 * rapi disembunyikannya.
 */
export default async function FinanceTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  /*
   * Parameter daftar dibaca pembaca bersama, sama seperti sembilan halaman
   * manajemen lain — termasuk nama kuncinya: `search` dan `page`, bukan `cari`
   * dan `hal`. Bukan soal selera penamaan: `TableToolbar` mengosongkan `page`
   * setiap kali penyaringnya berubah, dan halaman yang memakai nama lain akan
   * meninggalkan nomor halaman lama lalu memperlihatkan tabel kosong.
   *
   * `mulai` dan `sampai` ikut sebagai kunci saring biasa; keduanya tanggal,
   * dan `bacaParamDaftar` hanya membersihkan nilainya tanpa menafsirkan.
   */
  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["jenis", "akun", "kategori", "status", "mulai", "sampai"],
  });
  const saring = daftar.saring;

  const canViewProofs = can(context, PERMISSIONS.finance.viewProofs);

  const supabase = await createClient();

  let query = supabase
    .from("financial_transactions")
    .select(
      `
      id, transaction_type, account_id, category_id, transaction_date, amount,
      description, reference_number, organization_period_id, proof_document_id,
      status, void_reason,
      financial_accounts!financial_transactions_account_fk ( name ),
      financial_categories!financial_transactions_category_fk ( name )
    `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId);

  if (saring.jenis) query = query.eq("transaction_type", saring.jenis);
  if (saring.akun) query = query.eq("account_id", saring.akun);
  if (saring.kategori) query = query.eq("category_id", saring.kategori);
  if (saring.status) query = query.eq("status", saring.status);
  if (saring.mulai) query = query.gte("transaction_date", saring.mulai);
  if (saring.sampai) query = query.lte("transaction_date", saring.sampai);
  if (daftar.cari) {
    // `polaCariOr`, bukan escaping tersendiri: koma dan kurung diurai
    // PostgREST sebelum SQL melihatnya, jadi keduanya harus DIBUANG dan bukan
    // di-escape. Aturan itu tinggal di satu tempat sekarang.
    const pola = polaCariOr(daftar.cari);
    query = query.or(
      `description.ilike.%${pola}%,reference_number.ilike.%${pola}%`,
    );
  }

  const [
    listResult,
    accountsResult,
    categoriesResult,
    periodsResult,
    documentsResult,
  ] = await Promise.all([
    query
      // Urutan deterministik: tanggal bisnis lebih dulu, lalu waktu
      // pencatatan sebagai pemecah seri.
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(daftar.dari, daftar.sampai),

    supabase
      .from("financial_accounts")
      .select("id, name, is_active")
      .eq("organization_id", context.organizationId)
      .order("name"),

    supabase
      .from("financial_categories")
      .select("id, name, type, is_active")
      .eq("organization_id", context.organizationId)
      .order("name"),

    supabase
      .from("organization_periods")
      .select("id, name")
      .eq("organization_id", context.organizationId)
      .order("start_date", { ascending: false }),

    // Daftar dokumen hanya diambil bila pemanggil berhak menyentuh bukti.
    // Tanpa pagar ini, judul dan id seluruh dokumen organisasi ikut terkirim
    // ke browser sebagai pilihan yang tidak akan pernah ditampilkan — dan
    // "tidak ditampilkan" bukan "tidak terkirim".
    canViewProofs
      ? supabase
          .from("documents")
          .select("id, title")
          .eq("organization_id", context.organizationId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  type Row = {
    id: string;
    transaction_type: string;
    account_id: string;
    category_id: string | null;
    transaction_date: string;
    amount: number;
    description: string;
    reference_number: string | null;
    organization_period_id: string | null;
    proof_document_id: string | null;
    status: string;
    void_reason: string | null;
    financial_accounts: { name: string } | null;
    financial_categories: { name: string } | null;
  };

  const transactions: TransactionRow[] = (
    (listResult.data as unknown as Row[] | null) ?? []
  ).map((row) => ({
    id: row.id,
    transactionType: row.transaction_type,
    accountId: row.account_id,
    accountName: row.financial_accounts?.name ?? "—",
    categoryId: row.category_id,
    categoryName: row.financial_categories?.name ?? null,
    transactionDate: row.transaction_date,
    amount: row.amount,
    description: row.description,
    referenceNumber: row.reference_number,
    periodId: row.organization_period_id,
    hasProof: row.proof_document_id !== null,
    // Id dokumennya hanya dikirim kepada yang memang berhak menyentuh bukti.
    proofDocumentId: canViewProofs ? row.proof_document_id : null,
    status: row.status,
    voidReason: row.void_reason,
  }));

  const total = listResult.count ?? 0;

  const accounts =
    (accountsResult.data as
      { id: string; name: string; is_active: boolean }[] | null) ?? [];
  const categories =
    (categoriesResult.data as
      | { id: string; name: string; type: string; is_active: boolean }[]
      | null) ?? [];

  const opsiAkun = accounts
    .filter((account) => account.is_active)
    .map((account) => ({ id: account.id, label: account.name }));
  const opsiKategori = categories
    .filter((category) => category.is_active)
    .map((category) => ({
      id: category.id,
      label: category.name,
      type: category.type,
    }));
  const opsiPeriode = (
    (periodsResult.data as { id: string; name: string }[] | null) ?? []
  ).map((period) => ({ id: period.id, label: period.name }));
  const opsiDokumen = (
    (documentsResult.data as { id: string; title: string }[] | null) ?? []
  ).map((document) => ({ id: document.id, label: document.title }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transaksi Keuangan"
        description="Draf belum mempengaruhi saldo. Transaksi yang sudah diposting tidak dapat disunting maupun dihapus."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {can(context, PERMISSIONS.finance.export) ? (
              <ExportButton
                action={exportTransactions.bind(null, context.organizationId, {
                  type: saring.jenis || undefined,
                  accountId: saring.akun || undefined,
                  categoryId: saring.kategori || undefined,
                  status: saring.status || undefined,
                  start: saring.mulai || undefined,
                  end: saring.sampai || undefined,
                  search: daftar.cari || undefined,
                })}
              />
            ) : null}

            {can(context, PERMISSIONS.finance.create) ? (
              <TransactionCreateDialog
                organizationId={context.organizationId}
                accountOptions={opsiAkun}
                categoryOptions={opsiKategori}
                periodOptions={opsiPeriode}
                documentOptions={opsiDokumen}
                canViewProofs={canViewProofs}
              />
            ) : null}
          </div>
        }
      />

      {/*
        Satu kartu: toolbar, tabel, kaki halaman. Sebelumnya ketiganya tiga
        blok terpisah — form penyaring telanjang, tabel, lalu kartu pagination
        tersendiri — dan halaman Transaksi menjadi satu-satunya halaman daftar
        yang tidak terbaca sebagai satu benda.
      */}
      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari keterangan atau nomor referensi…"
          searchLabel="Cari transaksi"
          filters={[
            {
              key: "jenis",
              size: "xs",
              label: "Saring menurut jenis",
              value: saring.jenis,
              allLabel: "Semua jenis",
              options: [
                { value: "INCOME", label: "Pemasukan" },
                { value: "EXPENSE", label: "Pengeluaran" },
              ],
            },
            {
              key: "status",
              size: "xs",
              label: "Saring menurut status",
              value: saring.status,
              allLabel: "Semua status",
              options: [
                { value: "DRAFT", label: "Draf" },
                { value: "POSTED", label: "Diposting" },
                { value: "VOID", label: "Dibatalkan" },
              ],
            },
            {
              key: "akun",
              size: "sm",
              label: "Saring menurut akun",
              value: saring.akun,
              allLabel: "Semua akun",
              options: accounts.map((account) => ({
                value: account.id,
                label: account.name,
              })),
            },
            {
              key: "kategori",
              size: "sm",
              label: "Saring menurut kategori",
              value: saring.kategori,
              allLabel: "Semua kategori",
              options: categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            },
          ]}
          dateFilters={[
            { key: "mulai", label: "Tanggal mulai", value: saring.mulai },
            { key: "sampai", label: "Tanggal sampai", value: saring.sampai },
          ]}
        />

        <TransactionManager
          organizationId={context.organizationId}
          transactions={transactions}
          accountOptions={opsiAkun}
          categoryOptions={opsiKategori}
          periodOptions={opsiPeriode}
          documentOptions={opsiDokumen}
          permissions={{
            canCreate: can(context, PERMISSIONS.finance.create),
            canEdit: can(context, PERMISSIONS.finance.edit),
            canPost: can(context, PERMISSIONS.finance.post),
            canVoid: can(context, PERMISSIONS.finance.void),
            canDelete: can(context, PERMISSIONS.finance.delete),
            canViewProofs,
          }}
          disaring={
            daftar.cari !== "" ||
            Object.values(saring).some((nilai) => nilai !== "")
          }
        />

        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(1, Math.ceil(total / UKURAN_HALAMAN))}
          total={total}
          pageSize={UKURAN_HALAMAN}
        />
      </Card>
    </div>
  );
}
