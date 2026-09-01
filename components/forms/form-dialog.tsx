"use client";

import { useActionState, useEffect } from "react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, type DialogSize } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";

/**
 * Dialog berisi form.
 *
 * BUKAN modal kedua. Ia dibangun di atas `Dialog` yang sama dengan seluruh
 * aplikasi; yang ditampungnya adalah rangkaian yang selama ini ditulis ulang
 * di setiap dialog form:
 *
 *   useActionState -> tunggu sukses -> toast -> tutup -> tampilkan fieldErrors
 *
 * Enam baris itu tampak sepele sampai ditulis di banyak tempat, lalu perlahan
 * berbeda: ada yang lupa menutup dialognya, ada yang menampilkan FormAlert di
 * bawah alih-alih di atas, ada yang tombolnya terbalik urutannya. Dengan satu
 * tempat, susunan tombol dan letak pesan galat tidak lagi bergantung pada
 * ingatan penulisnya (AGENTS.md §53, §54).
 *
 * ANATOMINYA tetap sama persis dengan dialog lain: judul dan keterangan di
 * kepala, isi di tengah, aksi di ujung kanan bawah — Batal lalu Simpan.
 *
 * Isi diberikan sebagai fungsi, bukan node biasa, karena field membutuhkan
 * `fieldErrors` yang baru ada SETELAH server menjawab.
 */
export function FormDialog<T>({
  open,
  onClose,
  title,
  description,
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  size,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Server action yang sudah ada. Dialog ini tidak pernah membuat logic baru. */
  action: (
    previousState: ActionResult<T> | null,
    formData: FormData,
  ) => Promise<ActionResult<T>>;
  submitLabel: string;
  pendingLabel?: string;
  successMessage: string;
  /** Bawaannya `md` — lebar form manajemen standar. */
  size?: DialogSize;
  children: (fieldErrors?: Record<string, string[]>) => React.ReactNode;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<ActionResult<T> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (!state?.success) return;
    showToast(successMessage);
    onClose();
  }, [state, successMessage, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      <form action={formAction} className="space-y-4">
        {/*
          Galat tingkat form di ATAS isi, dan hanya ketika ia bukan milik satu
          field tertentu. Galat yang sudah tampil di sebelah fieldnya tidak
          diulang di sini — pengulangan membuat pengguna mencari dua kali untuk
          satu masalah yang sama.
        */}
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        {children(fieldErrors)}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
