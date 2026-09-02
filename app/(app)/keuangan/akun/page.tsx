import type { Metadata } from "next";

import { TableToolbar } from "@/components/data-table/toolbar";
import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import {
  AccountCreateDialog,
  AccountManager,
  CategoryCreateDialog,
  CategoryManager,
  type AccountRow,
  type CategoryRow,
} from "@/features/finance/components/account-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { polaCari } from "@/lib/list-params";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Akun Kas",
};

type Balance = {
  account_id: string;
  balance: number;
};

export default async function FinanceAccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const satu = (nilai: string | string[] | undefined) =>
    typeof nilai === "string" ? nilai.trim() : "";

  const cariAkun = satu(params.cariAkun);
  const statusAkun = satu(params.statusAkun);
  const cariKategori = satu(params.cariKategori);
  const jenisKategori = satu(params.jenisKategori);

  const supabase = await createClient();

  let queryAkun = supabase
    .from("financial_accounts")
    .select("id, name, description, account_type, opening_balance, is_active")
    .eq("organization_id", context.organizationId);

  if (cariAkun) queryAkun = queryAkun.ilike("name", polaCari(cariAkun));
  if (statusAkun === "aktif" || statusAkun === "nonaktif") {
    queryAkun = queryAkun.eq("is_active", statusAkun === "aktif");
  }

  let queryKategori = supabase
    .from("financial_categories")
    .select("id, name, type, description, is_active")
    .eq("organization_id", context.organizationId);

  if (cariKategori)
    queryKategori = queryKategori.ilike("name", polaCari(cariKategori));
  if (jenisKategori === "INCOME" || jenisKategori === "EXPENSE") {
    queryKategori = queryKategori.eq("type", jenisKategori);
  }

  const [accountsResult, categoriesResult, balancesResult] = await Promise.all([
    queryAkun.order("name"),
    queryKategori.order("type").order("name"),
    supabase.rpc("mipnu_account_balances", {
      p_organization_id: context.organizationId,
    }),
  ]);

  const balanceByAccount = new Map(
    ((balancesResult.data as unknown as Balance[] | null) ?? []).map((row) => [
      row.account_id,
      row.balance,
    ]),
  );

  const accounts: AccountRow[] = (accountsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    accountType: row.account_type,
    openingBalance: row.opening_balance,
    isActive: row.is_active,
    balance: balanceByAccount.get(row.id) ?? row.opening_balance,
  }));

  const categories: CategoryRow[] = (categoriesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      isActive: row.is_active,
    }),
  );

  const bolehKelolaAkun = can(context, PERMISSIONS.finance.manageAccounts);
  const bolehKelolaKategori = can(
    context,
    PERMISSIONS.finance.manageCategories,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Akun Kas & Kategori"
        description="Data acuan keuangan. Akun dan kategori dinonaktifkan, tidak dihapus, agar transaksi lama tetap dapat dibaca."
      />

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-foreground">
            Akun Kas
          </h2>
          {bolehKelolaAkun ? (
            <AccountCreateDialog organizationId={context.organizationId} />
          ) : null}
        </div>

        <TableToolbar
          searchKey="cariAkun"
          searchValue={cariAkun}
          searchPlaceholder="Cari akun kas…"
          searchLabel="Cari akun kas"
          filters={[
            {
              key: "statusAkun",
              label: "Saring akun menurut status",
              value: statusAkun,
              allLabel: "Semua status",
              options: [
                { value: "aktif", label: "Aktif" },
                { value: "nonaktif", label: "Nonaktif" },
              ],
            },
          ]}
        />

        <AccountManager
          organizationId={context.organizationId}
          accounts={accounts}
          canManage={bolehKelolaAkun}
          disaring={cariAkun !== "" || statusAkun !== ""}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold text-foreground">
            Kategori
          </h2>
          {bolehKelolaKategori ? (
            <CategoryCreateDialog organizationId={context.organizationId} />
          ) : null}
        </div>

        <TableToolbar
          searchKey="cariKategori"
          searchValue={cariKategori}
          searchPlaceholder="Cari kategori…"
          searchLabel="Cari kategori"
          filters={[
            {
              key: "jenisKategori",
              label: "Saring kategori menurut jenis",
              value: jenisKategori,
              allLabel: "Semua jenis",
              options: [
                { value: "INCOME", label: "Pemasukan" },
                { value: "EXPENSE", label: "Pengeluaran" },
              ],
            },
          ]}
        />

        <CategoryManager
          organizationId={context.organizationId}
          categories={categories}
          canManage={bolehKelolaKategori}
          disaring={cariKategori !== "" || jenisKategori !== ""}
        />
      </Card>
    </div>
  );
}
