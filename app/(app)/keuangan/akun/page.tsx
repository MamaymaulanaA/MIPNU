import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AccountManager,
  CategoryManager,
  type AccountRow,
  type CategoryRow,
} from "@/features/finance/components/account-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Akun Kas",
};

type Balance = {
  account_id: string;
  balance: number;
};

/**
 * Akun kas dan kategori dalam satu halaman.
 *
 * Keduanya adalah data acuan yang jarang berubah dan hampir selalu disiapkan
 * bersamaan sebelum transaksi pertama dicatat. Memisahkannya menjadi dua menu
 * hanya menambah tempat tanpa menambah kejelasan.
 */
export default async function FinanceAccountsPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const [accountsResult, categoriesResult, balancesResult] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("id, name, description, account_type, opening_balance, is_active")
      .eq("organization_id", context.organizationId)
      .order("name"),

    supabase
      .from("financial_categories")
      .select("id, name, type, description, is_active")
      .eq("organization_id", context.organizationId)
      .order("type")
      .order("name"),

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Akun Kas & Kategori"
        description="Data acuan keuangan. Akun dan kategori dinonaktifkan, tidak dihapus, agar transaksi lama tetap dapat dibaca."
      />

      <Card>
        <CardHeader>
          <CardTitle>Akun Kas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountManager
            organizationId={context.organizationId}
            accounts={accounts}
            canManage={can(context, PERMISSIONS.finance.manageAccounts)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kategori</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CategoryManager
            organizationId={context.organizationId}
            categories={categories}
            canManage={can(context, PERMISSIONS.finance.manageCategories)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
