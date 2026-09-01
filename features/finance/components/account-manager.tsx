"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Landmark, Pencil, Plus, Tags } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
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
  disaring = false,
}: {
  organizationId: string;
  accounts: AccountRow[];
  canManage: boolean;
  /** Ada pencarian atau penyaring yang aktif — mengubah kalimat kosongnya. */
  disaring?: boolean;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [mengarsip, setMengarsip] = useState<AccountRow | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={disaring ? "Tidak ada akun yang cocok" : "Belum ada akun kas"}
          description={
            disaring
              ? "Ubah kata pencarian atau saringan statusnya."
              : "Setiap transaksi dicatat pada sebuah akun kas. Buat minimal satu sebelum mulai mencatat."
          }
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Akun</TableHeaderCell>
                {/* Nominal rata kanan, sama seperti kolom Nominal pada
                    Transaksi. Angka uang yang berpindah perataan antarhalaman
                    memaksa mata mencari titik desimalnya dua kali. */}
                <TableHeaderCell className="hidden text-right md:table-cell">
                  Saldo Awal
                </TableHeaderCell>
                <TableHeaderCell className="text-right">Saldo</TableHeaderCell>
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

                    <TableCell className="hidden text-right text-muted-foreground md:table-cell">
                      {formatRupiah(row.openingBalance)}
                    </TableCell>

                    <TableCell className="text-right font-medium text-foreground">
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
                            onClick={() => setMengarsip(row)}
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

      {/*
        Penonaktifan lewat konfirmasi.

        Akun kas tidak pernah dihapus — ia dinonaktifkan supaya transaksi lama
        tetap terbaca. Tetapi menonaktifkan akun MENGELUARKANNYA dari pilihan
        transaksi baru, dan sebelumnya itu terjadi pada klik pertama tanpa
        pertanyaan apa pun. Semantiknya tidak berubah; yang ditambahkan hanya
        langkah kedua sebelum aksinya dipanggil.
      */}
      <ConfirmDialog
        open={Boolean(mengarsip)}
        onClose={() => setMengarsip(null)}
        onConfirm={() => {
          if (!mengarsip) return;
          const target = mengarsip;

          startTransition(async () => {
            const result = await setAccountActive(
              organizationId,
              target.id,
              !target.isActive,
            );
            setMengarsip(null);
            showToast(
              result.success
                ? target.isActive
                  ? "Akun kas dinonaktifkan."
                  : "Akun kas diaktifkan."
                : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive={mengarsip?.isActive ?? false}
        confirmLabel={mengarsip?.isActive ? "Nonaktifkan" : "Aktifkan"}
        title={
          mengarsip?.isActive
            ? "Nonaktifkan akun kas ini?"
            : "Aktifkan kembali akun kas ini?"
        }
        description={
          mengarsip?.isActive
            ? "Akun tidak dihapus dan transaksi lamanya tetap terbaca, tetapi akun ini tidak lagi dapat dipilih pada transaksi baru."
            : "Akun ini akan kembali muncul sebagai pilihan pada transaksi baru."
        }
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

/**
 * Tombol "Tambah Akun Kas" beserta dialognya.
 *
 * Sama alasannya dengan `TransactionCreateDialog`: aksi primer berdiri di
 * kepala bagiannya, bukan melayang di atas tabel di dalam kartu.
 */
export function AccountCreateDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        Tambah Akun
      </Button>

      <AccountDialog
        key={open ? "acc-create-open" : "acc-create-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
      />
    </>
  );
}

/** Tombol "Tambah Kategori" beserta dialognya. */
export function CategoryCreateDialog({
  organizationId,
}: {
  organizationId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        Tambah Kategori
      </Button>

      <CategoryDialog
        key={open ? "cat-create-open" : "cat-create-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
      />
    </>
  );
}

export function CategoryManager({
  organizationId,
  categories,
  canManage,
  disaring = false,
}: {
  organizationId: string;
  categories: CategoryRow[];
  canManage: boolean;
  /** Ada pencarian atau penyaring yang aktif — mengubah kalimat kosongnya. */
  disaring?: boolean;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [mengarsip, setMengarsip] = useState<CategoryRow | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={
            disaring ? "Tidak ada kategori yang cocok" : "Belum ada kategori"
          }
          description={
            disaring
              ? "Ubah kata pencarian atau saringan jenisnya."
              : "Kategori memisahkan pemasukan dan pengeluaran agar laporan dapat dibaca per pos."
          }
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
                            onClick={() => setMengarsip(row)}
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

      <ConfirmDialog
        open={Boolean(mengarsip)}
        onClose={() => setMengarsip(null)}
        onConfirm={() => {
          if (!mengarsip) return;
          const target = mengarsip;

          startTransition(async () => {
            const result = await setCategoryActive(
              organizationId,
              target.id,
              !target.isActive,
            );
            setMengarsip(null);
            showToast(
              result.success
                ? target.isActive
                  ? "Kategori dinonaktifkan."
                  : "Kategori diaktifkan."
                : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive={mengarsip?.isActive ?? false}
        confirmLabel={mengarsip?.isActive ? "Nonaktifkan" : "Aktifkan"}
        title={
          mengarsip?.isActive
            ? "Nonaktifkan kategori ini?"
            : "Aktifkan kembali kategori ini?"
        }
        description={
          mengarsip?.isActive
            ? "Kategori tidak dihapus dan transaksi lamanya tetap tercatat pada kategori ini, tetapi ia tidak lagi dapat dipilih pada transaksi baru."
            : "Kategori ini akan kembali muncul sebagai pilihan pada transaksi baru."
        }
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
