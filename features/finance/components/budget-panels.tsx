"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  addBudgetItem,
  createBudget,
  removeBudgetItem,
  setBudgetStatus,
} from "@/features/finance/actions/manage-finance";
import { BUDGET_STATUSES } from "@/features/finance/schemas/finance.schema";
import { MoneyInput } from "@/features/finance/components/money-input";
import type { ActionResult } from "@/lib/errors";
import { formatRupiah } from "@/lib/format";
import { budgetStatus } from "@/lib/status";

export type BudgetItemRow = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  plannedAmount: number;
  actualAmount: number;
};

export type BudgetRow = {
  id: string;
  name: string;
  description: string | null;
  periodName: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  items: BudgetItemRow[];
  totalPlanned: number;
  totalActual: number;
};

export type BudgetOption = { id: string; label: string };

export type BudgetPermissions = {
  canManage: boolean;
  canApprove: boolean;
};

/**
 * Tombol "Tambah Anggaran" beserta dialognya.
 *
 * Di kepala halaman, sebaris dengan judul. Sebelumnya ia berdiri sebagai blok
 * 44px tersendiri di antara kepala halaman dan kartu anggaran — bukan bagian
 * dari keduanya, dan satu-satunya hal yang menempati baris itu.
 */
export function BudgetCreateDialog({
  organizationId,
  periodOptions,
}: {
  organizationId: string;
  periodOptions: BudgetOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={periodOptions.length === 0}
      >
        <Plus size={16} aria-hidden="true" />
        Tambah Anggaran
      </Button>

      <BudgetDialog
        key={open ? "bud-create-open" : "bud-create-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        periodOptions={periodOptions}
      />
    </>
  );
}

export function BudgetManager({
  organizationId,
  budgets,
  expenseCategories,
  permissions,
}: {
  organizationId: string;
  budgets: BudgetRow[];
  expenseCategories: BudgetOption[];
  permissions: BudgetPermissions;
}) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState<BudgetRow | null>(null);
  const [removing, setRemoving] = useState<{
    budgetId: string;
    item: BudgetItemRow;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada anggaran"
          description="Anggaran terikat pada periode kepengurusan. Rinciannya dibandingkan dengan pengeluaran yang sudah diposting."
        />
      ) : (
        <div className="space-y-4">
          {budgets.map((budget) => {
            const status = budgetStatus(budget.status);
            const isDraft = budget.status === "DRAFT";
            const sisa = budget.totalPlanned - budget.totalActual;

            return (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle>{budget.name}</CardTitle>
                    <p className="text-[13px] text-muted-foreground">
                      {budget.periodName}
                      {budget.startDate ? ` · mulai ${budget.startDate}` : ""}
                      {budget.endDate ? ` · sampai ${budget.endDate}` : ""}
                    </p>
                  </div>

                  {/*
                    Satu kontrol, bukan dua.

                    Sebelumnya lencana status DAN daftar pilihan status berdiri
                    berdampingan — keduanya menyebut hal yang sama, dan yang
                    kedua terbaca sebagai kotak isian selebar 128px di sudut
                    kepala kartu. Yang berhak mengubah status melihat daftarnya
                    saja; yang tidak berhak melihat lencananya saja.
                  */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {permissions.canApprove ? (
                      <Select
                        aria-label={`Status ${budget.name}`}
                        value={budget.status}
                        disabled={isPending}
                        className="h-9 w-auto text-[13px]"
                        onChange={(event) => {
                          const next = event.target.value as
                            "DRAFT" | "APPROVED" | "CLOSED";

                          startTransition(async () => {
                            const result = await setBudgetStatus(
                              organizationId,
                              budget.id,
                              next,
                            );
                            if (!result.success) {
                              showToast(result.error, "error");
                            }
                          });
                        }}
                      >
                        {BUDGET_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {budgetStatus(value).label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {budget.description ? (
                    <p className="text-[13px] text-muted-foreground">
                      {budget.description}
                    </p>
                  ) : null}

                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-[13px] text-muted-foreground">
                        Rencana
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {formatRupiah(budget.totalPlanned)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-muted-foreground">
                        Realisasi
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {formatRupiah(budget.totalActual)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[13px] text-muted-foreground">
                        Sisa
                      </dt>
                      <dd
                        className={
                          sisa < 0
                            ? "text-sm font-medium text-destructive"
                            : "text-sm font-medium text-foreground"
                        }
                      >
                        {formatRupiah(sisa)}
                      </dd>
                    </div>
                  </dl>

                  {budget.items.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      Belum ada rincian. Total anggaran dijumlahkan dari
                      rinciannya, jadi anggaran tanpa rincian bernilai nol.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {budget.items.map((item) => {
                        const lebih = item.actualAmount > item.plannedAmount;

                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground">
                                {item.name}
                              </p>
                              <p className="text-[13px] text-muted-foreground">
                                {item.categoryName ?? "Tanpa kategori"}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-[13px] text-muted-foreground">
                                {formatRupiah(item.plannedAmount)}
                              </span>
                              <span
                                className={
                                  lebih
                                    ? "text-[13px] font-medium text-destructive"
                                    : "text-[13px] font-medium text-foreground"
                                }
                              >
                                {formatRupiah(item.actualAmount)}
                              </span>

                              {permissions.canManage && isDraft ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Hapus rincian ${item.name}`}
                                  onClick={() =>
                                    setRemoving({
                                      budgetId: budget.id,
                                      item,
                                    })
                                  }
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                </Button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {permissions.canManage && isDraft ? (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAdding(budget)}
                      >
                        <Plus size={14} aria-hidden="true" />
                        Tambah Rincian
                      </Button>
                    </div>
                  ) : null}

                  {!isDraft ? (
                    <p className="text-[13px] text-muted-foreground">
                      Anggaran yang sudah disetujui tidak dapat diubah
                      rinciannya. Kembalikan ke draf bila memang perlu direvisi.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetItemDialog
        key={adding?.id ?? "item-closed"}
        open={Boolean(adding)}
        onClose={() => setAdding(null)}
        organizationId={organizationId}
        budgetId={adding?.id ?? null}
        expenseCategories={expenseCategories}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const target = removing;

          startTransition(async () => {
            const result = await removeBudgetItem(
              organizationId,
              target.budgetId,
              target.item.id,
            );
            setRemoving(null);
            showToast(
              result.success ? "Rincian dihapus." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive
        confirmLabel="Hapus"
        title={`Hapus rincian ${removing?.item.name ?? ""}?`}
        description="Total anggaran akan berkurang sebesar rincian ini."
      />
    </>
  );
}

/* ========================================================================== */

function BudgetDialog({
  open,
  onClose,
  organizationId,
  periodOptions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periodOptions: BudgetOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createBudget.bind(null, organizationId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Anggaran dibuat sebagai draf.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah Anggaran"
      description="Anggaran lahir sebagai draf. Rinciannya hanya dapat diubah selama masih draf."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Anggaran"
          htmlFor="bud-name"
          required
          hint="Contoh: RAPBO 2026–2028"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="bud-name"
            name="name"
            required
            maxLength={160}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Periode"
          htmlFor="bud-period"
          required
          error={fieldErrors?.organizationPeriodId?.[0]}
        >
          <Select
            id="bud-period"
            name="organizationPeriodId"
            required
            defaultValue={periodOptions[0]?.id ?? ""}
          >
            <option value="">Pilih periode</option>
            {periodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Mulai"
            htmlFor="bud-start"
            hint="Membatasi rentang realisasi."
          >
            <Input id="bud-start" name="startDate" type="date" />
          </Field>

          <Field
            label="Sampai"
            htmlFor="bud-end"
            error={fieldErrors?.endDate?.[0]}
          >
            <Input
              id="bud-end"
              name="endDate"
              type="date"
              aria-invalid={Boolean(fieldErrors?.endDate)}
            />
          </Field>
        </div>

        <Field label="Keterangan" htmlFor="bud-description">
          <Textarea
            id="bud-description"
            name="description"
            rows={2}
            maxLength={1000}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Tambah</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ========================================================================== */

function BudgetItemDialog({
  open,
  onClose,
  organizationId,
  budgetId,
  expenseCategories,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  budgetId: string | null;
  expenseCategories: BudgetOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(addBudgetItem.bind(null, organizationId, budgetId ?? ""), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Rincian ditambahkan.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah Rincian Anggaran"
      description="Realisasi dihitung dari pengeluaran berstatus diposting pada kategori yang sama."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Rincian"
          htmlFor="item-name"
          required
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="item-name"
            name="name"
            required
            maxLength={160}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field
          label="Kategori Pengeluaran"
          htmlFor="item-category"
          hint="Tanpa kategori, rincian ini tidak punya realisasi untuk dibandingkan."
        >
          <Select id="item-category" name="categoryId" defaultValue="">
            <option value="">Tanpa kategori</option>
            {expenseCategories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Rencana Anggaran"
          htmlFor="item-amount"
          required
          error={fieldErrors?.plannedAmount?.[0]}
        >
          <MoneyInput
            id="item-amount"
            name="plannedAmount"
            required
            invalid={Boolean(fieldErrors?.plannedAmount)}
          />
        </Field>

        <Field label="Catatan" htmlFor="item-notes">
          <Textarea id="item-notes" name="notes" rows={2} maxLength={500} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Tambah</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
