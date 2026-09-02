"use client";

import { useEffect, useRef } from "react";

/*
 * React 19 mengosongkan form tak terkendali begitu form action selesai —
 * termasuk ketika server MENOLAK. Tanpa ini, setiap kegagalan validasi
 * memaksa pengguna mengetik ulang seluruh isian, dan makin panjang formnya
 * makin besar kerugiannya.
 *
 * Nilai yang dikirim disimpan saat submit, lalu dipasang kembali pada frame
 * berikutnya — reset React terjadi setelah effect ini, jadi memulihkan lebih
 * awal akan langsung ditimpa.
 */
export function useJagaIsian(state: { success: boolean } | null) {
  const formRef = useRef<HTMLFormElement>(null);
  const terkirimRef = useRef<FormData | null>(null);

  useEffect(() => {
    if (!state || state.success) return;
    const form = formRef.current;
    const terkirim = terkirimRef.current;
    if (!form || !terkirim) return;

    const banyakNilai = new Map<string, string[]>();
    for (const [nama, nilai] of terkirim.entries()) {
      if (typeof nilai !== "string") continue;
      banyakNilai.set(nama, [...(banyakNilai.get(nama) ?? []), nilai]);
    }

    const frame = requestAnimationFrame(() => {
      for (const el of form.elements) {
        if (
          !(el instanceof HTMLInputElement) &&
          !(el instanceof HTMLSelectElement) &&
          !(el instanceof HTMLTextAreaElement)
        ) {
          continue;
        }
        if (
          !el.name ||
          (el instanceof HTMLInputElement && el.type === "file")
        ) {
          continue;
        }

        const nilai = banyakNilai.get(el.name) ?? [];

        if (
          el instanceof HTMLInputElement &&
          (el.type === "checkbox" || el.type === "radio")
        ) {
          el.checked = nilai.includes(el.value);
          continue;
        }

        if (el instanceof HTMLSelectElement && el.multiple) {
          for (const opsi of el.options) {
            opsi.selected = nilai.includes(opsi.value);
          }
          continue;
        }

        el.value = nilai[0] ?? "";
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [state]);

  return (formAction: (formData: FormData) => void) => ({
    ref: formRef,
    action: (formData: FormData) => {
      terkirimRef.current = formData;
      formAction(formData);
    },
  });
}
