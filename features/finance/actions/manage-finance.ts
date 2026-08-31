"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ACCOUNT_FIELDS,
  BUDGET_FIELDS,
  BUDGET_ITEM_FIELDS,
  CATEGORY_FIELDS,
  TRANSACTION_FIELDS,
  accountSchema,
  budgetItemSchema,
  budgetSchema,
  categorySchema,
  transactionSchema,
} from "@/features/finance/schemas/finance.schema";
import { requireOrganizationPermission } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure, parseForm } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

/**
 * Kesalahan relasi keuangan hampir selalu berarti satu hal: sesuatu yang
 * ditunjuk bukan milik organisasi ini, atau kategorinya bertipe salah.
 * Keduanya ditolak foreign key, dan keduanya pantas dijelaskan dengan
 * kalimat yang sama.
 */
const RELATION_FAILURE = {
  "23503": {
    success: false as const,
    error:
      "Akun, kategori, periode, atau bukti tidak valid untuk organisasi ini. Pastikan jenis kategori cocok dengan jenis transaksi.",
    kind: "CONFLICT" as const,
  },
};

function revalidateFinance() {
  revalidatePath("/keuangan");
  revalidatePath("/keuangan/akun");
  revalidatePath("/keuangan/transaksi");
  revalidatePath("/keuangan/anggaran");
  revalidatePath("/keuangan/laporan");
  revalidatePath("/dashboard");
}

/* ============================================================== akun kas */

