"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Dialog modal, dibangun di atas `<dialog>` native.
 *
 * Elemen native memberi focus trap, tumpukan top-layer, dan penutupan lewat
 * Escape tanpa kode tambahan — jadi tidak perlu menambah dependency hanya
 * untuk perilaku yang sudah ada di platform (SYSTEM.md §115).
 *
 * Pada mobile dialog menempel ke bawah layar sebagai sheet, karena kotak
 * mengambang di tengah layar 320px lebih sulit dijangkau ibu jari
 * (docs/UI.md §104).
 */
/**
 * Lebar dialog — tiga tingkat, dan hanya tiga.
 *
 * Sebelumnya SEMUA dialog dipatok `max-w-lg` (512px), dari konfirmasi dua
 * kalimat sampai form empat belas field. Akibatnya keduanya salah sekaligus:
 * konfirmasi terlihat melebar tanpa isi, sementara form manajemen terasa
 * sesak — "Tambah Periode" berisi tiga field pun sempit karena tanggal mulai
 * dan selesai harus berbagi 512px dikurangi padding.
 *
 *   sm  448  konfirmasi dan form satu-dua field
 *   md  672  form manajemen standar — INI bawaannya
 *   lg  768  form yang memang banyak kolom
 *
 * Angkanya tetap di SATU tempat. Menuliskan `max-w-[640px]` langsung di satu
 * halaman adalah cara skala ini berhenti menjadi skala.
 */
export const LEBAR_DIALOG = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
} as const;

export type DialogSize = keyof typeof LEBAR_DIALOG;

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: DialogSize;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="dialog-title"
      onClose={onClose}
      // Klik pada backdrop: target event adalah elemen <dialog> itu sendiri
      // hanya ketika yang diklik area di luar isinya.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        "rounded-lg border border-border bg-card p-0 text-card-foreground",
        "shadow-overlay",
        "backdrop:bg-foreground/50",
        // Ponsel: menempel ke bawah supaya terjangkau ibu jari, tetapi TIDAK
        // lagi rata tepi. Sisi kiri dan kanan diberi 12px sehingga dialog
        // terbaca sebagai lembar yang mengambang, bukan sebagai halaman baru
        // yang menempel dinding layar (docs/UI.md §104).
        "m-3 mt-auto w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)]",
        // Di atas 640px ia kembali menjadi kotak terpusat, dan lebarnya
        // ditentukan varian.
        "sm:m-auto sm:w-full sm:max-h-[90dvh]",
        LEBAR_DIALOG[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0 space-y-1">
          <h2 id="dialog-title" className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-[13px] text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Tutup"
          className="-mr-1.5 shrink-0"
        >
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      {children ? (
        <div className="scroll-area max-h-[60dvh] px-5 py-4">{children}</div>
      ) : null}

      {footer ? (
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3.5">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}

/**
 * Konfirmasi tindakan destruktif.
 *
 * Teksnya harus menjelaskan AKIBAT, bukan sekadar bertanya "Anda yakin?"
 * (SYSTEM.md §77).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Lanjutkan",
  destructive = false,
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      // Konfirmasi TIDAK selebar form. Ia memuat satu kalimat akibat dan dua
      // tombol; selebar form manajemen ia terbaca seperti dialog yang lupa
      // diisi.
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            variant={destructive ? "destructive" : "primary"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "Memproses…" : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
