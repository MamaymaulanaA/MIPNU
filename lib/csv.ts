/**
 * Baca-tulis CSV.
 *
 * Ditulis sendiri alih-alih menambah dependency: yang dibutuhkan MIPNU adalah
 * RFC 4180 apa adanya, dan bagian yang benar-benar berbahaya — field berkutip
 * yang memuat koma, baris baru, dan kutip ganda — hanya beberapa baris kode
 * yang dapat diuji langsung (SYSTEM.md §115).
 *
 * Yang ditangani: BOM, CRLF, field berkutip, kutip ganda di dalam kutip,
 * baris kosong, dan baris terakhir tanpa newline.
 */

/**
 * Mengurai CSV menjadi larik baris berupa larik sel.
 *
 * Tidak menebak tipe apa pun: semua sel tetap string. Menebak tipe pada
 * tahap ini akan mengubah "0812…" menjadi angka dan menghapus nol di depan
 * nomor telepon.
 */
export function parseCsv(input: string): string[][] {
  // BOM dari Excel akan menempel pada nama kolom pertama bila tidak dibuang.
  const text = input.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let index = 0;

  function endField() {
    row.push(unescapeCell(field));
    field = "";
  }

  function endRow() {
    endField();
    // Baris yang seluruhnya kosong dibuang — biasanya sisa newline di akhir
    // berkas, bukan data.
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  }

  while (index < text.length) {
    const char = text[index]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    if (char === ",") {
      endField();
      index += 1;
      continue;
    }

    if (char === "\r") {
      // CRLF maupun CR sendirian diperlakukan sebagai satu akhir baris.
      if (text[index + 1] === "\n") index += 1;
      endRow();
      index += 1;
      continue;
    }

    if (char === "\n") {
      endRow();
      index += 1;
      continue;
    }

    field += char;
    index += 1;
  }

  // Baris terakhir sering tidak diakhiri newline.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/**
 * Mengurai CSV berheader menjadi larik objek.
 *
 * Nama kolom dinormalkan (huruf kecil, spasi/garis bawah dirapikan) supaya
 * "Nama Lengkap", "nama_lengkap", dan "NAMA LENGKAP" sama-sama dikenali —
 * berkas dari orang berbeda tidak pernah seragam.
 */
export function parseCsvWithHeader(input: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const raw = parseCsv(input);
  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = raw[0]!.map(normalizeHeader);

  const rows = raw.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      record[header] = (cells[columnIndex] ?? "").trim();
    });
    return record;
  });

  return { headers, rows };
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Meloloskan satu sel agar aman ditulis ke CSV. */
/**
 * Karakter yang membuat spreadsheet memperlakukan sebuah sel sebagai RUMUS.
 *
 * Excel, LibreOffice, dan Google Sheets mengeksekusi sel yang diawali salah
 * satunya. Sebuah keterangan transaksi yang ditulis
 * `=HYPERLINK("http://…","klik")` akan menjadi tautan hidup pada berkas yang
 * dibuka bendahara — dan penulisnya adalah siapa pun yang boleh mengisi form.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

  // Petik tunggal di depan membuat spreadsheet membacanya sebagai teks biasa.
  // Ia dilepas kembali oleh parseCsv(), sehingga ekspor lalu impor tetap
  // menghasilkan nilai yang sama persis.
  if (FORMULA_TRIGGERS.test(text)) {
    text = `'${text}`;
  }

  // Sel yang memuat pemisah, kutip, atau baris baru wajib dikutip; kutip di
  // dalamnya digandakan.
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/** Melepas petik pelindung yang dipasang escapeCell(). */
function unescapeCell(value: string): string {
  return value.startsWith("'") && FORMULA_TRIGGERS.test(value.slice(1))
    ? value.slice(1)
    : value;
}

/**
 * Menyusun CSV dari daftar objek.
 *
 * Menulis BOM UTF-8 supaya Excel di Windows membaca huruf beraksen dan nama
 * berbahasa Indonesia dengan benar, bukan sebagai karakter rusak.
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T & string; label: string }[],
): string {
  const header = columns.map((column) => escapeCell(column.label)).join(",");

  const body = rows.map((row) =>
    columns.map((column) => escapeCell(row[column.key])).join(","),
  );

  return `﻿${[header, ...body].join("\r\n")}\r\n`;
}
