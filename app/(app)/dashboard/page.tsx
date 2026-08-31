import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/states";
import { BATAS_PRATINJAU } from "@/features/dashboard/components/cards";
import { OrganizationDashboard } from "@/features/dashboard/components/organization-dashboard";
import { PlatformDashboard } from "@/features/dashboard/components/platform-dashboard";
import {
  getAccountPreview,
  getPlatformGrowth,
  getPlatformQuickInfo,
  getSystemActivity,
} from "@/features/dashboard/queries/platform-insight";
import {
  getActivitySeries,
  getInsightSummary,
} from "@/features/dashboard/queries/activity-series";
import { getElectionSummary } from "@/features/dashboard/queries/election-summary";
import { getLatestAdministration } from "@/features/dashboard/queries/latest-administration";
import { getOperationalAttention } from "@/features/dashboard/queries/operational-attention";
import { getOperationalSummary } from "@/features/dashboard/queries/operational-summary";
import { getRecentActivity } from "@/features/dashboard/queries/dashboard-sections";
import {
  getOrganizationStats,
  getPlatformStats,
} from "@/features/dashboard/queries/organization-summary";
import { getUpcomingSchedule } from "@/features/dashboard/queries/upcoming-schedule";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard role-aware.
 *
 * Halaman ini hanya MENGUMPULKAN data dan memilih dashboard mana yang dirender;
 * seluruh tampilannya ada di `features/dashboard/components`. Pemisahan itu
 * yang membuat aturan pentingnya terlihat di satu tempat: setiap query di bawah
 * didahului pemeriksaan permission, sehingga baris yang tidak boleh dilihat
 * tidak pernah diambil — bukan diambil lalu disembunyikan di browser
 * (docs/PERMISSIONS.md §76).
 *
 * Angka agregatnya sendiri datang dari `mipnu_organization_stats()` dan
 * `mipnu_platform_stats()`, yang menyaring haknya sendiri di dalam database.
 * Tidak ada satu pun angka hardcoded di halaman ini (PRD §64).
 */

/**
 * Sisa masa periode, dihitung dari tanggal akhir yang MEMANG tersimpan.
 *
 * Tidak ada nilai yang dikarang: bila tanggalnya tidak terbaca, jawabannya
 * NULL dan lencananya tidak muncul sama sekali. Satuannya menyesuaikan supaya
 * "0 tahun tersisa" tidak pernah terjadi pada periode yang tinggal beberapa
 * bulan.
 */
type SisaPeriode = {
  /** Kalimat penuh untuk lencana di kepala halaman. */
  text: string;
  /** Dua bagian pendek untuk sudut kartu metrik. */
  short: string;
  caption: string;
};

function sisaMasaPeriode(endDate: string): SisaPeriode | null {
  const akhir = new Date(endDate);
  if (Number.isNaN(akhir.getTime())) return null;

  const hari = Math.ceil((akhir.getTime() - Date.now()) / 86_400_000);

  if (hari < 0)
    return {
      text: "Periode telah berakhir",
      short: "Berakhir",
      caption: "periode",
    };
  if (hari === 0)
    return {
      text: "Berakhir hari ini",
      short: "Hari ini",
      caption: "berakhir",
    };
  if (hari < 31)
    return {
      text: `${hari} hari tersisa`,
      short: `${hari} hari`,
      caption: "tersisa",
    };

  const bulan = Math.floor(hari / 30);
  if (bulan < 12)
    return {
      text: `${bulan} bulan tersisa`,
      short: `${bulan} bln`,
      caption: "tersisa",
    };

  const tahun = Math.floor(bulan / 12);
  return {
    text: `${tahun} tahun tersisa`,
    short: `${tahun} thn`,
    caption: "tersisa",
  };
}

