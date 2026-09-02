export function parseCsv(input: string): string[][] {
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

  if (field !== "" || row.length > 0) endRow();

  return rows;
}

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

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);

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

function unescapeCell(value: string): string {
  return value.startsWith("'") && FORMULA_TRIGGERS.test(value.slice(1))
    ? value.slice(1)
    : value;
}

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
