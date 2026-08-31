import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { exportTransactions } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import {
  TransactionManager,
  type TransactionRow,
} from "@/features/finance/components/transaction-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Transaksi Keuangan",
};

const PAGE_SIZE = 25;

type Filters = {
  jenis?: string;
  akun?: string;
  kategori?: string;
  status?: string;
  mulai?: string;
  sampai?: string;
  cari?: string;
  hal?: string;
};

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
  searchParams: Promise<Filters>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  const filters = await searchParams;
  const canViewProofs = can(context, PERMISSIONS.finance.viewProofs);
  const page = Math.max(1, Number(filters.hal ?? "1") || 1);
  const from = (page - 1) * PAGE_SIZE;

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

  if (filters.jenis) query = query.eq("transaction_type", filters.jenis);
  if (filters.akun) query = query.eq("account_id", filters.akun);
  if (filters.kategori) query = query.eq("category_id", filters.kategori);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.mulai) query = query.gte("transaction_date", filters.mulai);
  if (filters.sampai) query = query.lte("transaction_date", filters.sampai);
  if (filters.cari) {
    const escaped = filters.cari.replace(/[%_,()\\]/g, (m) => `\\${m}`);
    query = query.or(
      `description.ilike.%${escaped}%,reference_number.ilike.%${escaped}%`,
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
      .range(from, from + PAGE_SIZE - 1),

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
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const accounts =
    (accountsResult.data as
      { id: string; name: string; is_active: boolean }[] | null) ?? [];
  const categories =
    (categoriesResult.data as
      | { id: string; name: string; type: string; is_active: boolean }[]
      | null) ?? [];

  function pageHref(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && key !== "hal") params.set(key, value);
    }
    params.set("hal", String(target));
    return `/keuangan/transaksi?${params.toString()}` as Route;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transaksi Keuangan"
        description="Draf belum mempengaruhi saldo. Transaksi yang sudah diposting tidak dapat disunting maupun dihapus."
        actions={
          can(context, PERMISSIONS.finance.export) ? (
            <ExportButton
              action={exportTransactions.bind(null, context.organizationId, {
                type: filters.jenis,
                accountId: filters.akun,
                categoryId: filters.kategori,
                status: filters.status,
                start: filters.mulai,
                end: filters.sampai,
                search: filters.cari,
              })}
            />
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-2.5">
        <input
          type="search"
          name="cari"
          placeholder="Cari keterangan / referensi"
          defaultValue={filters.cari ?? ""}
          aria-label="Cari transaksi"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-56"
        />

        <select
          name="jenis"
          defaultValue={filters.jenis ?? ""}
          aria-label="Filter jenis"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua jenis</option>
          <option value="INCOME">Pemasukan</option>
          <option value="EXPENSE">Pengeluaran</option>
        </select>

        <select
          name="status"
          defaultValue={filters.status ?? ""}
          aria-label="Filter status"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua status</option>
          <option value="DRAFT">Draf</option>
          <option value="POSTED">Diposting</option>
          <option value="VOID">Dibatalkan</option>
        </select>

        <select
          name="akun"
          defaultValue={filters.akun ?? ""}
          aria-label="Filter akun"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Semua akun</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="mulai"
          defaultValue={filters.mulai ?? ""}
          aria-label="Tanggal mulai"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          type="date"
          name="sampai"
          defaultValue={filters.sampai ?? ""}
          aria-label="Tanggal sampai"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <button
          type="submit"
          className="h-10 rounded-md border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Terapkan
        </button>
      </form>

      <TransactionManager
        organizationId={context.organizationId}
        transactions={transactions}
        accountOptions={accounts
          .filter((account) => account.is_active)
          .map((account) => ({ id: account.id, label: account.name }))}
        categoryOptions={categories
          .filter((category) => category.is_active)
          .map((category) => ({
            id: category.id,
            label: category.name,
            type: category.type,
          }))}
        periodOptions={(
          (periodsResult.data as { id: string; name: string }[] | null) ?? []
        ).map((period) => ({ id: period.id, label: period.name }))}
        documentOptions={(
          (documentsResult.data as { id: string; title: string }[] | null) ?? []
        ).map((document) => ({ id: document.id, label: document.title }))}
        permissions={{
          canCreate: can(context, PERMISSIONS.finance.create),
          canEdit: can(context, PERMISSIONS.finance.edit),
          canPost: can(context, PERMISSIONS.finance.post),
          canVoid: can(context, PERMISSIONS.finance.void),
          canDelete: can(context, PERMISSIONS.finance.delete),
          canViewProofs,
        }}
      />

      {total > PAGE_SIZE ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-[13px] text-muted-foreground">
            Menampilkan {formatNumber(from + 1)}–
            {formatNumber(Math.min(from + PAGE_SIZE, total))} dari{" "}
            {formatNumber(total)} transaksi
          </p>

          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="h-9 rounded-md border border-border px-3 text-[13px] leading-9 font-medium text-foreground transition-colors hover:bg-muted"
              >
                Sebelumnya
              </Link>
            ) : null}

            <span className="text-[13px] text-muted-foreground">
              {page} / {lastPage}
            </span>

            {page < lastPage ? (
              <Link
                href={pageHref(page + 1)}
                className="h-9 rounded-md border border-border px-3 text-[13px] leading-9 font-medium text-foreground transition-colors hover:bg-muted"
              >
                Berikutnya
              </Link>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