export async function createFinancialAccount(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageAccounts,
    );

    const parsed = parseForm(accountSchema, formData, ACCOUNT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("financial_accounts")
      .insert({
        organization_id: context.organizationId!,
        name: parsed.data.name,
        description: parsed.data.description,
        account_type: parsed.data.accountType,
        opening_balance: parsed.data.openingBalance,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Sudah ada akun kas dengan nama itu.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_account.created",
      resourceType: "financial_account",
      resourceId: data.id,
      metadata: {
        account_type: parsed.data.accountType,
        opening_balance: parsed.data.openingBalance,
      },
    });

    revalidateFinance();

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateFinancialAccount(
  organizationId: string,
  accountId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageAccounts,
    );

    const parsed = parseForm(accountSchema, formData, ACCOUNT_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data: before } = await supabase
      .from("financial_accounts")
      .select("opening_balance")
      .eq("id", accountId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    const { error } = await supabase
      .from("financial_accounts")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        account_type: parsed.data.accountType,
        opening_balance: parsed.data.openingBalance,
      })
      .eq("id", accountId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_account.updated",
      resourceType: "financial_account",
      resourceId: accountId,
      // Saldo awal menggeser SELURUH saldo akun. Perubahannya dicatat sebelum
      // dan sesudah, supaya selisih yang muncul kelak dapat dijelaskan.
      metadata: {
        opening_balance_before: before?.opening_balance ?? null,
        opening_balance_after: parsed.data.openingBalance,
      },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menonaktifkan / mengaktifkan akun kas.
 *
 * Tidak ada penghapusan akun: transaksi lama menunjuk kepadanya, dan akun yang
 * hilang membuat ledger tidak dapat dibaca. Nonaktif hanya berarti akun itu
 * tidak lagi ditawarkan untuk transaksi baru — saldonya tetap dihitung.
 */
export async function setAccountActive(
  organizationId: string,
  accountId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageAccounts,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("financial_accounts")
      .update({ is_active: isActive })
      .eq("id", accountId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_account.updated",
      resourceType: "financial_account",
      resourceId: accountId,
      metadata: { is_active: isActive },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* ============================================================== kategori */

export async function createFinancialCategory(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageCategories,
    );

    const parsed = parseForm(categorySchema, formData, CATEGORY_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("financial_categories")
      .insert({
        organization_id: context.organizationId!,
        name: parsed.data.name,
        type: parsed.data.type,
        description: parsed.data.description,
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) {
      return databaseFailure(error, {
        "23505": {
          success: false,
          error: "Kategori dengan nama dan jenis itu sudah ada.",
          kind: "CONFLICT",
        },
      });
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_category.created",
      resourceType: "financial_category",
      resourceId: data.id,
      metadata: { type: parsed.data.type },
    });

    revalidateFinance();

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Mengubah kategori.
 *
 * `type` sengaja TIDAK ikut diubah. Kategori bertipe INCOME yang berubah
 * menjadi EXPENSE akan membuat transaksi yang sudah menunjuknya berpindah
 * arah — dan foreign key komposit memang akan menolaknya. Yang tersedia
 * adalah menonaktifkan kategori lama dan membuat yang baru.
 */
export async function updateFinancialCategory(
  organizationId: string,
  categoryId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageCategories,
    );

    const parsed = parseForm(categorySchema, formData, CATEGORY_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase
      .from("financial_categories")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
      })
      .eq("id", categoryId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_category.updated",
      resourceType: "financial_category",
      resourceId: categoryId,
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setCategoryActive(
  organizationId: string,
  categoryId: string,
  isActive: boolean,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageCategories,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("financial_categories")
      .update({ is_active: isActive })
      .eq("id", categoryId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_category.updated",
      resourceType: "financial_category",
      resourceId: categoryId,
      metadata: { is_active: isActive },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* ============================================================= transaksi */

export async function createTransaction(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.create,
    );

    const parsed = parseForm(transactionSchema, formData, TRANSACTION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    // Selalu lahir sebagai DRAFT. Memposting adalah tindakan tersendiri dengan
    // permission tersendiri — tanpa pemisahan itu, siapa pun yang boleh
    // mencatat otomatis juga yang memasukkannya ke pembukuan.
    const { data, error } = await supabase
      .from("financial_transactions")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: parsed.data.organizationPeriodId,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
        transaction_type: parsed.data.transactionType,
        amount: parsed.data.amount,
        transaction_date: parsed.data.transactionDate,
        description: parsed.data.description,
        reference_number: parsed.data.referenceNumber,
        proof_document_id: context.permissions.has(
          PERMISSIONS.finance.viewProofs,
        )
          ? parsed.data.proofDocumentId
          : null,
        status: "DRAFT",
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error, RELATION_FAILURE);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_transaction.created",
      resourceType: "financial_transaction",
      resourceId: data.id,
      metadata: {
        type: parsed.data.transactionType,
        amount: parsed.data.amount,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
      },
    });

    revalidateFinance();

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateDraftTransaction(
  organizationId: string,
  transactionId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.edit,
    );

    const parsed = parseForm(transactionSchema, formData, TRANSACTION_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    // `status = DRAFT` ikut menjadi syarat query, bukan diperiksa lebih dulu:
    // dua langkah terpisah menyisakan celah di antaranya. Trigger di database
    // menutupnya sekali lagi bagi jalur mana pun.
    // Kolom bukti hanya ikut ditulis bila pemanggil memang berhak
    // menyentuhnya. Menulisnya dengan nilai dari form akan membuat penyunting
    // tanpa finance.view_proofs MENGHAPUS bukti yang tidak pernah ia lihat.
    const proofPatch = context.permissions.has(PERMISSIONS.finance.viewProofs)
      ? { proof_document_id: parsed.data.proofDocumentId }
      : {};

    const { error } = await supabase
      .from("financial_transactions")
      .update({
        organization_period_id: parsed.data.organizationPeriodId,
        account_id: parsed.data.accountId,
        category_id: parsed.data.categoryId,
        transaction_type: parsed.data.transactionType,
        amount: parsed.data.amount,
        transaction_date: parsed.data.transactionDate,
        description: parsed.data.description,
        reference_number: parsed.data.referenceNumber,
        ...proofPatch,
      })
      .eq("id", transactionId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "DRAFT");

    if (error) return databaseFailure(error, RELATION_FAILURE);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_transaction.updated_draft",
      resourceType: "financial_transaction",
      resourceId: transactionId,
      metadata: {
        type: parsed.data.transactionType,
        amount: parsed.data.amount,
      },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Memposting draf ke ledger.
 *
 * `.eq("status", "DRAFT")` membuat operasi ini idempoten terhadap klik ganda:
 * permintaan kedua tidak menemukan baris dan tidak mengubah apa pun, alih-alih
 * memposting dua kali. Trigger database menolak transisi apa pun yang bukan
 * DRAFT -> POSTED, sehingga dua permintaan bersamaan pun tidak dapat
 * menghasilkan keadaan yang mustahil.
 */
export async function postTransaction(
  organizationId: string,
  transactionId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.post,
    );

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("financial_transactions")
      .update({
        status: "POSTED",
        approved_by: context.profileId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "DRAFT")
      .select("id, amount, transaction_type");

    if (error) return databaseFailure(error);

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Transaksi ini sudah tidak berstatus draf.",
        kind: "CONFLICT",
      };
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_transaction.posted",
      resourceType: "financial_transaction",
      resourceId: transactionId,
      metadata: {
        amount: data[0]!.amount,
        type: data[0]!.transaction_type,
      },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Membatalkan transaksi yang sudah diposting.
 *
 * Barisnya tetap ada; yang berubah hanya statusnya menjadi VOID beserta
 * alasannya. Saldo mengeluarkannya karena seluruh perhitungan hanya menjumlah
 * status POSTED — tidak ada transaksi pembalik yang perlu dibuat, dan tidak
 * ada baris yang hilang dari riwayat.
 */
export async function voidTransaction(
  organizationId: string,
  transactionId: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.void,
    );

    const parsed = z
      .string()
      .trim()
      .min(5, "Alasan pembatalan minimal 5 karakter")
      .max(500, "Alasan pembatalan maksimal 500 karakter")
      .safeParse(reason);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]!.message,
        kind: "VALIDATION",
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("financial_transactions")
      .update({
        status: "VOID",
        voided_by: context.profileId,
        voided_at: new Date().toISOString(),
        void_reason: parsed.data,
      })
      .eq("id", transactionId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "POSTED")
      .select("id, amount, transaction_type");

    if (error) return databaseFailure(error);

    if (!data || data.length === 0) {
      return {
        success: false,
        error:
          "Hanya transaksi berstatus diposting yang dapat dibatalkan. Transaksi ini mungkin sudah dibatalkan sebelumnya.",
        kind: "CONFLICT",
      };
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_transaction.voided",
      resourceType: "financial_transaction",
      resourceId: transactionId,
      metadata: {
        amount: data[0]!.amount,
        type: data[0]!.transaction_type,
        reason: parsed.data,
      },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteDraftTransaction(
  organizationId: string,
  transactionId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.delete,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("financial_transactions")
      .delete()
      .eq("id", transactionId)
      .eq("organization_id", context.organizationId!)
      .eq("status", "DRAFT");

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "financial_transaction.deleted_draft",
      resourceType: "financial_transaction",
      resourceId: transactionId,
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* ============================================================== anggaran */

export async function createBudget(
  organizationId: string,
  _previousState: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageBudgets,
    );

    const parsed = parseForm(budgetSchema, formData, BUDGET_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        organization_id: context.organizationId!,
        organization_period_id: parsed.data.organizationPeriodId,
        name: parsed.data.name,
        description: parsed.data.description,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
        status: "DRAFT",
        created_by: context.profileId,
      })
      .select("id")
      .single();

    if (error) return databaseFailure(error, RELATION_FAILURE);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "budget.created",
      resourceType: "budget",
      resourceId: data.id,
    });

    revalidateFinance();

    return ok({ id: data.id });
  } catch (error) {
    return fail(error);
  }
}

export async function addBudgetItem(
  organizationId: string,
  budgetId: string,
  _previousState: ActionResult<void> | null,
  formData: FormData,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageBudgets,
    );

    const parsed = parseForm(budgetItemSchema, formData, BUDGET_ITEM_FIELDS);
    if (!parsed.ok) return parsed.result;

    const supabase = await createClient();

    const { error } = await supabase.from("budget_items").insert({
      budget_id: budgetId,
      organization_id: context.organizationId!,
      name: parsed.data.name,
      category_id: parsed.data.categoryId,
      planned_amount: parsed.data.plannedAmount,
      notes: parsed.data.notes,
    });

    if (error) return databaseFailure(error, RELATION_FAILURE);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "budget.updated",
      resourceType: "budget",
      resourceId: budgetId,
      metadata: {
        item_added: parsed.data.name,
        planned: parsed.data.plannedAmount,
      },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function removeBudgetItem(
  organizationId: string,
  budgetId: string,
  itemId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.manageBudgets,
    );

    const supabase = await createClient();

    const { error } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", itemId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "budget.updated",
      resourceType: "budget",
      resourceId: budgetId,
      metadata: { item_removed: itemId },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/** Menyetujui atau menutup anggaran. */
export async function setBudgetStatus(
  organizationId: string,
  budgetId: string,
  status: "DRAFT" | "APPROVED" | "CLOSED",
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.approve,
    );

    const supabase = await createClient();

    const approving = status !== "DRAFT";

    const { error } = await supabase
      .from("budgets")
      .update({
        status,
        approved_by: approving ? context.profileId : null,
        approved_at: approving ? new Date().toISOString() : null,
      })
      .eq("id", budgetId)
      .eq("organization_id", context.organizationId!);

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: status === "CLOSED" ? "budget.closed" : "budget.approved",
      resourceType: "budget",
      resourceId: budgetId,
      metadata: { status },
    });

    revalidateFinance();

    return ok();
  } catch (error) {
    return fail(error);
  }
}

