import { describe, expect, it } from "vitest";

import { getAvatarPresentation } from "@/lib/avatar";

/**
 * Uji avatar bawaan.
 *
 * Yang dikunci di sini adalah janji-janji yang mudah rusak diam-diam saat
 * konfigurasi library diutak-atik: avatar yang berubah setiap render, palet
 * yang kembali memuat hijau, atau unggahan pengguna yang kalah oleh gambar
 * bawaan.
 */

/** Membongkar data URI menjadi SVG agar warnanya dapat diperiksa. */
function svgDari(src: string) {
  expect(src.startsWith("data:image/svg+xml")).toBe(true);
  return decodeURIComponent(src.slice(src.indexOf(",") + 1));
}

function warnaDari(src: string) {
  return [...svgDari(src).matchAll(/#([0-9a-fA-F]{6})/g)].map((m) =>
    m[1]!.toLowerCase(),
  );
}

/** Kehijauan: komponen hijau jelas mengungguli merah DAN biru. */
function kehijauan(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return g > r + 25 && g > b + 25;
}

describe("Avatar bawaan", () => {
  it("unggahan pengguna selalu menang", () => {
    const hasil = getAvatarPresentation({
      customUrl: "https://contoh.test/foto.jpg?token=abc",
      gender: "L",
      identity: "profil-1",
    });

    expect(hasil.isCustom).toBe(true);
    expect(hasil.src).toBe("https://contoh.test/foto.jpg?token=abc");
  });

  it("dibangkitkan lokal sebagai data URI, bukan URL layanan luar", () => {
    const { src } = getAvatarPresentation({ identity: "profil-1" });

    expect(src.startsWith("data:image/svg+xml")).toBe(true);
    expect(src).not.toContain("dicebear.com");
    expect(src).not.toContain("http://");
    expect(src).not.toContain("https://");
  });

  it("identitas yang sama selalu menghasilkan avatar yang sama", () => {
    const a = getAvatarPresentation({ identity: "profil-1", gender: "L" });
    const b = getAvatarPresentation({ identity: "profil-1", gender: "L" });

    expect(a.src).toBe(b.src);
  });

  it("identitas berbeda menghasilkan avatar berbeda", () => {
    // Dua puluh identitas: kalau hanya satu wajah yang keluar per jenis
    // kelamin, daftar anggota akan tampak seperti kesalahan.
    const berbeda = new Set(
      Array.from(
        { length: 20 },
        (_, i) => getAvatarPresentation({ identity: `anggota-${i}` }).src,
      ),
    );

    expect(berbeda.size).toBeGreaterThanOrEqual(15);
  });

  it("tampilan laki-laki dan perempuan berbeda pada identitas yang sama", () => {
    const l = getAvatarPresentation({ identity: "sama", gender: "L" });
    const p = getAvatarPresentation({ identity: "sama", gender: "P" });
    const n = getAvatarPresentation({ identity: "sama", gender: null });

    expect(l.src).not.toBe(p.src);
    expect(l.src).not.toBe(n.src);
    expect(p.src).not.toBe(n.src);
  });

  it("jenis kelamin yang tidak tersimpan tetap menghasilkan avatar, bukan huruf awal", () => {
    for (const gender of [null, undefined] as const) {
      const { src, isCustom } = getAvatarPresentation({
        gender,
        identity: "tanpa-gender",
      });

      expect(isCustom).toBe(false);
      expect(svgDari(src).length).toBeGreaterThan(1000);
    }
  });

  it("tanpa identitas pun tidak melempar dan tetap stabil", () => {
    const a = getAvatarPresentation({});
    const b = getAvatarPresentation({});

    expect(a.src).toBe(b.src);
  });

  it("tidak ada warna hijau pada 150 avatar lintas jenis kelamin", () => {
    const pelanggar: string[] = [];

    for (const gender of ["L", "P", null] as const) {
      for (let i = 0; i < 50; i += 1) {
        const { src } = getAvatarPresentation({ gender, identity: `uji-${i}` });
        pelanggar.push(...warnaDari(src).filter(kehijauan));
      }
    }

    expect([...new Set(pelanggar)]).toEqual([]);
  });

  it("latar dan pakaian tetap berada dalam keluarga biru MIPNU", () => {
    const KELUARGA = new Set([
      "eef4ff",
      "c9d8ff",
      "ffffff",
      "1f356b",
      "255ed3",
      "2f6fed",
      "667085",
    ]);

    // Warna kulit, rambut, mata, dan mulut memang di luar palet biru — wajah
    // manusia tidak berwarna biru. Yang diperiksa adalah tidak munculnya
    // aksesori beraksen di luar keluarga (topi oranye, kupluk merah, ikat
    // rambut merah muda) yang dibuang dari kurasi.
    const AKSEN_TERLARANG = ["f29c65", "e15c66", "f55d81", "5a45ff", "dc5c7a"];

    const ditemukan = new Set<string>();
    let tanpaBiru = 0;

    for (const gender of ["L", "P", null] as const) {
      for (let i = 0; i < 40; i += 1) {
        const { src } = getAvatarPresentation({
          gender,
          identity: `warna-${i}`,
        });
        const warna = warnaDari(src);

        for (const w of warna) {
          if (AKSEN_TERLARANG.includes(w)) ditemukan.add(w);
        }

        // Setiap avatar harus benar-benar memakai palet MIPNU, bukan sekadar
        // tidak memakai warna terlarang.
        if (!warna.some((w) => KELUARGA.has(w))) tanpaBiru += 1;
      }
    }

    expect([...ditemukan]).toEqual([]);
    expect(tanpaBiru).toBe(0);
  });
});
