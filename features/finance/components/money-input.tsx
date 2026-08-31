"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";
import { formatRupiah, parseRupiah } from "@/lib/format";

/**
 * Input nominal rupiah.
 *
 * Yang dikirim ke server tetap teks apa adanya — server yang memanggil
 * parseRupiah() dan menolak yang tidak terbaca. Komponen ini hanya
 * menampilkan hasil pembacaan di bawah kotaknya, sehingga pengetik "150.000"
 * dapat melihat sendiri bahwa sistem membacanya seratus lima puluh ribu, bukan
 * seratus lima puluh.
 *
 * Sengaja TIDAK memformat isi kotaknya sambil diketik: kursor yang meloncat
 * setiap kali titik disisipkan adalah gangguan yang lebih besar daripada
 * masalah yang dipecahkannya.
 */
export function MoneyInput({
  id,
  name,
  defaultValue,
  required,
  allowNegative = false,
  invalid,
}: {
  id: string;
  name: string;
  defaultValue?: number | string | null;
  required?: boolean;
  allowNegative?: boolean;
  invalid?: boolean;
}) {
  const [raw, setRaw] = useState(
    defaultValue === null || defaultValue === undefined
      ? ""
      : String(defaultValue),
  );

  const negative = allowNegative && raw.trimStart().startsWith("-");
  const parsed = parseRupiah(negative ? raw.replace("-", "") : raw);
  const value = parsed === null ? null : negative ? -parsed : parsed;

  return (
    <div className="space-y-1">
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        placeholder="150.000"
        value={raw}
        aria-invalid={invalid}
        aria-describedby={`${id}-baca`}
        onChange={(event) => setRaw(event.target.value)}
      />

      <p id={`${id}-baca`} className="text-[13px] text-muted-foreground">
        {raw.trim().length === 0
          ? "Boleh diketik 150000 atau 150.000."
          : value === null
            ? "Belum terbaca sebagai angka."
            : `Dibaca: ${formatRupiah(value)}`}
      </p>
    </div>
  );
}
