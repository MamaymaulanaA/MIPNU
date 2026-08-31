/**
 * Format tampilan data.
 *
 * Terpusat supaya tanggal, angka, dan nominal tampil sama di seluruh aplikasi
 * (docs/UI.md §118-§123).
 */

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("id-ID");

/** Tanggal panjang, mis. "29 Agustus 2026". */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

/** Tanggal ringkas untuk kolom tabel, mis. "29 Agu 2026". */
export function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : shortDateFormatter.format(date);
}

/** Tanggal + jam, mis. "29 Agu 2026, 14.30". */
export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return numberFormatter.format(value);
}

/**
 * Rentang periode kepengurusan, mis. "2026–2028".
 * Memakai en dash, bukan hyphen, sesuai penulisan rentang.
 */
export function formatPeriodRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  return `${start.getFullYear()}–${end.getFullYear()}`;
}

/** Placeholder seragam untuk data kosong. */
export function orDash(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

/**
 * Mengubah timestamp ISO menjadi nilai untuk `<input type="datetime-local">`.
 *
 * Input tersebut menuntut format `YYYY-MM-DDTHH:mm` dalam waktu LOKAL, bukan
 * UTC. Memasukkan string ISO mentah membuat field tampil kosong tanpa pesan
 * error apa pun — kegagalan diam yang sulit dilacak.
 */
export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/* --------------------------------------------------------------- rupiah -- */

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/**
 * Menampilkan rupiah penuh, mis. "Rp150.000".
 *
 * Database menyimpan bigint rupiah penuh; fungsi ini HANYA untuk tampilan.
 * Nilai terformat tidak pernah dikirim balik ke server sebagai angka.
 */
export function formatRupiah(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) return "—";
  return rupiahFormatter.format(Number(value));
}

/**
 * Membaca nominal yang diketik manusia menjadi bilangan bulat rupiah.
 *
 * Menerima "150000", "150.000", "Rp150.000", dan "150 000" — ketiganya lazim
 * diketik orang Indonesia. Yang TIDAK diterima dikembalikan sebagai null,
 * bukan NaN dan bukan angka setengah terbaca: "150.000" yang dibaca sebagai
 * 150 adalah kesalahan yang jauh lebih mahal daripada penolakan.
 *
 * Titik diperlakukan sebagai pemisah ribuan, bukan desimal — itulah
 * konvensinya di Indonesia, dan pecahan sen memang tidak dipakai.
 */
export function parseRupiah(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^rp\.?\s*/i, "")
    .replace(/[.\s]/g, "");

  if (cleaned.length === 0) return null;
  if (!/^\d+$/.test(cleaned)) return null;

  const value = Number(cleaned);

  return Number.isSafeInteger(value) ? value : null;
}
