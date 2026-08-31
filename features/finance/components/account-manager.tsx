"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Landmark, Pencil, Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createFinancialAccount,
  createFinancialCategory,
  setAccountActive,
  setCategoryActive,
  updateFinancialAccount,
  updateFinancialCategory,
} from "@/features/finance/actions/manage-finance";
import {
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
} from "@/features/finance/schemas/finance.schema";
import { MoneyInput } from "@/features/finance/components/money-input";
import type { ActionResult } from "@/lib/errors";
import { formatRupiah } from "@/lib/format";
import { accountType, transactionType } from "@/lib/status";

export type AccountRow = {
  id: string;
  name: string;
  description: string | null;
  accountType: string;
  openingBalance: number;
  isActive: boolean;
  balance: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
};

/* ============================================================== akun kas */

export function AccountManager({
  organizationId,
  accounts,
  canManage,
}: {
  organizationId: string;
  accounts: AccountRow[];
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Tambah Akun Kas
          </Button>
        </div>
      ) : null}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Belum ada akun kas"
          description="Setiap transaksi dicatat pada sebuah akun kas. Buat minimal satu sebelum mulai mencatat."
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Akun</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">
                  Saldo Awal
                </TableHeaderCell>
                <TableHeaderCell>Saldo</TableHeaderCell>
                {canManage ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {accounts.map((row) => {
                const type = accountType(row.accountType);

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {row.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={type.tone}>{type.label}</Badge>
                        {row.isActive ? null : (
                          <Badge tone="neutral">Nonaktif</Badge>
                        )}
                      </span>
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatRupiah(row.openingBalance)}
                    </TableCell>

                    <TableCell className="font-medium text-foreground">
                      {formatRupiah(row.balance)}
                    </TableCell>

                    {canManage ? (
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Ubah
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await setAccountActive(
                                  organizationId,
                                  row.id,
                                  !row.isActive,
                                );
                                if (!result.success) {
                                  showToast(result.error, "error");
                                }
                              })
                            }
                          >
                            {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableScroll>
      )}

      <AccountDialog
        key={createOpen ? "acc-create-open" : "acc-create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
      />

      <AccountDialog
        key={editing?.id ?? "acc-edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        account={editing}
      />
    </>
  );
}

function AccountDialog({
  open,
  onClose,
  organizationId,
  account,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  account?: AccountRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(account);

  const action = isEdit
    ? updateFinancialAccount.bind(null, organizationId, account!.id)
    : createFinancialAccount.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Akun kas diperbarui." : "Akun kas dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Akun Kas" : "Tambah Akun Kas"}
      description="Saldo akun dihitung dari transaksi yang sudah diposting, ditambah saldo awal di bawah."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Akun"
          htmlFor="acc-name"
          required
          hint="Contoh: Kas Tunai, Bank Organisasi"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="acc-name"
            name="name"
            required
            maxLength={120}
            defaultValue={account?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis" htmlFor="acc-type" required>
            <Select
              id="acc-type"
              name="accountType"
              required
              defaultValue={account?.accountType ?? "CASH"}
            >
              {ACCOUNT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {accountType(value).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Saldo Awal"
            htmlFor="acc-opening"
            hint="Saldo sebelum pencatatan dimulai. Perubahannya tercatat di audit log."
            error={fieldErrors?.openingBalance?.[0]}
          >
            <MoneyInput
              id="acc-opening"
              name="openingBalance"
              allowNegative
              defaultValue={account?.openingBalance ?? 0}
              invalid={Boolean(fieldErrors?.openingBalance)}
            />
          </Field>
        </div>

        <Field label="Keterangan" htmlFor="acc-description">
          <Textarea
            id="acc-description"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={account?.description ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Tambah"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/* ============================================================== kategori */

export function CategoryManager({
  organizationId,
  categories,
  canManage,
}: {
  organizationId: string;
  categories: CategoryRow[];
  canManage: boolean;
}) {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {canManage ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            Tambah Kategori
          </Button>
        </div>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Belum ada kategori"
          description="Kategori memisahkan pemasukan dan pengeluaran agar laporan dapat dibaca per pos."
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Kategori</TableHeaderCell>
                <TableHeaderCell>Jenis</TableHeaderCell>
                {canManage ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {categories.map((row) => {
                const type = transactionType(row.type);

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {row.name}
                      </span>
                      {row.isActive ? null : (
                        <span className="ml-2 text-[13px] text-muted-foreground">
                          (nonaktif)
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge tone={type.tone}>{type.label}</Badge>
                    </TableCell>

                    {canManage ? (
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Ubah
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(async () => {
                                const result = await setCategoryActive(
                                  organizationId,
                                  row.id,
                                  !row.isActive,
                                );
                                if (!result.success) {
                                  showToast(result.error, "error");
                                }
                              })
                            }
                          >
                            {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableScroll>
      )}

      <CategoryDialog
        key={createOpen ? "cat-create-open" : "cat-create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
      />

      <CategoryDialog
        key={editing?.id ?? "cat-edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        category={editing}
      />
    </>
  );
}

function CategoryDialog({
  open,
  onClose,
  organizationId,
  category,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  category?: CategoryRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(category);

  const action = isEdit
    ? updateFinancialCategory.bind(null, organizationId, category!.id)
    : createFinancialCategory.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Kategori diperbarui." : "Kategori dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Kategori" : "Tambah Kategori"}
      description="Jenis kategori menentukan transaksi mana yang boleh memakainya, dan tidak dapat diubah setelah dibuat."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Kategori"
          htmlFor="cat-name"
          required
          hint="Contoh: Iuran Anggota, Konsumsi, Transportasi"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="cat-name"
            name="name"
            required
            maxLength={120}
            defaultValue={category?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field label="Jenis" htmlFor="cat-type" required>
          <Select
            id="cat-type"
            name="type"
            required
            disabled={isEdit}
            defaultValue={category?.type ?? "INCOME"}
          >
            {TRANSACTION_TYPES.map((value) => (
              <option key={value} value={value}>
                {transactionType(value).label}
              </option>
            ))}
          </Select>
          {isEdit ? (
            <input type="hidden" name="type" value={category!.type} />
          ) : null}
        </Field>

        <Field label="Keterangan" htmlFor="cat-description">
          <Textarea
            id="cat-description"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={category?.description ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Tambah"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
