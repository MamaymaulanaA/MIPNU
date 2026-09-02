import { describe, expect, it } from "vitest";

import { deltaBulanTerakhir } from "@/features/dashboard/queries/growth-delta";

/*
 * Regresi: kartu "Total Organisasi" pernah menampilkan "-6 vs bulan lalu"
 * ketika totalnya justru naik dari 7 ke 8. Penyebabnya delta dihitung sebagai
 * selisih antar LAJU pertambahan (Sep 1 - Agu 7 = -6), padahal angka yang
 * didampinginya kumulatif.
 */
describe("deltaBulanTerakhir", () => {
  it("melaporkan pertambahan bulan terakhir, bukan selisih antar laju", () => {
    // Agustus menambah 7 organisasi, September menambah 1.
    // Total naik 7 -> 8, jadi deltanya +1.
    expect(deltaBulanTerakhir([0, 0, 0, 0, 7, 1])).toBe(1);
  });

  it("tidak pernah negatif ketika tidak ada yang dihapus", () => {
    const deret = [3, 9, 2, 0, 5, 4];
    expect(deltaBulanTerakhir(deret)).toBeGreaterThanOrEqual(0);
  });

  it("bulan tanpa pertambahan menghasilkan nol, bukan angka minus", () => {
    expect(deltaBulanTerakhir([12, 0])).toBe(0);
  });

  it("deret kosong tidak menghasilkan delta", () => {
    expect(deltaBulanTerakhir([])).toBeNull();
  });

  it("satu bulan pertama tetap dilaporkan", () => {
    expect(deltaBulanTerakhir([4])).toBe(4);
  });
});