export default async function DashboardPage() {
  const context = await requireAccessContext();

  // Administrator platform: satu-satunya tempat angka lintas organisasi
  // ditampilkan, dan hanya berisi agregat — tanpa data tenant privat.
  const platformStats = can(context, PERMISSIONS.reports.viewGlobal)
    ? await getPlatformStats()
    : null;

  // Administrator platform mendapat dashboardnya SENDIRI, bukan varian
  // dashboard organisasi. Peran ini membaca organizations/profiles/audit_logs
  // sementara members, announcements, dan meetings mengembalikan nol baris
  // untuknya — satu dashboard universal hanya akan menampilkan angka nol yang
  // salah artinya.
  if (platformStats) {
    const [growth, system, quickInfo, activity, accounts] = await Promise.all([
      getPlatformGrowth(),
      getSystemActivity(),
      getPlatformQuickInfo(),
      can(context, PERMISSIONS.audit.view) && context.organizationId
        ? getRecentActivity(context.organizationId, BATAS_PRATINJAU)
        : [],
      // Daftar akun tunduk pada permission-nya sendiri: yang tidak berhak
      // membuka modul Pengguna tidak menerima barisnya di payload RSC.
      can(context, PERMISSIONS.users.view) ? getAccountPreview() : [],
    ]);

    return (
      <PlatformDashboard
        displayName={context.displayName}
        stats={platformStats}
        growth={growth}
        system={system}
        quickInfo={quickInfo}
        activity={activity}
        accounts={accounts}
      />
    );
  }

  if (!context.organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Selamat datang, ${context.displayName}`}
          description="Akun Anda belum terhubung ke organisasi."
        />

        <div className="mx-auto max-w-2xl">
          <Card>
            <EmptyState
              icon={Building2}
              title="Belum terhubung ke organisasi"
              description={
                context.isSuperAdmin
                  ? "Akun Anda adalah administrator platform. Buat organisasi terlebih dahulu, lalu tautkan operator ke organisasi tersebut."
                  : "Akun Anda belum ditautkan ke organisasi mana pun. Hubungi operator organisasi Anda untuk mendapatkan akses."
              }
              action={
                can(context, PERMISSIONS.organization.create) ? (
                  <Button size="sm" asChild>
                    <Link href="/admin/organisasi/baru">Buat Organisasi</Link>
                  </Button>
                ) : undefined
              }
            />
          </Card>
        </div>
      </div>
    );
  }

  // Setiap bagian diambil HANYA bila haknya ada. Tanpa hak, query-nya tidak
  // pernah berjalan — jadi tidak ada baris yang perlu disembunyikan kemudian.
  const bolehLihatAudit = can(context, PERMISSIONS.audit.view);
  const bolehLihatPemilihan = can(context, PERMISSIONS.elections.view);

  /*
   * Gerbang daftar tindak lanjut memakai permission PENANGANAN, bukan
   * permission melihat. Yang tidak dapat menautkan akun tidak perlu tahu
   * berapa anggota yang belum punya akun — angka itu menjadi pekerjaan orang
   * lain, dan dashboard bukan tempat membebankannya.
   */
  const gerbangTindakLanjut = {
    linkAccounts: can(context, PERMISSIONS.users.assignOrganization),
    memberStatus: can(context, PERMISSIONS.members.manageStatus),
    attendance: can(context, PERMISSIONS.attendance.manage),
    announcements: can(context, PERMISSIONS.announcements.publish),
    events: can(context, PERMISSIONS.events.publish),
  };

  // Sumber grafik ditentukan per-modul: yang tidak boleh dilihat tidak ikut
  // dihitung, sehingga jumlah rapat organisasi tidak bocor lewat sebuah garis.
  const sumberKegiatan = {
    agenda: can(context, PERMISSIONS.agenda.view),
    events: can(context, PERMISSIONS.events.view),
    meetings: can(context, PERMISSIONS.meetings.view),
  };

  /*
   * Gerbang ringkasan struktur memakai permission PENYUNTINGAN. Jabatan dan
   * periode boleh dilihat hampir semua pengurus; yang memeliharanya operator.
   */
  const gerbangOperasional = {
    positions: can(context, PERMISSIONS.positions.edit),
    periods: can(context, PERMISSIONS.periods.edit),
    accounts: can(context, PERMISSIONS.users.view),
  };

  const sumberAdministrasi = {
    documents: can(context, PERMISSIONS.documents.view),
    announcements: can(context, PERMISSIONS.announcements.view),
  };

  const [
    stats,
    jadwal,
    activity,
    series,
    ringkasan,
    pemilihan,
    administrasi,
    operasional,
  ] = await Promise.all([
    getOrganizationStats(context.organizationId),
    // Satu daftar jadwal, digabung dari sumber yang memang boleh dilihat.
    // Satu batas pratinjau untuk seluruh dashboard, dan batas itu juga yang
    // menentukan tinggi slot kartunya. Daftar penuhnya ada di modul masing-
    // masing lewat "Lihat semua".
    getUpcomingSchedule(
      context.organizationId,
      sumberKegiatan,
      BATAS_PRATINJAU,
    ),
    bolehLihatAudit
      ? getRecentActivity(context.organizationId, BATAS_PRATINJAU)
      : null,
    getActivitySeries(context.organizationId, sumberKegiatan),
    getInsightSummary(context.organizationId, sumberAdministrasi),
    // Ringkasan pemilihan TIDAK PERNAH memuat perolehan kandidat — lihat
    // catatan pada `getElectionSummary`. Yang dibacanya hanya status dan
    // partisipasi.
    bolehLihatPemilihan ? getElectionSummary(context.organizationId) : null,
    getLatestAdministration(
      context.organizationId,
      sumberAdministrasi,
      BATAS_PRATINJAU,
    ),
    getOperationalSummary(context.organizationId, gerbangOperasional),
  ]);

  // Dijalankan setelah agregatnya ada: jumlah anggota tanpa akun dihitung dari
  // selisih terhadap jumlah anggota, dan angka itu datang dari `stats`.
  const tindakLanjut = await getOperationalAttention(
    context.organizationId,
    gerbangTindakLanjut,
    stats?.members?.total ?? null,
  );

  const period = stats?.active_period ?? null;

  return (
    <OrganizationDashboard
      displayName={context.displayName}
      stats={stats}
      period={period}
      remaining={period ? sisaMasaPeriode(period.end_date) : null}
      series={series}
      summary={ringkasan}
      schedule={jadwal}
      activity={activity}
      election={pemilihan}
      attention={tindakLanjut}
      administration={administrasi}
      administrationSources={sumberAdministrasi}
      scheduleSources={sumberKegiatan}
      operational={operasional}
    />
  );
}
