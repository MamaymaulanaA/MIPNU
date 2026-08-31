import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  Network,
  Briefcase,
  Building2,
  CalendarRange,
  FileChartColumn,
  FileText,
  FolderClosed,
  GraduationCap,
  Landmark,
  Megaphone,
  ReceiptText,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCog,
  Users,
  Users2,
  Vote,
  WalletCards,
} from "lucide-react";

import { PERMISSIONS, type Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Menu tampil hanya bila user memiliki permission ini. */
  permission: Permission;
};

export type NavGroup = {
  /** NULL untuk grup teratas yang tidak butuh judul. */
  label: string | null;
  items: NavItem[];
};

/**
 * Konfigurasi navigasi.
 *
 * Satu tempat, bukan logika permission yang ditulis ulang di tiap menu
 * (ARCHITECTURE.md §73). Menyembunyikan menu adalah kenyamanan, BUKAN
 * keamanan — setiap halaman tetap memeriksa haknya sendiri di server.
 *
 * Hanya modul yang halamannya BENAR-BENAR ADA yang terdaftar: menu yang
 * menuju halaman kosong lebih buruk daripada menu yang belum ada
 * (AGENTS.md §88).
 */
export const NAVIGATION: NavGroup[] = [
  {
    label: null,
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.organization.view,
      },
    ],
  },
  {
    label: "Organisasi",
    items: [
      {
        href: "/organisasi",
        label: "Profil Organisasi",
        icon: Building2,
        permission: PERMISSIONS.organization.view,
      },
      {
        href: "/organisasi/periode",
        label: "Periode",
        icon: CalendarRange,
        permission: PERMISSIONS.periods.view,
      },
      {
        href: "/organisasi/jabatan",
        label: "Jabatan",
        icon: Briefcase,
        permission: PERMISSIONS.positions.view,
      },
      {
        href: "/organisasi/kepengurusan",
        label: "Kepengurusan",
        icon: Network,
        permission: PERMISSIONS.management.view,
      },
    ],
  },
  {
    label: "Anggota",
    items: [
      {
        href: "/anggota",
        label: "Data Anggota",
        icon: Users,
        permission: PERMISSIONS.members.view,
      },
      {
        href: "/kaderisasi",
        label: "Kaderisasi",
        icon: GraduationCap,
        // view_own, bukan view: setiap anggota berhak melihat riwayat
        // kaderisasinya sendiri, dan halaman ini menyesuaikan isinya.
        permission: PERMISSIONS.cadreship.viewOwn,
      },
    ],
  },
  {
    label: "Kegiatan",
    items: [
      {
        href: "/agenda",
        label: "Agenda",
        icon: CalendarDays,
        permission: PERMISSIONS.agenda.view,
      },
      {
        href: "/program-kerja",
        label: "Program Kerja",
        icon: Target,
        permission: PERMISSIONS.programs.view,
      },
      {
        href: "/kegiatan",
        label: "Event",
        icon: CalendarDays,
        permission: PERMISSIONS.events.view,
      },
      {
        href: "/presensi",
        label: "Presensi",
        icon: ClipboardCheck,
        permission: PERMISSIONS.attendance.view,
      },
      {
        href: "/rapat",
        label: "Rapat",
        icon: Users2,
        permission: PERMISSIONS.meetings.view,
      },
    ],
  },
  {
    label: "Administrasi",
    items: [
      {
        href: "/surat",
        label: "Surat",
        icon: FileText,
        permission: PERMISSIONS.letters.view,
      },
      {
        href: "/dokumen",
        label: "Dokumen",
        icon: FolderClosed,
        permission: PERMISSIONS.documents.view,
      },
      {
        href: "/pengumuman",
        label: "Pengumuman",
        icon: Megaphone,
        permission: PERMISSIONS.announcements.view,
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        href: "/keuangan",
        label: "Ringkasan",
        icon: TrendingUp,
        permission: PERMISSIONS.finance.view,
      },
      {
        href: "/keuangan/akun",
        label: "Akun Kas",
        icon: Landmark,
        permission: PERMISSIONS.finance.view,
      },
      {
        href: "/keuangan/transaksi",
        label: "Transaksi",
        icon: ReceiptText,
        permission: PERMISSIONS.finance.view,
      },
      {
        href: "/keuangan/anggaran",
        label: "Anggaran",
        icon: WalletCards,
        permission: PERMISSIONS.finance.view,
      },
      {
        href: "/keuangan/laporan",
        label: "Laporan",
        icon: FileChartColumn,
        permission: PERMISSIONS.finance.viewReports,
      },
    ],
  },
  {
    // Satu pintu masuk saja. Kandidat, DPT, panitia, partisipasi, hasil, dan
    // audit adalah tab DI DALAM satu pemilihan — bukan enam menu sejajar yang
    // memaksa pengguna mengingat pemilihan mana yang sedang ia buka.
    label: "Pemilihan",
    items: [
      {
        href: "/pemilihan",
        label: "Pemilihan",
        icon: Vote,
        permission: PERMISSIONS.elections.view,
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        href: "/pengguna",
        label: "Pengguna",
        icon: UserCog,
        permission: PERMISSIONS.users.view,
      },
      {
        href: "/audit",
        label: "Audit Log",
        icon: FileClock,
        permission: PERMISSIONS.audit.view,
      },
    ],
  },
  {
    // Administrasi platform, bukan administrasi satu organisasi.
    // Hanya muncul bagi pemegang permission global.
    label: "Platform",
    items: [
      {
        href: "/admin/organisasi",
        label: "Semua Organisasi",
        icon: ShieldCheck,
        permission: PERMISSIONS.organization.create,
      },
    ],
  },
];

/**
 * Menu mana yang sedang aktif untuk sebuah alamat.
 *
 * Pemenangnya adalah PREFIKS TERPANJANG di seluruh katalog rute — dan
 * "seluruh katalog" itu penting, bukan hanya menu yang terlihat pengguna.
 *
 * Dua kekeliruan yang dihindari sekaligus:
 *
 *   1. Mencocokkan tiap item sendiri-sendiri dengan `startsWith` membuat
 *      `/organisasi/periode` menyalakan "Profil Organisasi" (`/organisasi`)
 *      DAN "Periode" bersamaan. Seluruh menu Keuangan punya masalah yang
 *      sama, karena `/keuangan` adalah awalan empat menu di bawahnya.
 *
 *   2. Menghitung pemenang hanya dari menu yang TERLIHAT membuat induknya
 *      menyala ketika anaknya disembunyikan permission — seorang pengurus
 *      yang membuka `/organisasi/periode` tanpa hak `periods.view` akan
 *      melihat "Profil Organisasi" menyala, yang salah menyebutkan posisinya.
 *      Bila pemenangnya tidak terlihat, jawabannya TIDAK ADA yang aktif.
 *
 * Halaman rincian tetap ikut induknya: `/anggota/{id}/edit` tidak dimiliki
 * item mana pun selain `/anggota`, jadi "Data Anggota" tetap menyala.
 */
export function resolveActiveHref(pathname: string): string | null {
  let terbaik: string | null = null;

  for (const group of NAVIGATION) {
    for (const item of group.items) {
      const href = item.href as string;
      const cocok = pathname === href || pathname.startsWith(`${href}/`);

      if (cocok && (terbaik === null || href.length > terbaik.length)) {
        terbaik = href;
      }
    }
  }

  return terbaik;
}

/** Menyaring navigasi berdasarkan permission efektif user. */
export function filterNavigation(permissions: ReadonlySet<string>): NavGroup[] {
  return NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}
