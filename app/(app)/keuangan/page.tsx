import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatRupiah, formatShortDate } from "@/lib/format";
import { transactionStatus, transactionType } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Ringkasan Keuangan",
};

type AccountBalance = {
  account_id: string;
  name: string;
  is_active: boolean;
  balance: number;
};

type Summary = {
  opening: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
  transaction_count: number;
};

/**
 * Ringkasan keuangan.
 *
 * Seluruh angka berasal dari RPC yang menjumlah di database. Tidak ada
 * transaksi yang diambil ke sini untuk dijumlahkan di JavaScript — ledger
 * organisasi yang berjalan bertahun-tahun tidak muat, dan saldo yang dihitung
 * di peramban tidak dapat dipertanggungjawabkan.
 */
export default async function FinanceOverviewPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const [balancesResult, summaryResult, recentResult] = await Promise.all([
    supabase.rpc("mipnu_account_balances", {
      p_organization_id: context.organizationId,
    }),
    supabase.rpc("mipnu_finance_summary", {
      p_organization_id: context.organizationId,
    }),
    supabase
      .from("financial_transactions")
      .select(
        `
        id, transaction_type, amount, transaction_date, description, status,
        financial_accounts!financial_transactions_account_fk ( name )
      `,
      )
      .eq("organization_id", context.organizationId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const balances =
    (balancesResult.data as unknown as AccountBalance[] | null) ?? [];
  const summary = summaryResult.data as unknown as Summary | null;

  type RecentRow = {
    id: string;
    transaction_type: string;
    amount: number;
    transaction_date: string;
    description: string;
    status: string;
    financial_accounts: { name: string } | null;
  };

  const recent = (recentResult.data as unknown as RecentRow[] | null) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ringkasan Keuangan"
        description="Saldo kas organisasi. Hanya transaksi yang sudah diposting yang dihitung."
        actions={
          <Button variant="outline" asChild>
            <Link href="/keuangan/transaksi">Lihat Transaksi</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saldo Kas"
          value={formatRupiah(summary?.closing ?? 0)}
          context={`${summary?.transaction_count ?? 0} transaksi diposting`}
          icon={Wallet}
        />
        <StatCard
          label="Total Pemasukan"
          value={formatRupiah(summary?.income ?? 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Total Pengeluaran"
          value={formatRupiah(summary?.expense ?? 0)}
          icon={TrendingDown}
        />
        <StatCard
          label="Arus Kas Bersih"
          value={formatRupiah(summary?.net ?? 0)}
          context="Pemasukan dikurangi pengeluaran"
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo per Akun Kas</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/keuangan/akun">Kelola</Link>
          </Button>
        </CardHeader>

        <CardContent>
          {balances.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Belum ada akun kas. Buat satu di menu Akun Kas sebelum mencatat
              transaksi.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {balances.map((account) => (
                <li
                  key={account.account_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Landmark
                      size={15}
                      className="shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm text-foreground">
                      {account.name}
                    </span>
                    {account.is_active ? null : (
                      <Badge tone="neutral">Nonaktif</Badge>
                    )}
                  </span>

                  <span className="text-sm font-medium text-foreground">
                    {formatRupiah(account.balance)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaksi Terbaru</CardTitle>
        </CardHeader>

        <CardContent>
          {recent.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Belum ada transaksi yang dicatat.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((row) => {
                const status = transactionStatus(row.status);
                const isIncome = row.transaction_type === "INCOME";

                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {row.description}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {formatShortDate(row.transaction_date)} ·{" "}
                        {row.financial_accounts?.name ?? "—"} ·{" "}
                        {transactionType(row.transaction_type).label}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge tone={status.tone}>{status.label}</Badge>
                      <span
                        className={
                          row.status === "VOID"
                            ? "text-sm text-muted-foreground line-through"
                            : isIncome
                              ? "text-sm font-medium text-success"
                              : "text-sm font-medium text-destructive"
                        }
                      >
                        {isIncome ? "+" : "−"}
                        {formatRupiah(row.amount)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
