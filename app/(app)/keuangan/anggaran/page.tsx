import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import {
  BudgetCreateDialog,
  BudgetManager,
  type BudgetItemRow,
  type BudgetRow,
} from "@/features/finance/components/budget-panels";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Anggaran",
};

type VsActual = {
  items: {
    item_id: string;
    name: string;
    category_id: string | null;
    category_name: string | null;
    planned: number;
    actual: number;
  }[];
  total_planned: number;
  total_actual: number;
};

export default async function FinanceBudgetsPage() {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.finance.view)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const [budgetsResult, periodsResult, categoriesResult] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        `
        id, name, description, status, start_date, end_date,
        organization_periods!budgets_period_fk ( name )
      `,
      )
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false }),

    supabase
      .from("organization_periods")
      .select("id, name, status")
      .eq("organization_id", context.organizationId)
      .order("start_date", { ascending: false }),

    supabase
      .from("financial_categories")
      .select("id, name")
      .eq("organization_id", context.organizationId)
      .eq("type", "EXPENSE")
      .eq("is_active", true)
      .order("name"),
  ]);

  type BudgetQueryRow = {
    id: string;
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    organization_periods: { name: string } | null;
  };

  const rows = (budgetsResult.data as unknown as BudgetQueryRow[] | null) ?? [];

  const comparisons = await Promise.all(
    rows.map((row) =>
      supabase.rpc("mipnu_budget_vs_actual", { p_budget_id: row.id }),
    ),
  );

  const budgets: BudgetRow[] = rows.map((row, index) => {
    const comparison = comparisons[index]!.data as unknown as VsActual | null;

    const items: BudgetItemRow[] = (comparison?.items ?? []).map((item) => ({
      id: item.item_id,
      name: item.name,
      categoryId: item.category_id,
      categoryName: item.category_name,
      plannedAmount: item.planned,
      actualAmount: item.actual,
    }));

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      periodName: row.organization_periods?.name ?? "—",
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      items,
      totalPlanned: comparison?.total_planned ?? 0,
      totalActual: comparison?.total_actual ?? 0,
    };
  });

  const opsiPeriode = (
    (periodsResult.data as
      { id: string; name: string; status: string }[] | null) ?? []
  ).map((period) => ({
    id: period.id,
    label: period.status === "ACTIVE" ? `${period.name} (aktif)` : period.name,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Anggaran"
        description="Rencana anggaran per periode, dibandingkan dengan pengeluaran yang sudah diposting."
        actions={
          can(context, PERMISSIONS.finance.manageBudgets) ? (
            <BudgetCreateDialog
              organizationId={context.organizationId}
              periodOptions={opsiPeriode}
            />
          ) : null
        }
      />

      <BudgetManager
        organizationId={context.organizationId}
        budgets={budgets}
        expenseCategories={(
          (categoriesResult.data as { id: string; name: string }[] | null) ?? []
        ).map((category) => ({ id: category.id, label: category.name }))}
        permissions={{
          canManage: can(context, PERMISSIONS.finance.manageBudgets),
          canApprove: can(context, PERMISSIONS.finance.approve),
        }}
      />
    </div>
  );
}
