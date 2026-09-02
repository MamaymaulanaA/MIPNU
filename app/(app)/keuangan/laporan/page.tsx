import type { Metadata } from "next";

import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";

import { TableToolbar } from "@/components/data-table/toolbar";
import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (
    !context.organizationId ||
    !can(context, PERMISSIONS.finance.viewReports)
  ) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const satu = (nilai: string | string[] | undefined) =>
    typeof nilai === "string" ? nilai.trim() : "";

  const mulai = satu(params.mulai);
  const sampai = satu(params.sampai);
  const akun = satu(params.akun);

  const supabase = await createClient();

  // Rentang tanggal divalidasi di server; RPC menolaknya sekali lagi.
  const invalidRange = Boolean(
    mulai && sampai && Date.parse(mulai) > Date.parse(sampai),
  );

  const [summaryResult, accountsResult] = await Promise.all([
    invalidRange
      ? Promise.resolve({ data: null })
      : supabase.rpc("mipnu_finance_summary", {
          p_organization_id: context.organizationId,
          p_start: mulai || undefined,
          p_end: sampai || undefined,
          p_account_id: akun || undefined,
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

  const akunOptions = (
    (accountsResult.data as { id: string; name: string }[] | null) ?? []
  ).map((account) => ({ value: account.id, label: account.name }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Keuangan"
        description="Arus kas, rekap per kategori, dan rincian transaksi pada rentang yang dipilih."
        actions={
          can(context, PERMISSIONS.finance.export) ? (
            <ExportButton
              action={exportTransactions.bind(null, context.organizationId, {
                start: mulai || undefined,
                end: sampai || undefined,
                accountId: akun || undefined,
                status: "POSTED",
              })}
              label="Ekspor Transaksi"
            />
          ) : null
        }
      />

      {/*
        SATU kartu: penyaring, arus kas, dan catatannya.

        Sebelumnya ketiganya tiga blok terpisah — kartu penyaring setinggi 87px
        yang isinya menumpuk di kiri dan menyisakan 790px kosong, lalu kisi
        kartu statistik telanjang, lalu satu paragraf yang mengambang sendiri
        di antara kartu. Diukur di peramban: lima blok tingkat atas dengan
        satu di antaranya bukan kartu sama sekali.

        Penyaringnya memang menyaring arus kas ini, jadi ia menempel padanya —
        bentuk yang sama dengan toolbar di atas tabel pada halaman daftar.

        TANPA kotak pencarian: `mipnu_finance_summary()` menerima rentang
        tanggal dan akun, tidak ada argumen untuk kata pencarian, dan penyaring
        yang tidak didukung backend adalah penyaring palsu.
      */}
      <Card>
        <TableToolbar
          dateFilters={[
            { key: "mulai", label: "Tanggal mulai", value: mulai },
            { key: "sampai", label: "Tanggal sampai", value: sampai },
          ]}
          filters={[
            {
              key: "akun",
              label: "Saring menurut akun kas",
              value: akun,
              allLabel: "Semua akun",
              options: akunOptions,
            },
          ]}
        />

        {invalidRange ? (
          <p className="p-4 text-[13px] text-destructive sm:p-5">
            Tanggal awal tidak boleh melewati tanggal akhir.
          </p>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            {/*
              Arus kas sebagai kartu statistik, bukan daftar definisi. Empat
              angka inilah alasan halaman ini dibuka; sebelumnya keempatnya
              berbaris sebagai `<dl>` setinggi satu baris — terbaca sebagai
              catatan kaki, bukan sebagai jawaban. Komponennya sama dengan
              halaman Ringkasan, jadi angka yang sama terbaca dengan cara yang
              sama di dua tempat.
            */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Saldo Awal"
                value={formatRupiah(summary?.opening ?? 0)}
                context="Sebelum rentang ini"
                icon={Landmark}
              />
              <StatCard
                label="Pemasukan"
                value={formatRupiah(summary?.income ?? 0)}
                context="Diposting pada rentang ini"
                icon={ArrowDownLeft}
                tone="success"
              />
              <StatCard
                label="Pengeluaran"
                value={formatRupiah(summary?.expense ?? 0)}
                context="Diposting pada rentang ini"
                icon={ArrowUpRight}
                tone="destructive"
              />
              <StatCard
                label="Saldo Akhir"
                value={formatRupiah(summary?.closing ?? 0)}
                context={`${formatNumber(summary?.transaction_count ?? 0)} transaksi diposting`}
                icon={Wallet}
                tone="primary"
              />
            </div>

            <p className="text-[13px] text-muted-foreground">
              Draf dan transaksi yang dibatalkan tidak ikut dihitung.
            </p>
          </div>
        )}
      </Card>

      {invalidRange ? null : (
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
      )}
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
    // Kepala kartu memakai garis pemisah dan padding yang sama dengan kepala
    // toolbar di halaman daftar, bukan `CardHeader` — supaya tabel di
    // bawahnya menempel pada kepalanya persis seperti pada halaman Transaksi.
    <Card>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
      </div>

      {lines.length === 0 ? (
        <p className="p-4 text-[13px] text-muted-foreground sm:p-5">
          {emptyLabel}
        </p>
      ) : (
        <TableScroll bounded>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Kategori</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Transaksi
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Total</TableHeaderCell>
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
    </Card>
  );
}
