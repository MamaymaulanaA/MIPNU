import { describe, expect, it } from "vitest";

import {
  normalizeHeader,
  parseCsv,
  parseCsvWithHeader,
  toCsv,
} from "@/lib/csv";

describe("parseCsv", () => {
  it("mengurai baris sederhana", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("menghormati koma di dalam field berkutip", () => {
    expect(parseCsv('nama,alamat\n"Ahmad","Jl. Merdeka No. 1, Bogor"')).toEqual(
      [
        ["nama", "alamat"],
        ["Ahmad", "Jl. Merdeka No. 1, Bogor"],
      ],
    );
  });

  it("mengurai kutip ganda di dalam field berkutip", () => {
    expect(parseCsv('a\n"dia berkata ""halo"""')).toEqual([
      ["a"],
      ['dia berkata "halo"'],
    ]);
  });

  it("menghormati baris baru di dalam field berkutip", () => {
    expect(parseCsv('nama,catatan\n"Siti","baris satu\nbaris dua"')).toEqual([
      ["nama", "catatan"],
      ["Siti", "baris satu\nbaris dua"],
    ]);
  });

  it("menangani CRLF", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("membuang BOM di awal berkas", () => {
    expect(parseCsv("﻿nama\nAhmad")).toEqual([["nama"], ["Ahmad"]]);
  });

  it("membuang baris kosong", () => {
    expect(parseCsv("a\n\n\nb\n")).toEqual([["a"], ["b"]]);
  });

  it("menerima baris terakhir tanpa newline", () => {
    expect(parseCsv("a,b\n1,2")).toHaveLength(2);
  });

  it("mempertahankan sel kosong di tengah baris", () => {
    expect(parseCsv("a,b,c\n1,,3")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });
});

describe("normalizeHeader", () => {
  it("menyeragamkan variasi penulisan nama kolom", () => {
    expect(normalizeHeader("Nama Lengkap")).toBe("nama_lengkap");
    expect(normalizeHeader("NAMA_LENGKAP")).toBe("nama_lengkap");
    expect(normalizeHeader("  nama-lengkap  ")).toBe("nama_lengkap");
    expect(normalizeHeader("No. Anggota")).toBe("no_anggota");
  });
});

describe("parseCsvWithHeader", () => {
  it("memetakan baris menjadi objek berkunci header ternormalisasi", () => {
    const { headers, rows } = parseCsvWithHeader(
      "Nama Lengkap,No. Anggota\nAhmad Fauzi,001\n",
    );

    expect(headers).toEqual(["nama_lengkap", "no_anggota"]);
    expect(rows).toEqual([{ nama_lengkap: "Ahmad Fauzi", no_anggota: "001" }]);
  });

  it("tidak menebak tipe — nomor tetap string", () => {
    const { rows } = parseCsvWithHeader("telepon\n081234567890\n");
    expect(rows[0]!.telepon).toBe("081234567890");
  });

  it("mengembalikan kosong untuk berkas kosong", () => {
    expect(parseCsvWithHeader("")).toEqual({ headers: [], rows: [] });
  });
});

describe("toCsv", () => {
  it("mengutip sel yang memuat pemisah atau kutip", () => {
    const csv = toCsv(
      [{ nama: 'Ahmad "AF"', alamat: "Bogor, Jawa Barat" }],
      [
        { key: "nama", label: "Nama" },
        { key: "alamat", label: "Alamat" },
      ],
    );

    expect(csv).toContain('"Ahmad ""AF"""');
    expect(csv).toContain('"Bogor, Jawa Barat"');
  });

  it("menulis BOM agar Excel membaca UTF-8 dengan benar", () => {
    const csv = toCsv([{ a: "x" }], [{ key: "a", label: "A" }]);
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("mengubah null dan undefined menjadi sel kosong", () => {
    const csv = toCsv(
      [{ a: null, b: undefined }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
    );
    expect(csv).toContain("\r\n,\r\n");
  });

  it("bolak-balik: hasil tulis dapat dibaca kembali utuh", () => {
    const original = [
      { nama: "Siti, S.Pd", catatan: 'kata "penting"\nbaris dua' },
    ];

    const csv = toCsv(original, [
      { key: "nama", label: "nama" },
      { key: "catatan", label: "catatan" },
    ]);

    const { rows } = parseCsvWithHeader(csv);
    expect(rows[0]!.nama).toBe("Siti, S.Pd");
    expect(rows[0]!.catatan).toBe('kata "penting"\nbaris dua');
  });
});

describe("perlindungan formula spreadsheet", () => {
  const berbahaya = ["=SUM(A1:A9)", "+1+1", "-1+1", "@SUM(1)", "\tcmd"];

  function isiBaris(csv: string) {
    return parseCsv(csv.replace(/^﻿/, "")).slice(1);
  }

  it("tidak ada sel yang sampai ke spreadsheet diawali pemicu rumus", () => {
    const csv = toCsv(
      berbahaya.map((nilai) => ({ nilai })),
      [{ key: "nilai", label: "Nilai" }],
    );

    const barisMentah = csv
      .replace(/^﻿/, "")
      .split("\r\n")
      .slice(1)
      .filter(Boolean);

    expect(barisMentah).toHaveLength(berbahaya.length);
    for (const baris of barisMentah) {
      expect(baris.startsWith("'")).toBe(true);
      expect(/^[=+\-@\t]/.test(baris)).toBe(false);
    }
  });

  it("ekspor lalu impor menghasilkan nilai yang sama persis", () => {
    const csv = toCsv(
      berbahaya.map((nilai) => ({ nilai })),
      [{ key: "nilai", label: "Nilai" }],
    );

    expect(isiBaris(csv).map((baris) => baris[0])).toEqual(berbahaya);
  });

  it("tidak menyentuh nilai biasa", () => {
    const csv = toCsv(
      [{ nilai: "Konsumsi rapat" }],
      [{ key: "nilai", label: "Nilai" }],
    );

    expect(csv).toContain("Konsumsi rapat");
    expect(csv).not.toContain("'Konsumsi");
  });

  it("petik pelindung tidak dilepas dari teks yang memang diawali petik", () => {
    expect(
      isiBaris(toCsv([{ n: "'biasa" }], [{ key: "n", label: "N" }]))[0]![0],
    ).toBe("'biasa");
  });
});
