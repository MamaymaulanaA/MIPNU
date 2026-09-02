"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Ban,
  CheckCircle2,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { useJagaIsian } from "@/components/forms/use-jaga-isian";
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
  createProofUrl,
  createTransaction,
  deleteDraftTransaction,
  postTransaction,
  updateDraftTransaction,
  voidTransaction,
} from "@/features/finance/actions/manage-finance";
import { TRANSACTION_TYPES } from "@/features/finance/schemas/finance.schema";
import { MoneyInput } from "@/features/finance/components/money-input";
import type { ActionResult } from "@/lib/errors";
import { formatRupiah, formatShortDate } from "@/lib/format";
import { transactionStatus, transactionType } from "@/lib/status";

export type TransactionRow = {
  id: string;
  transactionType: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  transactionDate: string;
  amount: number;
  description: string;
  referenceNumber: string | null;
  periodId: string | null;
  hasProof: boolean;
  proofDocumentId: string | null;
  status: string;
  voidReason: string | null;
};

export type FinanceOption = { id: string; label: string; type?: string };

export type TransactionPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canPost: boolean;
  canVoid: boolean;
  canDelete: boolean;
  canViewProofs: boolean;
};

export function TransactionCreateDialog({
  organizationId,
  accountOptions,
  categoryOptions,
  periodOptions,
  documentOptions,
  canViewProofs,
}: {
  organizationId: string;
  accountOptions: FinanceOption[];
  categoryOptions: FinanceOption[];
  periodOptions: FinanceOption[];
  documentOptions: FinanceOption[];
  canViewProofs: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={accountOptions.length === 0}
      >
        <Plus size={16} aria-hidden="true" />
        Catat Transaksi
      </Button>

      <TransactionDialog
        key={open ? "trx-create-open" : "trx-create-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        accountOptions={accountOptions}
        categoryOptions={categoryOptions}
        periodOptions={periodOptions}
        documentOptions={documentOptions}
        canViewProofs={canViewProofs}
      />
    </>
  );
}

export function TransactionManager({
  organizationId,
  transactions,
  accountOptions,
  categoryOptions,
  periodOptions,
  documentOptions,
  permissions,
  disaring = false,
}: {
  organizationId: string;
  transactions: TransactionRow[];
  accountOptions: FinanceOption[];
  categoryOptions: FinanceOption[];
  periodOptions: FinanceOption[];
  documentOptions: FinanceOption[];
  permissions: TransactionPermissions;
  disaring?: boolean;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [posting, setPosting] = useState<TransactionRow | null>(null);
  const [voiding, setVoiding] = useState<TransactionRow | null>(null);
  const [deleting, setDeleting] = useState<TransactionRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasActions =
    permissions.canEdit ||
    permissions.canPost ||
    permissions.canVoid ||
    permissions.canDelete ||
    permissions.canViewProofs;

  return (
    <>
      {transactions.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={
            disaring ? "Tidak ada transaksi yang cocok" : "Belum ada transaksi"
          }
          description={
            disaring
              ? "Ubah kata pencarian, penyaring, atau rentang tanggalnya."
              : "Transaksi baru tersimpan sebagai draf, dan baru mempengaruhi saldo setelah diposting."
          }
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeaderCell>Keterangan</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">
                  Akun
                </TableHeaderCell>
                <TableHeaderCell className="text-right">
                  Nominal
                </TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {hasActions ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>

            <TableBody>
              {transactions.map((row) => {
                const status = transactionStatus(row.status);
                const type = transactionType(row.transactionType);
                const isIncome = row.transactionType === "INCOME";

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {row.description}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {formatShortDate(row.transactionDate)}
                        {row.categoryName ? ` · ${row.categoryName}` : ""}
                        {row.referenceNumber ? ` · ${row.referenceNumber}` : ""}
                      </span>
                      {row.voidReason ? (
                        <span className="block text-[13px] text-destructive">
                          Dibatalkan: {row.voidReason}
                        </span>
                      ) : null}
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {row.accountName}
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={
                          row.status === "VOID"
                            ? "text-muted-foreground line-through"
                            : isIncome
                              ? "font-medium text-success"
                              : "font-medium text-destructive"
                        }
                      >
                        {isIncome ? "+" : "−"}
                        {formatRupiah(row.amount)}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {type.label}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </TableCell>

                    {hasActions ? (
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {permissions.canViewProofs && row.hasProof ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  const result = await createProofUrl(
                                    organizationId,
                                    row.id,
                                  );

                                  if (!result.success) {
                                    showToast(result.error, "error");
                                    return;
                                  }

                                  window.open(
                                    result.data.url,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                })
                              }
                            >
                              <Paperclip size={14} aria-hidden="true" />
                              Bukti
                            </Button>
                          ) : null}

                          {permissions.canEdit && row.status === "DRAFT" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditing(row)}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              Ubah
                            </Button>
                          ) : null}

                          {permissions.canPost && row.status === "DRAFT" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPosting(row)}
                            >
                              <CheckCircle2 size={14} aria-hidden="true" />
                              Posting
                            </Button>
                          ) : null}

                          {permissions.canVoid && row.status === "POSTED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setVoiding(row)}
                            >
                              <Ban size={14} aria-hidden="true" />
                              Batalkan
                            </Button>
                          ) : null}

                          {permissions.canDelete && row.status === "DRAFT" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleting(row)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              Hapus
                            </Button>
                          ) : null}
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

      <TransactionDialog
        key={editing?.id ?? "trx-edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        accountOptions={accountOptions}
        categoryOptions={categoryOptions}
        periodOptions={periodOptions}
        documentOptions={documentOptions}
        canViewProofs={permissions.canViewProofs}
        transaction={editing}
      />

      <VoidDialog
        key={voiding?.id ?? "void-closed"}
        open={Boolean(voiding)}
        onClose={() => setVoiding(null)}
        organizationId={organizationId}
        transaction={voiding}
      />

      <ConfirmDialog
        open={Boolean(posting)}
        onClose={() => setPosting(null)}
        onConfirm={() => {
          if (!posting) return;
          const target = posting;

          startTransition(async () => {
            const result = await postTransaction(organizationId, target.id);
            setPosting(null);
            showToast(
              result.success ? "Transaksi diposting." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        confirmLabel="Posting"
        title="Posting transaksi ini?"
        description="Setelah diposting, transaksi masuk ke ledger dan mempengaruhi saldo. Transaksi yang sudah diposting tidak dapat disunting maupun dihapus — hanya dapat dibatalkan lewat pembatalan bernomor alasan."
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;

          startTransition(async () => {
            const result = await deleteDraftTransaction(
              organizationId,
              target.id,
            );
            setDeleting(null);
            showToast(
              result.success ? "Draf transaksi dihapus." : result.error,
              result.success ? "success" : "error",
            );
          });
        }}
        pending={isPending}
        destructive
        confirmLabel="Hapus Draf"
        title="Hapus draf transaksi ini?"
        description="Draf belum masuk ledger, jadi penghapusannya tidak mengubah saldo. Transaksi yang sudah diposting tidak dapat dihapus."
      />
    </>
  );
}

function VoidDialog({
  open,
  onClose,
  organizationId,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  transaction: TransactionRow | null;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Batalkan transaksi"
      description="Transaksi yang sudah diposting tidak dihapus dan tidak disunting. Pembatalan dicatat sebagai peristiwa tersendiri, dan efeknya keluar dari saldo."
    >
      <div className="space-y-4">
        {transaction ? (
          <p className="text-[13px] text-muted-foreground">
            {transaction.description} · {formatRupiah(transaction.amount)}
          </p>
        ) : null}

        <Field
          label="Alasan Pembatalan"
          htmlFor="void-reason"
          required
          hint="Tercatat permanen di ledger dan audit log."
        >
          <Textarea
            id="void-reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="destructive"
            disabled={isPending || reason.trim().length < 5}
            onClick={() => {
              if (!transaction) return;

              startTransition(async () => {
                const result = await voidTransaction(
                  organizationId,
                  transaction.id,
                  reason,
                );

                if (result.success) {
                  setReason("");
                  onClose();
                }

                showToast(
                  result.success ? "Transaksi dibatalkan." : result.error,
                  result.success ? "success" : "error",
                );
              });
            }}
          >
            Batalkan Transaksi
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function TransactionDialog({
  open,
  onClose,
  organizationId,
  accountOptions,
  categoryOptions,
  periodOptions,
  documentOptions,
  canViewProofs,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  accountOptions: FinanceOption[];
  categoryOptions: FinanceOption[];
  periodOptions: FinanceOption[];
  documentOptions: FinanceOption[];
  canViewProofs: boolean;
  transaction?: TransactionRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(transaction);

  const [type, setType] = useState(transaction?.transactionType ?? "INCOME");

  const action = isEdit
    ? updateDraftTransaction.bind(null, organizationId, transaction!.id)
    : createTransaction.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  const jagaIsian = useJagaIsian(state);

  useEffect(() => {
    if (state?.success) {
      showToast(
        isEdit ? "Draf diperbarui." : "Transaksi dicatat sebagai draf.",
      );
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  const categories = categoryOptions.filter((option) => option.type === type);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Draf Transaksi" : "Catat Transaksi"}
      description="Transaksi tersimpan sebagai draf. Ia baru mempengaruhi saldo setelah diposting."
    >
      <form {...jagaIsian(formAction)} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jenis" htmlFor="trx-type" required>
            <Select
              id="trx-type"
              name="transactionType"
              required
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {TRANSACTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {transactionType(value).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Tanggal"
            htmlFor="trx-date"
            required
            hint="Tanggal transaksi, bukan tanggal pencatatan."
            error={fieldErrors?.transactionDate?.[0]}
          >
            <Input
              id="trx-date"
              name="transactionDate"
              type="date"
              required
              defaultValue={
                transaction?.transactionDate ??
                new Date().toISOString().slice(0, 10)
              }
              aria-invalid={Boolean(fieldErrors?.transactionDate)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Akun Kas"
            htmlFor="trx-account"
            required
            error={fieldErrors?.accountId?.[0]}
          >
            <Select
              id="trx-account"
              name="accountId"
              required
              defaultValue={transaction?.accountId ?? ""}
            >
              <option value="">Pilih akun</option>
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Kategori"
            htmlFor="trx-category"
            hint={
              categories.length === 0
                ? "Belum ada kategori untuk jenis ini."
                : undefined
            }
          >
            <Select
              id="trx-category"
              name="categoryId"
              defaultValue={transaction?.categoryId ?? ""}
            >
              <option value="">Tanpa kategori</option>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Nominal"
          htmlFor="trx-amount"
          required
          error={fieldErrors?.amount?.[0]}
        >
          <MoneyInput
            id="trx-amount"
            name="amount"
            required
            defaultValue={transaction?.amount ?? ""}
            invalid={Boolean(fieldErrors?.amount)}
          />
        </Field>

        <Field
          label="Keterangan"
          htmlFor="trx-description"
          required
          error={fieldErrors?.description?.[0]}
        >
          <Textarea
            id="trx-description"
            name="description"
            rows={2}
            required
            maxLength={500}
            defaultValue={transaction?.description ?? ""}
            aria-invalid={Boolean(fieldErrors?.description)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nomor Referensi"
            htmlFor="trx-reference"
            hint="Nomor kuitansi atau bukti, bila ada."
          >
            <Input
              id="trx-reference"
              name="referenceNumber"
              maxLength={120}
              defaultValue={transaction?.referenceNumber ?? ""}
            />
          </Field>

          <Field label="Periode" htmlFor="trx-period">
            <Select
              id="trx-period"
              name="organizationPeriodId"
              defaultValue={transaction?.periodId ?? ""}
            >
              <option value="">Tanpa periode</option>
              {periodOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {canViewProofs ? (
          <Field
            label="Bukti Transaksi"
            htmlFor="trx-proof"
            hint="Unggah berkasnya lebih dulu di menu Dokumen, lalu pilih di sini."
          >
            <Select
              id="trx-proof"
              name="proofDocumentId"
              defaultValue={transaction?.proofDocumentId ?? ""}
            >
              <option value="">Tanpa bukti</option>
              {documentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : transaction?.hasProof ? (
          <p className="text-[13px] text-muted-foreground">
            Transaksi ini memiliki bukti. Anda belum berhak membukanya, dan
            menyimpan perubahan tidak akan menghapusnya.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan Draf" : "Simpan Draf"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

export function TransactionSummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "income" | "expense";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={
          tone === "income"
            ? "text-sm font-medium text-success"
            : tone === "expense"
              ? "text-sm font-medium text-destructive"
              : "text-sm font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
