import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
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
import { exportTransactions } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatNumber, formatRupiah } from "@/lib/format";
import { transactionType } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Laporan Keuangan",
};

type CategoryLine = {
  category_id: string | null;
  name: string;
  type: string;
  total: number;
  count: number;
};

type Summary = {
  opening: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
  transaction_count: number;
  categories: CategoryLine[];
};

/**
 * Laporan keuangan.
 *
 * Arus kas memakai definisi yang sama persis dengan dashboard dan halaman
 * ringkasan — karena ketiganya memanggil mipnu_finance_summary(), bukan
 * karena rumusnya disalin dengan hati-hati ke tiga tempat.
 *
 *     opening + posted income − posted expense = closing
 */
export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ mulai?: string; sampai?: string; akun?: string }>;
}) {
  const context = await requireAccessContext();

  if (
    !context.organizationId ||
    !can(context, PERMISSIONS.finance.viewReports)
  ) {
    return <ForbiddenState />;
  }

  const filters = await searchParams;
  const supabase = await createClient();

  // Rentang tanggal divalidasi di server; RPC menolaknya sekali lagi.
  const invalidRange = Boolean(
    filters.mulai &&
    filters.sampai &&
    Date.parse(filters.mulai) > Date.parse(filters.sampai),
  );

  const [summaryResult, accountsResult] = await Promise.all([
    invalidRange
      ? Promise.resolve({ data: null })
      : supabase.rpc("mipnu_finance_summary", {
          p_organization_id: context.organizationId,
          p_start: filters.mulai || undefined,
          p_end: filters.sampai || undefined,
          p_account_id: filters.akun || undefined,
        }),

    supabase
      .from("financial_accounts")
      .select("id, name")
      .eq("organization_id", context.organizationId)
      .order("name"),
  ]);

  const summary = summaryResult.data as unknown as Summary | null;
  const categories = summary?.categories ?? [];

  const income = categories.filter((line) => line.type === "INCOME");
  const expense = categories.filter((line) => line.type === "EXPENSE");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Keuangan"
        description="Arus kas, rekap per kategori, dan rincian transaksi pada rentang yang dipilih."
        actions={
          can(context, PERMISSIONS.finance.export) ? (
            <ExportButton
              action={exportTransactions.bind(null, context.organizationId, {
                start: filters.mulai,
                end: filters.sampai,
                accountId: filters.akun,
                status: "POSTED",
              })}
              label="Ekspor Transaksi"
            />
          ) : null
        }
      />

      <form className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          Dari
          <input
            type="date"
            name="mulai"
            defaultValue={filters.mulai ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          Sampai
          <input
            type="date"
            name="sampai"
            defaultValue={filters.sampai ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="flex flex-col gap-1 text-[13px] text-muted-foreground">
          Akun
          <select
            name="akun"
            defaultValue={filters.akun ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Semua akun</option>
            {(
              (accountsResult.data as { id: string; name: string }[] | null) ??
              []
            ).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-10 rounded-md border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Terapkan
        </button>
      </form>

      {invalidRange ? (
        <Card>
          <CardContent>
            <p className="text-[13px] text-destructive">
              Tanggal awal tidak boleh melewati tanggal akhir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Arus Kas</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <Line label="Saldo awal" value={summary?.opening ?? 0} />
                <Line
                  label="Pemasukan"
                  value={summary?.income ?? 0}
                  tone="income"
                />
                <Line
                  label="Pengeluaran"
                  value={summary?.expense ?? 0}
                  tone="expense"
                />
                <Line
                  label="Saldo akhir"
                  value={summary?.closing ?? 0}
                  emphasis
                />
              </dl>

              <p className="mt-3 text-[13px] text-muted-foreground">
                {formatNumber(summary?.transaction_count ?? 0)} transaksi
                diposting pada rentang ini. Draf dan transaksi yang dibatalkan
                tidak ikut dihitung.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryCard
              title="Pemasukan per Kategori"
              lines={income}
              emptyLabel="Belum ada pemasukan pada rentang ini."
            />
            <CategoryCard
              title="Pengeluaran per Kategori"
              lines={expense}
              emptyLabel="Belum ada pengeluaran pada rentang ini."
            />
          </div>
        </>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: number;
  tone?: "income" | "expense";
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <dt
        className={
          emphasis
            ? "text-sm font-medium text-foreground"
            : "text-[13px] text-muted-foreground"
        }
      >
        {label}
      </dt>
      <dd
        className={
          tone === "income"
            ? "text-sm font-medium text-success"
            : tone === "expense"
              ? "text-sm font-medium text-destructive"
              : emphasis
                ? "text-base font-semibold text-foreground"
                : "text-sm font-medium text-foreground"
        }
      >
        {formatRupiah(value)}
      </dd>
    </div>
  );
}

function CategoryCard({
  title,
  lines,
  emptyLabel,
}: {
  title: string;
  lines: CategoryLine[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">{emptyLabel}</p>
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Kategori</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Transaksi
                  </TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    Total
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={`${line.type}-${line.category_id ?? "none"}`}>
                    <TableCell>
                      {line.name}
                      {line.category_id ? null : (
                        <Badge tone="neutral" className="ml-2">
                          {transactionType(line.type).label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatNumber(line.count)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatRupiah(line.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </CardContent>
    </Card>
  );
}
