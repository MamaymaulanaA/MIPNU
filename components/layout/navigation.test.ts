import { describe, expect, it } from "vitest";

import {
  NAVIGATION,
  filterNavigation,
  resolveActiveHref,
} from "@/components/layout/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Navigasi disaring permission.
 *
 * Ini soal tampilan, bukan keamanan — tetapi tetap diuji, karena menu yang
 * bocor ke role yang salah adalah gejala pertama resolver permission yang
 * melenceng.
 */
describe("filterNavigation", () => {
  it("tidak menampilkan apa pun tanpa permission", () => {
    expect(filterNavigation(new Set())).toEqual([]);
  });

  it("membuang grup yang seluruh itemnya tersaring", () => {
    const anggota = new Set<string>([
      PERMISSIONS.organization.view,
      PERMISSIONS.agenda.view,
      PERMISSIONS.events.view,
    ]);

    const groups = filterNavigation(anggota);
    const labels = groups.flatMap((group) =>
      group.items.map((item) => item.label),
    );

    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Agenda");

    // Tanpa members.view, menu anggota tidak boleh muncul sama sekali.
    expect(labels).not.toContain("Data Anggota");
    expect(labels).not.toContain("Audit Log");
    expect(labels).not.toContain("Pengguna");

    expect(groups.every((group) => group.items.length > 0)).toBe(true);
  });

  it("menampilkan menu administratif untuk operator", () => {
    const operator = new Set<string>([
      PERMISSIONS.organization.view,
      PERMISSIONS.members.view,
      PERMISSIONS.periods.view,
      PERMISSIONS.management.view,
      PERMISSIONS.agenda.view,
      PERMISSIONS.events.view,
      PERMISSIONS.attendance.view,
      PERMISSIONS.users.view,
      PERMISSIONS.audit.view,
    ]);

    const labels = filterNavigation(operator).flatMap((group) =>
      group.items.map((item) => item.label),
    );

    expect(labels).toContain("Data Anggota");
    expect(labels).toContain("Kepengurusan");
    expect(labels).toContain("Pengguna");
  });

  it("setiap item navigasi terikat pada satu permission", () => {
    for (const group of NAVIGATION) {
      for (const item of group.items) {
        expect(item.permission).toMatch(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/);
      }
    }
  });
});

/**
 * Penanda menu aktif.
 *
 * Bug yang dikunci di sini nyata dan pernah terlihat: `/organisasi/periode`
 * menyalakan "Profil Organisasi" dan "Periode" sekaligus, karena setiap item
 * dicocokkan sendiri-sendiri dengan `startsWith`.
 */
describe("resolveActiveHref", () => {
  it("submenu mengalahkan induknya", () => {
    expect(resolveActiveHref("/organisasi/periode")).toBe(
      "/organisasi/periode",
    );
    expect(resolveActiveHref("/organisasi/jabatan")).toBe(
      "/organisasi/jabatan",
    );
    expect(resolveActiveHref("/organisasi/kepengurusan")).toBe(
      "/organisasi/kepengurusan",
    );
    expect(resolveActiveHref("/organisasi")).toBe("/organisasi");
  });

  it("seluruh menu keuangan tidak saling menyalakan", () => {
    expect(resolveActiveHref("/keuangan")).toBe("/keuangan");
    expect(resolveActiveHref("/keuangan/akun")).toBe("/keuangan/akun");
    expect(resolveActiveHref("/keuangan/transaksi")).toBe(
      "/keuangan/transaksi",
    );
    expect(resolveActiveHref("/keuangan/anggaran")).toBe("/keuangan/anggaran");
    expect(resolveActiveHref("/keuangan/laporan")).toBe("/keuangan/laporan");
  });

  it("halaman rincian tetap menyalakan menu induknya", () => {
    expect(resolveActiveHref("/anggota/abc-123")).toBe("/anggota");
    expect(resolveActiveHref("/anggota/impor")).toBe("/anggota");
    expect(resolveActiveHref("/pemilihan/abc-123/live")).toBe("/pemilihan");
    expect(resolveActiveHref("/rapat/abc-123")).toBe("/rapat");
  });

  it("tepat satu menu aktif untuk setiap rute menu", () => {
    for (const group of NAVIGATION) {
      for (const item of group.items) {
        const aktif = NAVIGATION.flatMap((g) => g.items).filter(
          (kandidat) => kandidat.href === resolveActiveHref(item.href),
        );

        expect(aktif, `rute ${item.href}`).toHaveLength(1);
        expect(aktif[0]!.href).toBe(item.href);
      }
    }
  });

  it("alamat di luar navigasi tidak menyalakan apa pun", () => {
    expect(resolveActiveHref("/profil")).toBeNull();
    expect(resolveActiveHref("/")).toBeNull();
  });

  it("awalan yang mirip tidak dianggap cocok", () => {
    expect(resolveActiveHref("/anggotaan")).toBeNull();
    expect(resolveActiveHref("/keuangan-lain")).toBeNull();
  });
});