/* ================================================================== bukti */

/**
 * Tautan bukti transaksi.
 *
 * Yang menentukan boleh-tidaknya adalah `finance.view_proofs` — SATU sumber,
 * bukan gabungan dengan documents.view (lihat migration 0037). Seorang
 * bendahara dapat membuka struk tanpa berhak menelusuri arsip organisasi, dan
 * pengelola arsip tidak otomatis dapat membaca bukti pengeluaran.
 *
 * Dokumennya diresolusi DARI TRANSAKSI, tidak pernah dari id yang dikirim
 * client: dengan begitu satu-satunya berkas yang dapat dibuka lewat jalur ini
 * adalah yang memang ditunjuk transaksi tersebut.
 *
 * Signed URL dibuat SETELAH authorization, bukan sebelumnya, dan berumur lima
 * menit.
 */
export async function createProofUrl(
  organizationId: string,
  transactionId: string,
): Promise<ActionResult<{ url: string; filename: string }>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.finance.viewProofs,
    );

    const supabase = await createClient();

    const { data: transaction } = await supabase
      .from("financial_transactions")
      .select("proof_document_id")
      .eq("id", transactionId)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (!transaction?.proof_document_id) {
      return {
        success: false,
        error: "Transaksi ini tidak memiliki bukti.",
        kind: "NOT_FOUND",
      };
    }

    // Baris ini melewati RLS `documents_select`, yang kini mengenal jalur
    // bukti transaksi. Kalau policy-nya menolak, tidak ada berkas untuk
    // ditandatangani — bukan tautan yang gagal dibuka nanti.
    const { data: document } = await supabase
      .from("documents")
      .select("storage_path, original_filename")
      .eq("id", transaction.proof_document_id)
      .eq("organization_id", context.organizationId!)
      .maybeSingle();

    if (!document) {
      return {
        success: false,
        error: "Bukti transaksi tidak dapat diakses.",
        kind: "FORBIDDEN",
      };
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(document.storage_path, 300, {
        download: document.original_filename,
      });

    if (error || !data) {
      return {
        success: false,
        error: "Tautan bukti tidak dapat dibuat.",
        kind: "INTERNAL",
      };
    }

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId: context.organizationId,
      action: "finance.proof_viewed",
      resourceType: "financial_transaction",
      resourceId: transactionId,
    });

    return ok({ url: data.signedUrl, filename: document.original_filename });
  } catch (error) {
    return fail(error);
  }
}
