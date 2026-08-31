import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  History,
  KeyRound,
  Megaphone,
  Network,
  Presentation,
  Send,
  Target,
  UserCheck,
  UserRoundPlus,
  UserRoundX,
  Users,
  Vote,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { Aksen } from "@/features/dashboard/components/accent";
import { ActivityChart } from "@/features/dashboard/components/activity-chart";
import {
  BATAS_PRATINJAU,
  EmptyNote,
  IconBox,
  ItemList,
  ItemValue,
  LENCANA_RINGKAS,
  ListItem,
  MetricCard,
  Panel,
  ProgressRow,
  SeeAll,
  SLOT_KONTEN,
  StatGrid,
  SummaryList,
  type SummaryRow,
} from "@/features/dashboard/components/cards";
import { ActivityList } from "@/features/dashboard/components/platform-dashboard";
import type {
  ActivitySeries,
  InsightSummary,
} from "@/features/dashboard/queries/activity-series";
import type { ActivityItem } from "@/features/dashboard/queries/dashboard-sections";
import type { ElectionSummary } from "@/features/dashboard/queries/election-summary";
import type {
  AdministrationItem,
  AdministrationKind,
  AdministrationSources,
} from "@/features/dashboard/queries/latest-administration";
import type {
  AttentionItem,
  AttentionKey,
} from "@/features/dashboard/queries/operational-attention";
import type { OperationalRow } from "@/features/dashboard/queries/operational-summary";
import type { OrganizationStats } from "@/features/dashboard/queries/organization-summary";
import type {
  ScheduleItem,
  ScheduleKind,
  ScheduleSources,
} from "@/features/dashboard/queries/upcoming-schedule";
import {
  formatDate,
  formatTime,
  formatShortDate,
  formatNumber,
  formatPeriodRange,
  formatRupiah,
} from "@/lib/format";
import { electionStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Dashboard organisasi.
 *
 * Berorientasi ORGANISASI, bukan platform: pertanyaannya bukan "berapa
 * organisasi yang ada" melainkan "bagaimana keadaan organisasi saya" —
 * anggotanya, kepengurusannya, programnya, kasnya, dan apa yang akan terjadi
 * minggu ini.
 *
 * Susunannya berangkat dari satu kenyataan tentang perannya: seorang pengurus
 * memegang belasan modul sekaligus. Karena itu setelah empat angka terpenting
 * ada KISI MODUL — satu sel pendek per modul yang boleh dibukanya, lengkap
 * dengan angkanya sendiri. Satu pindai memberi tahu apa yang bergerak di
 * seluruh organisasi, dan setiap sel adalah pintu ke modulnya.
 *
 * Isinya ditentukan seluruhnya oleh permission. Setiap blok agregat datang
 * NULL dari `mipnu_organization_stats()` bila pemanggil tidak berhak, dan
 * daftar baris sudah ditahan di lapisan pemanggil — jadi yang tidak boleh
 * dilihat tidak pernah masuk payload, bukan dirender lalu disembunyikan.
 */

/** Bulan singkat untuk kotak tanggal agenda. */
const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

type Kandidat = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Aksen;
  href: React.ComponentProps<typeof Link>["href"];
  /** Keterangan di bawah angka ketika kandidat ini menjadi kartu metrik. */
  description?: string;
  /** Pembanding di sudut kanan kartu metrik. */
  noteValue?: string;
  noteLabel?: string;
  /** Keterangan ketika kandidat ini turun menjadi sel modul. */
  caption: string;
};

/**
 * Satu daftar kandidat, berurutan menurut kepentingannya bagi pengurus.
 *
 * Empat pertama yang tersedia naik menjadi kartu metrik; sisanya turun menjadi
 * sel modul. Satu daftar, bukan dua, supaya tidak ada angka yang muncul dua
 * kali — dan supaya peran dengan tiga permission tetap mendapat kartu metrik
 * alih-alih baris kosong.
 */
function susunKandidat(
  stats: OrganizationStats,
  summary: InsightSummary,
  periodName?: string,
  sisa?: { short: string; caption: string } | null,
  /** Tanggal terdekat per jenis jadwal, untuk sudut kanan kartunya. */
  terdekat?: Partial<Record<ScheduleKind, string>>,
  /** NULL berarti pemanggil tidak berhak melihat pemilihan sama sekali. */
  election?: ElectionSummary | null,
) {
  const kandidat: Kandidat[] = [];

  if (stats.members) {
    kandidat.push({
      label: "Total Anggota",
      value: formatNumber(stats.members.total),
      description: `${formatNumber(stats.members.active)} aktif`,
      icon: Users,
      tone: "blue",
      href: "/anggota",
      noteValue: formatNumber(stats.members.alumni),
      noteLabel: "alumni",
      caption: `${formatNumber(stats.members.active)} aktif`,
    });
  }

  if (stats.management) {
    kandidat.push({
      label: "Pengurus Aktif",
      value: formatNumber(stats.management.active),
      description: periodName ?? "Tanpa periode aktif",
      icon: Network,
      tone: "cyan",
      href: "/organisasi/kepengurusan",
      // Sudut kanan kartu diisi sisa masa periode — dihitung dari tanggal
      // akhir yang memang tersimpan, bukan pembanding yang dikarang.
      noteValue: sisa?.short,
      noteLabel: sisa?.caption,
      caption: periodName ?? "Tanpa periode aktif",
    });
  }

  if (stats.programs) {
    kandidat.push({
      label: "Program Berjalan",
      value: formatNumber(stats.programs.ongoing),
      description:
        stats.programs.total > 0
          ? `dari ${formatNumber(stats.programs.total)} program`
          : "Belum ada program periode ini",
      icon: Target,
      tone: "purple",
      href: "/program-kerja",
      noteValue:
        stats.programs.total > 0
          ? formatNumber(stats.programs.completed)
          : undefined,
      noteLabel: stats.programs.total > 0 ? "selesai" : undefined,
      caption:
        stats.programs.total > 0
          ? `${formatNumber(stats.programs.completed)} selesai`
          : "Periode ini",
    });
  }

  if (stats.finance) {
    kandidat.push({
      label: "Saldo Kas",
      value: formatRupiah(stats.finance.balance),
      description: `Masuk ${formatRupiah(stats.finance.income_30d)} · keluar ${formatRupiah(stats.finance.expense_30d)}`,
      icon: Wallet,
      tone: "amber",
      href: "/keuangan",
      noteValue:
        stats.finance.draft_count > 0
          ? formatNumber(stats.finance.draft_count)
          : undefined,
      noteLabel: stats.finance.draft_count > 0 ? "draf" : undefined,
      caption:
        stats.finance.draft_count > 0
          ? `${formatNumber(stats.finance.draft_count)} draf menunggu`
          : "Saldo kas",
    });
  }

  if (stats.agenda) {
    kandidat.push({
      label: "Agenda",
      value: formatNumber(stats.agenda.upcoming),
      description: "Terjadwal",
      icon: CalendarDays,
      tone: "blue",
      href: "/agenda",
      // Sudut kanan diisi tanggal terdekatnya — diambil dari daftar jadwal
      // yang sudah dimuat, bukan dari query tambahan.
      noteValue: terdekat?.agenda,
      noteLabel: terdekat?.agenda ? "terdekat" : undefined,
      caption: "Mendatang",
    });
  }

  if (stats.events) {
    kandidat.push({
      label: "Event",
      value: formatNumber(stats.events.upcoming),
      description:
        stats.events.ongoing > 0
          ? `${formatNumber(stats.events.ongoing)} sedang berlangsung`
          : "Terjadwal",
      icon: CalendarRange,
      tone: "rose",
      href: "/kegiatan",
      noteValue: terdekat?.event,
      noteLabel: terdekat?.event ? "terdekat" : undefined,
      caption:
        stats.events.ongoing > 0
          ? `${formatNumber(stats.events.ongoing)} berlangsung`
          : "Mendatang",
    });
  }

  if (stats.meetings) {
    kandidat.push({
      label: "Rapat",
      value: formatNumber(stats.meetings.upcoming),
      description: "Terjadwal",
      icon: Presentation,
      tone: "cyan",
      href: "/rapat",
      noteValue: terdekat?.meeting,
      noteLabel: terdekat?.meeting ? "terdekat" : undefined,
      caption: "Mendatang",
    });
  }

  if (stats.attendance) {
    const persen =
      stats.attendance.expected > 0
        ? Math.round(
            (stats.attendance.present / stats.attendance.expected) * 100,
          )
        : null;

    kandidat.push({
      label: "Presensi",
      value: formatNumber(stats.attendance.sessions),
      description: "Sesi tercatat",
      icon: UserCheck,
      tone: "cyan",
      href: "/presensi",
      noteValue: persen === null ? undefined : `${persen}%`,
      noteLabel: persen === null ? undefined : "hadir",
      caption:
        persen === null ? "Peserta belum tercatat" : `${persen}% kehadiran`,
    });
  }

  if (stats.letters) {
    kandidat.push({
      label: "Surat",
      value: formatNumber(stats.letters.incoming_30d),
      description: "Masuk 30 hari terakhir",
      icon: FileText,
      tone: "slate",
      href: "/surat",
      // Nol tetap ditampilkan. Kartu lain pada baris yang sama menampilkan
      // "0 alumni" dan "0 selesai"; menyembunyikan nol di sini membuat satu
      // kartu berakhir tanpa sudut kanan sementara tiga tetangganya punya.
      noteValue: formatNumber(stats.letters.outgoing_draft),
      noteLabel: "draf keluar",
      caption:
        stats.letters.outgoing_draft > 0
          ? `${formatNumber(stats.letters.outgoing_draft)} draf keluar`
          : "Masuk 30 hari",
    });
  }

  if (summary.documents !== null) {
    kandidat.push({
      label: "Dokumen",
      value: formatNumber(summary.documents),
      description: "12 bulan terakhir",
      icon: FolderOpen,
      tone: "amber",
      href: "/dokumen",
      caption: "12 bulan terakhir",
    });
  }

  if (stats.announcements) {
    kandidat.push({
      label: "Pengumuman",
      value: formatNumber(stats.announcements.active),
      description: "Aktif",
      icon: Megaphone,
      tone: "rose",
      href: "/pengumuman",
      caption: "Sedang aktif",
    });
  }

  /*
   * Pemilihan, terakhir dalam urutan.
   *
   * Alasannya bukan urutan penting, melainkan siapa yang membutuhkannya
   * sebagai KARTU. Peran dengan banyak permission sudah punya delapan kartu
   * sebelum sampai ke sini dan tetap mendapat panel Pemilihan tersendiri;
   * seorang anggota hanya punya tiga, dan bagi dialah kartu ini melengkapi
   * baris sekaligus menaruh pemilihan di tempat yang pertama terlihat.
   *
   * Angkanya aman ditampilkan pada status apa pun: jumlah pemilihan, berapa
   * yang sedang berlangsung, dan partisipasi — tidak satu pun menyentuh
   * perolehan kandidat, DPT, atau isi surat suara.
   */
  if (election) {
    const berlangsung =
      election.byStatus.find((row) => row.status === "OPEN")?.total ?? 0;
    const partisipasi = election.focus?.participation ?? null;

    kandidat.push({
      label: "Pemilihan",
      value: formatNumber(election.total),
      description:
        berlangsung > 0
          ? `${formatNumber(berlangsung)} sedang berlangsung`
          : "Tidak ada yang berlangsung",
      icon: Vote,
      tone: "purple",
      href: "/pemilihan",
      noteValue: partisipasi ? `${partisipasi.percent}%` : undefined,
      noteLabel: partisipasi ? "partisipasi" : undefined,
      caption:
        berlangsung > 0
          ? `${formatNumber(berlangsung)} berlangsung`
          : "Tercatat pada organisasi",
    });
  }

  return kandidat;
}

/**
 * Ikon dan aksen per sumber kegiatan.
 *
 * Kuncinya adalah label yang dipakai lapisan query ("Agenda", "Event",
 * "Rapat"); sumber yang tidak dikenali tetap tergambar, hanya dengan ikon
 * kalender netral.
 */
const SUMBER_RUPA: Record<string, { icon: LucideIcon; tone: Aksen }> = {
  Agenda: { icon: CalendarDays, tone: "blue" },
  Event: { icon: CalendarRange, tone: "rose" },
  Rapat: { icon: Presentation, tone: "cyan" },
};

/* -------------------------------------------------- jadwal terdekat */

/**
 * Subjudul panel jadwal, disusun dari sumber yang MEMANG boleh dilihat.
 *
 * Sebelumnya tertulis tetap "Agenda, event, dan rapat". Seorang anggota tidak
 * berhak melihat rapat, jadi kalimat itu menjanjikan sesuatu yang tidak akan
 * pernah muncul di daftarnya — dan ketiadaannya lalu terbaca sebagai
 * organisasi yang tidak pernah rapat, bukan sebagai hak yang tidak dimiliki.
 */
function subjudulJadwal(sources: ScheduleSources) {
  const bagian = [
    sources.agenda ? "agenda" : null,
    sources.events ? "event" : null,
    sources.meetings ? "rapat" : null,
  ].filter((x) => x !== null);

  if (bagian.length === 0) return "Belum ada sumber jadwal";

  // Koma hanya muncul mulai tiga bagian: dua bagian dirangkai "agenda dan
  // event", bukan "agenda, dan event".
  const kalimat =
    bagian.length === 1
      ? bagian[0]!
      : bagian.length === 2
        ? `${bagian[0]} dan ${bagian[1]}`
        : `${bagian.slice(0, -1).join(", ")}, dan ${bagian[bagian.length - 1]}`;

  return kalimat.charAt(0).toUpperCase() + kalimat.slice(1);
}

/** Label dan nada per jenis jadwal. Bukan status, jadi nadanya tenang. */
const JADWAL_RUPA: Record<ScheduleKind, { label: string; tone: BadgeTone }> = {
  agenda: { label: "Agenda", tone: "info" },
  event: { label: "Event", tone: "primary" },
  meeting: { label: "Rapat", tone: "neutral" },
};

/**
 * Jadwal terdekat.
 *
 * Satu daftar berurut waktu untuk agenda, event, dan rapat sekaligus —
 * penggabungannya sudah terjadi di lapisan query, lengkap dengan penyaringan
 * haknya. Yang tersisa di sini hanya menggambarnya.
 */
/**
 * Kotak tanggal.
 *
 * Sudutnya 6px, sama dengan wadah ikon pada panel Administrasi di sebelahnya —
 * bukan 10px. Lengkung besar pada kotak selebar 36px membuatnya terbaca
 * sebagai kapsul yang gagal alih-alih sebagai penanggalan.
 *
 * Tiga baris, bukan dua: bulan menjawab "kapan", tanggal menjawab "kapan
 * tepatnya", dan tahun menjaga agar jadwal yang jatuh tahun depan tidak
 * terbaca seperti minggu ini.
 *
 * Ukurannya DIKUNCI ke `size-7`, sama persis dengan `IconBox`.
 *
 * Sebelumnya kotaknya memakai `w-9` dengan padding sendiri dan berakhir 36px
 * lebar, 35px tinggi — diukur di peramban pada 1440px. Akibatnya baris Jadwal
 * setinggi 53px sementara baris Pengumuman di sebelahnya 50px, dan dua daftar
 * yang berdampingan terbaca sebagai dua kerapatan yang berbeda.
 *
 * Tiga baris isinya berjumlah 29px (8 + 13 + 8), jadi muat di dalam 32px tanpa
 * padding tambahan. Yang dihapus memang paddingnya: sebuah penanda yang harus
 * sejajar dengan penanda lain tidak boleh menentukan ukurannya sendiri.
 */
function DateTile({ date }: { date: Date }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-sm border border-primary-border bg-primary-soft leading-none"
    >
      <span className="text-[8px] font-semibold tracking-wide text-primary uppercase">
        {BULAN_SINGKAT[date.getMonth()]}
      </span>
      <span className="text-[13px] font-semibold text-foreground">
        {date.getDate()}
      </span>
      <span className="text-[8px] text-muted-foreground">
        {date.getFullYear()}
      </span>
    </span>
  );
}

function ScheduleList({ items }: { items: ScheduleItem[] }) {
  return (
    <ItemList>
      {items.map((item) => {
        const rupa = JADWAL_RUPA[item.kind];

        return (
          <ListItem
            key={item.id}
            leading={<DateTile date={new Date(item.startAt)} />}
            title={item.title}
            // Tanggalnya sudah terbaca pada kotak di sebelah kiri; baris ini
            // menjawab yang belum terjawab — jam dan tempatnya.
            meta={`${formatTime(item.startAt)} WIB${
              item.location ? ` · ${item.location}` : ""
            }`}
            trailing={
              <Badge tone={rupa.tone} className={LENCANA_RINGKAS}>
                {rupa.label}
              </Badge>
            }
          />
        );
      })}
    </ItemList>
  );
}

/* --------------------------------------------- struktur organisasi */

const OPERASIONAL_RUPA: Record<
  OperationalRow["key"],
  { icon: LucideIcon; tone: Aksen }
> = {
  jabatan: { icon: Briefcase, tone: "purple" },
  periode: { icon: CalendarRange, tone: "slate" },
  akun: { icon: KeyRound, tone: "cyan" },
};

/** Menerjemahkan angka struktur menjadi baris ringkasan yang sama bentuknya. */
function barisOperasional(rows: OperationalRow[]): SummaryRow[] {
  return rows.map((row) => ({
    label: row.label,
    value: formatNumber(row.value),
    context: row.context,
    icon: OPERASIONAL_RUPA[row.key].icon,
    tone: OPERASIONAL_RUPA[row.key].tone,
  }));
}

/* ------------------------------------------------ administrasi terbaru */

const ADMIN_RUPA: Record<
  AdministrationKind,
  { icon: LucideIcon; tone: Aksen; label: string }
> = {
  document: { icon: FolderOpen, tone: "amber", label: "Dokumen" },
  announcement: { icon: Megaphone, tone: "rose", label: "Pengumuman" },
};

/**
 * Berkas dan pengumuman terbaru.
 *
 * Pelengkap kartu metrik yang hanya menyebut jumlah: di sini terlihat yang
 * mana dan kapan. Judul dan waktu saja — isi dokumennya punya modulnya
 * sendiri, dan dashboard tidak perlu ikut membukanya.
 */
function AdministrationPanel({
  items,
  sources,
}: {
  items: AdministrationItem[];
  /** Sumber yang MEMANG boleh dilihat pemanggil — bukan yang kebetulan ada. */
  sources: AdministrationSources;
}) {
  /*
   * Judulnya mengikuti HAK, bukan isi yang kebetulan termuat.
   *
   * Seorang anggota tidak berhak atas dokumen administratif; menyebut
   * panelnya "Administrasi Terbaru" menjanjikan sesuatu yang tidak akan
   * pernah muncul di sana. Menurunkan judul dari kind baris yang terbaca juga
   * salah: satu bulan tanpa dokumen akan mengganti judul panel seorang
   * pengurus, lalu mengembalikannya bulan berikutnya.
   */
  const rupa =
    sources.documents && sources.announcements
      ? {
          title: "Administrasi Terbaru",
          subtitle: "Dokumen & pengumuman",
          href: "/dokumen" as const,
          kosong: "Belum ada dokumen atau pengumuman terbaru.",
          icon: FolderOpen,
        }
      : sources.documents
        ? {
            title: "Dokumen Terbaru",
            subtitle: "Berkas organisasi",
            href: "/dokumen" as const,
            kosong: "Belum ada dokumen yang tercatat.",
            icon: FolderOpen,
          }
        : {
            title: "Pengumuman Terbaru",
            subtitle: "Informasi organisasi",
            href: "/pengumuman" as const,
            kosong: "Belum ada pengumuman yang terbit.",
            icon: Megaphone,
          };

  return (
    <Panel
      title={rupa.title}
      subtitle={rupa.subtitle}
      action={<SeeAll href={rupa.href} />}
      bodyClassName={SLOT_KONTEN}
    >
      {items.length === 0 ? (
        <EmptyNote icon={rupa.icon}>{rupa.kosong}</EmptyNote>
      ) : (
        <ItemList>
          {items.map((item) => {
            const jenis = ADMIN_RUPA[item.kind];

            return (
              <ListItem
                key={item.id}
                leading={<IconBox icon={jenis.icon} tone={jenis.tone} />}
                title={item.title}
                meta={`${jenis.label} · ${formatDate(item.createdAt)}`}
              />
            );
          })}
        </ItemList>
      )}
    </Panel>
  );
}

/* ------------------------------------------------- perlu ditindaklanjuti */

/** Ikon, aksen, dan tujuan per jenis tindak lanjut. */
const TINDAK_RUPA: Record<
  AttentionKey,
  {
    icon: LucideIcon;
    tone: Aksen;
    href: React.ComponentProps<typeof Link>["href"];
  }
> = {
  "anggota-tanpa-akun": {
    icon: UserRoundPlus,
    tone: "amber",
    href: "/pengguna",
  },
  "akun-belum-ditautkan": { icon: Users, tone: "amber", href: "/pengguna" },
  "anggota-nonaktif": { icon: UserRoundX, tone: "rose", href: "/anggota" },
  "presensi-terbuka": {
    icon: ClipboardCheck,
    tone: "cyan",
    href: "/presensi",
  },
  "pengumuman-draf": { icon: Send, tone: "purple", href: "/pengumuman" },
  "event-draf": { icon: Send, tone: "rose", href: "/kegiatan" },
};

/** Kolom yang menyisakan sel kosong paling sedikit. */
function kolomTindak(jumlah: number) {
  if (jumlah <= 2) return "sm:grid-cols-2";
  if (jumlah === 3) return "sm:grid-cols-2 lg:grid-cols-3";
  if (jumlah % 4 === 0) return "sm:grid-cols-2 lg:grid-cols-4";
  if (jumlah % 3 === 0) return "sm:grid-cols-2 lg:grid-cols-3";
  return "sm:grid-cols-2 lg:grid-cols-4";
}

/**
 * Daftar tindak lanjut.
 *
 * Barisnya sudah disaring di lapisan query: hanya yang bernilai lebih dari nol
 * dan hanya yang memang dapat ditangani pemanggil. Yang tersisa di sini adalah
 * menggambarnya, dan menyediakan jalan ke modul tempat pekerjaannya
 * diselesaikan — bukan menyelesaikannya di dashboard.
 */
function AttentionPanel({
  items,
  columns,
}: {
  items: AttentionItem[];
  /**
   * Dipaksa satu kolom ketika panelnya berbagi baris dengan kartu lain. Tiga
   * sel berjajar mendatar membuat kartunya jauh lebih pendek daripada
   * tetangganya, dan sisa tingginya menjadi pita putih; bertumpuk, tingginya
   * sepadan dan tiap barisnya punya ruang untuk keterangannya.
   */
  columns?: 1;
}) {
  return (
    <Panel title="Perlu Ditindaklanjuti" subtitle="Dalam wewenang Anda">
      <ItemList
        className={columns === 1 ? "grid-cols-1" : kolomTindak(items.length)}
      >
        {items.map((item) => {
          const rupa = TINDAK_RUPA[item.key];

          return (
            <ListItem
              key={item.key}
              href={rupa.href}
              leading={<IconBox icon={rupa.icon} tone={rupa.tone} />}
              title={item.label}
              meta={item.context}
              trailing={
                <>
                  <ItemValue>{formatNumber(item.value)}</ItemValue>
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className="text-muted-soft"
                  />
                </>
              }
            />
          );
        })}
      </ItemList>
    </Panel>
  );
}

/* ---------------------------------------------------------- pemilihan */

/**
 * Ringkasan pemilihan.
 *
 * Yang ditampilkan hanya dua hal: pemilihan mana yang perlu diperhatikan, dan
 * berapa yang sudah memilih. TIDAK ADA perolehan kandidat — tidak selagi
 * berlangsung, tidak setelah ditutup, tidak setelah dipublikasikan. Angka
 * partisipasinya datang dari fungsi yang memang dirancang aman ditampilkan
 * selama pemungutan suara, dan hasil resmi tetap punya halamannya sendiri.
 */
/**
 * Rentang tanggal pemilihan.
 *
 * Tahun ditulis sekali ketika keduanya jatuh pada tahun yang sama. Bukan
 * penghematan huruf demi keringkasan: diukur di peramban pada 320px, bentuk
 * lengkapnya menuntut 140px sementara barisnya hanya menyisakan 120px, dan
 * separuh rentangnya hilang. Tahun yang ditulis dua kali tidak menjawab satu
 * pertanyaan pun yang belum dijawab oleh tahun yang ditulis sekali.
 */
function rentangPemilihan(mulai: string, selesai: string) {
  const awal = new Date(mulai);
  const akhir = new Date(selesai);

  if (
    !Number.isNaN(awal.getTime()) &&
    !Number.isNaN(akhir.getTime()) &&
    awal.getFullYear() === akhir.getFullYear()
  ) {
    const tanpaTahun = formatShortDate(mulai).replace(
      ` ${awal.getFullYear()}`,
      "",
    );
    return `${tanpaTahun} – ${formatShortDate(selesai)}`;
  }

  return `${formatShortDate(mulai)} – ${formatShortDate(selesai)}`;
}

function ElectionPanel({ summary }: { summary: ElectionSummary }) {
  const fokus = summary.focus;
  const partisipasi = fokus?.participation ?? null;
  const daftar = summary.recent.slice(0, BATAS_PRATINJAU);

  return (
    <Panel
      title="Pemilihan"
      subtitle={`${formatNumber(summary.total)} pemilihan tercatat`}
      action={<SeeAll href="/pemilihan" />}
      bodyClassName={SLOT_KONTEN}
    >
      {/*
        Susunannya sama dengan panel daftar di sebelahnya: satu baris identitas
        beserta lencana statusnya, lalu satu batang progres. Cincin yang
        sebelumnya dipakai memberi panel ini anatomi dan jarak sendiri —
        selebar 132px dan dipusatkan — sehingga tiga kartu yang berdiri
        berdampingan terbaca sebagai dua sistem yang berbeda.
      */}
      <div className="grid content-start gap-2">
        {/*
          Tanpa satu pun pemilihan, panelnya tetap berdiri di slot yang sama
          dengan tetangganya — kartu yang menghilang ketika tabelnya kosong
          adalah cara tata letak ikut berubah mengikuti isi basis data.
        */}
        {summary.total === 0 ? (
          <EmptyNote icon={Vote}>
            Belum ada pemilihan yang tercatat pada organisasi ini.
          </EmptyNote>
        ) : null}

        {/*
          DAFTAR, bukan satu sorotan.

          Sebelumnya hanya `focus` yang tampil, jadi organisasi dengan empat
          pemilihan terbaca seolah punya satu — panelnya berisi satu baris
          sementara tetangganya berisi tiga, dan barisnya terlihat timpang.

          Batasnya sama dengan seluruh dashboard (3), dan kelebihannya
          diserahkan ke "Lihat semua" yang sudah ada di kepala panel.
        */}
        {daftar.map((row) => (
          <ListItem
            key={row.id}
            leading={<IconBox icon={Vote} tone="purple" />}
            title={row.name}
            meta={rentangPemilihan(row.startAt, row.endAt)}
            trailing={
              <Badge
                tone={electionStatus(row.status).tone}
                className={LENCANA_RINGKAS}
              >
                {electionStatus(row.status).label}
              </Badge>
            }
          />
        ))}

        {/*
          Partisipasi saja — pembilang dan penyebutnya keduanya nyata, dan
          keduanya aman ditampilkan selama pemungutan suara. TIDAK ADA
          perolehan kandidat di sini, apa pun statusnya.

          Hanya muncul ketika daftarnya masih menyisakan ruang di dalam slot.
          Dengan tiga baris, slot 160px sudah penuh; menambahkan batang progres
          di bawahnya membuat panel ini tumbuh melewati tetangganya justru pada
          keadaan yang paling sering terjadi.
        */}
        {partisipasi && daftar.length < BATAS_PRATINJAU ? (
          <ProgressRow
            label="Partisipasi"
            value={partisipasi.voted}
            total={partisipasi.eligible}
            caption={`${formatNumber(partisipasi.voted)} dari ${formatNumber(partisipasi.eligible)} memilih · ${formatNumber(partisipasi.remaining)} belum memilih`}
            tone="purple"
          />
        ) : null}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------- komposisi */

export function OrganizationDashboard({
  displayName,
  stats,
  period,
  remaining,
  series,
  summary,
  schedule,
  activity,
  election,
  attention,
  administration,
  administrationSources,
  scheduleSources,
  operational,
}: {
  displayName: string;
  /** NULL bila agregatnya gagal dibaca; komposisinya menyusut dengan sendirinya. */
  stats: OrganizationStats | null;
  period: { name: string; start_date: string; end_date: string } | null;
  remaining: { text: string; short: string; caption: string } | null;
  series: ActivitySeries | null;
  summary: InsightSummary;
  /** NULL berarti tidak berhak — panelnya tidak dirender sama sekali. */
  schedule: ScheduleItem[] | null;
  activity: ActivityItem[] | null;
  election: ElectionSummary | null;
  /** Sudah disaring: hanya baris > 0 yang dapat ditangani pemanggil. */
  attention: AttentionItem[];
  /** NULL berarti tidak berhak atas satu pun sumbernya. */
  administration: AdministrationItem[] | null;
  /** Sumber administrasi yang boleh dilihat — menentukan judul panelnya. */
  administrationSources: AdministrationSources;
  /** Sumber jadwal yang boleh dilihat — menentukan subjudul panelnya. */
  scheduleSources: ScheduleSources;
  /** Angka struktur yang dipelihara operator. Kosong bila bukan pemeliharanya. */
  operational: OperationalRow[];
}) {
  // Tanggal terdekat per jenis, dari daftar jadwal yang sudah terurut waktu.
  const terdekat: Partial<Record<ScheduleKind, string>> = {};
  for (const item of schedule ?? []) {
    if (!terdekat[item.kind]) {
      terdekat[item.kind] = formatShortDate(item.startAt);
    }
  }

  const kandidat = stats
    ? susunKandidat(stats, summary, period?.name, remaining, terdekat, election)
    : [];
  /*
   * Berapa kandidat yang naik menjadi kartu metrik.
   *
   * Barisnya empat kolom, jadi ambil kelipatan empat yang muat: delapan
   * kandidat menjadi dua baris penuh, tujuh tetap empat supaya baris kedua
   * tidak berakhir dengan sel menganga. Sisanya turun menjadi kartu kecil di
   * kolom Informasi Cepat, yang memang bentuknya untuk angka sekunder.
   */
  const jumlahUtama =
    kandidat.length >= 8 ? 8 : kandidat.length >= 4 ? 4 : kandidat.length;
  const utama = kandidat.slice(0, jumlahUtama);

  /*
   * Pemilihan boleh menjadi kartu utama, tidak pernah menjadi baris sekunder:
   * peran yang kandidatnya melimpah sudah mendapat panel Pemilihan sendiri,
   * dan mengulangnya sebagai baris di Informasi Cepat hanya menyebut angka
   * yang sama dua kali pada satu layar.
   */
  const cepat: SummaryRow[] = kandidat
    .slice(jumlahUtama)
    .filter((row) => row.label !== "Pemilihan")
    .map((row) => ({
      label: row.label,
      value: row.value,
      context: row.caption,
      icon: row.icon,
      tone: row.tone,
    }));

  const barisAlumni: SummaryRow | null = stats?.members
    ? {
        label: "Alumni",
        value: formatNumber(stats.members.alumni),
        context: "Tidak lagi aktif",
        icon: GraduationCap,
        tone: "slate",
      }
    : null;

  /*
   * Alumni ikut ke kolom struktur ketika kolom itu memang ada: ia angka
   * keanggotaan yang tidak berubah harian, sekelompok dengan jabatan dan
   * periode. Tanpa kolom itu ia tetap di Informasi Cepat, tempatnya selama
   * ini.
   */
  const strukturRows: SummaryRow[] = barisOperasional(operational);

  if (barisAlumni) {
    if (operational.length > 0) strukturRows.push(barisAlumni);
    else cepat.push(barisAlumni);
  }

  /*
   * Bagian bawah, berpasangan dua kolom; yang terakhir melebar penuh ketika
   * jumlahnya ganjil.
   *
   * Urutannya dipilih supaya pasangannya seimbang, bukan sekadar tersusun:
   * jadwal dan pemilihan sama-sama berisi daftar sehingga tingginya sepadan,
   * sementara pratinjau anggota selalu terakhir. Strip wajah memang pendek —
   * satu baris avatar — dan menaruhnya di samping kartu berisi daftar hanya
   * menghasilkan setengah kolom kosong. Selebar halaman ia terbaca sebagai
   * penutup, bukan sebagai kartu yang gagal terisi.
   */
  const panelJadwal = schedule ? (
    <Panel
      title="Jadwal Terdekat"
      subtitle={subjudulJadwal(scheduleSources)}
      action={<SeeAll href="/agenda" />}
      bodyClassName={SLOT_KONTEN}
    >
      {schedule.length === 0 ? (
        <EmptyNote icon={CalendarDays}>
          Belum ada jadwal yang akan datang.
        </EmptyNote>
      ) : (
        <ScheduleList items={schedule} />
      )}
    </Panel>
  ) : null;

  const panelPemilihan = election ? <ElectionPanel summary={election} /> : null;

  const panelAktivitas = activity ? (
    <Panel
      title="Aktivitas Terbaru"
      subtitle="Tercatat pada audit log"
      action={<SeeAll href="/audit" />}
      bodyClassName={SLOT_KONTEN}
    >
      {activity.length === 0 ? (
        <EmptyNote icon={History}>Belum ada aktivitas yang tercatat.</EmptyNote>
      ) : (
        <ActivityList items={activity} />
      )}
    </Panel>
  ) : null;

  const panelAdministrasi = administration ? (
    <AdministrationPanel
      items={administration}
      sources={administrationSources}
    />
  ) : null;

  const panelCepat =
    cepat.length > 0 ? (
      <Panel
        title="Informasi Cepat"
        subtitle="Angka pendamping"
        bodyClassName={SLOT_KONTEN}
      >
        <SummaryList rows={cepat} />
      </Panel>
    ) : null;

  /*
   * Rincian di sisi kanan grafik.
   *
   * Barisnya adalah sumber grafiknya sendiri — agenda, event, rapat sejauh
   * yang boleh dilihat — dihitung pada rentang yang sama dengan garisnya.
   *
   * Pengumuman ikut HANYA ketika tidak ada kolom Informasi Cepat yang sudah
   * memuatnya, dan hanya karena `getInsightSummary` menghitungnya pada
   * rentang dua belas bulan yang sama; angka dengan dasar berbeda tidak
   * berhak berdiri dalam satu daftar.
   *
   * Tidak ada baris yang ditambahkan untuk menggenapkan tampilan. Organisasi
   * tanpa event akan melihat dua baris, dan itu memang keadaannya.
   */
  const rincianKegiatan: SummaryRow[] = (series?.bySource ?? []).map((row) => {
    const rupa = SUMBER_RUPA[row.label] ?? {
      icon: CalendarDays,
      tone: "slate" as const,
    };

    return {
      label: row.label,
      value: formatNumber(row.total),
      icon: rupa.icon,
      tone: rupa.tone,
    };
  });

  if (!panelCepat && summary.announcements !== null) {
    rincianKegiatan.push({
      label: "Pengumuman",
      value: formatNumber(summary.announcements),
      icon: Megaphone,
      tone: "rose",
    });
  }

  const sapaan = (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[21px] leading-tight font-semibold tracking-tight text-foreground">
          Selamat datang, {displayName}
        </h1>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
          {period
            ? `Periode aktif ${formatPeriodRange(period.start_date, period.end_date)} · ${period.name}`
            : "Belum ada periode kepengurusan yang aktif."}
        </p>
      </div>

      {remaining ? (
        <Badge tone="info" className="shrink-0 self-start sm:self-auto">
          {remaining.text}
        </Badge>
      ) : null}
    </header>
  );

  const kisiMetrik =
    utama.length > 0 ? (
      <div
        className={cn(
          // `auto-rows-fr`: dua baris kartu dengan tinggi berbeda terbaca
          // sebagai dua kelompok yang tak berhubungan. Baris tertinggi
          // menentukan tinggi seluruhnya.
          "grid auto-rows-fr gap-4",
          utama.length >= 4
            ? "sm:grid-cols-2 xl:grid-cols-4"
            : KOLOM_METRIK[utama.length as 1 | 2 | 3],
        )}
      >
        {utama.map((row) => (
          <MetricCard
            key={row.label}
            label={row.label}
            value={row.value}
            description={row.description}
            icon={row.icon}
            tone={row.tone}
            noteValue={row.noteValue}
            noteLabel={row.noteLabel}
          />
        ))}
      </div>
    ) : null;

  const panelGrafik = series ? (
    <Panel
      title="Kegiatan Organisasi"
      subtitle={`${formatNumber(series.total)} kegiatan · ${series.sources.join(", ").toLowerCase()}`}
      action={
        <span className="rounded-sm border border-border px-2 py-1 text-[11.5px] font-medium text-muted-foreground">
          {series.range}
        </span>
      }
      bodyClassName="flex flex-col"
    >
      <ActivityChart points={series.points} />
    </Panel>
  ) : null;

  /*
   * SUSUNAN OPERATOR.
   *
   * Dipakai ketika ada pekerjaan yang menunggu DAN ada angka struktur yang
   * dipelihara — dua hal yang hanya dimiliki pemegang wewenang operasional.
   * Seluruh barisnya berpasangan: tidak ada kartu berdiri sendiri selebar
   * halaman, dan grafiknya berbagi baris dengan angka yang maknanya memang
   * berdampingan alih-alih memanjang sendirian.
   */
  const susunanOperator = attention.length > 0 && operational.length > 0;

  /*
   * Isi panel Ringkasan Organisasi pada susunan operator.
   *
   * Tiga angka sengaja TIDAK ikut. "Periode" hampir tidak pernah berubah dan
   * periode aktifnya sudah tertulis di kepala halaman; "Alumni" sudah menjadi
   * pembanding di kartu Total Anggota; "Presensi" naik menjadi batang progres
   * di bawah kisi, karena ia satu-satunya angka di sini yang memang punya
   * pembilang dan penyebut.
   */
  const selStat = [
    ...cepat.filter(
      (row) => row.label !== "Presensi" && row.label !== "Alumni",
    ),
    ...strukturRows.filter(
      (row) => row.label !== "Periode" && row.label !== "Alumni",
    ),
  ];

  const kehadiran =
    stats?.attendance && stats.attendance.expected > 0
      ? stats.attendance
      : null;

  /**
   * Aktivitas versi kolom sempit.
   *
   * Satu-satunya "Aktivitas Terbaru" pada susunan operator: ia menempati
   * kolom yang dulu diisi pratinjau anggota, dan panel selebar halaman di
   * bawah dihapus supaya tidak ada dua panel dengan judul yang sama pada satu
   * halaman.
   */
  const panelAktivitasSempit = activity ? (
    <Panel
      title="Aktivitas Terbaru"
      subtitle="Tercatat pada audit log"
      action={<SeeAll href="/audit" />}
      bodyClassName={SLOT_KONTEN}
    >
      {activity.length === 0 ? (
        <EmptyNote icon={History}>Belum ada aktivitas yang tercatat.</EmptyNote>
      ) : (
        <ActivityList items={activity} columns={1} />
      )}
    </Panel>
  ) : null;

  if (susunanOperator) {
    return (
      <div className="space-y-4">
        {sapaan}
        {kisiMetrik}

        {/*
          Panelnya menjadi anak langsung kisi, tanpa pembungkus: `Panel` sudah
          membawa `min-w-0`, dan sebagai anak langsung ia meregang mengikuti
          tinggi baris — pembungkuslah yang tadinya meregang sementara kartunya
          tetap pendek.
        */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          <AttentionPanel items={attention} columns={1} />

          <Panel title="Ringkasan Organisasi" subtitle="Angka pendamping">
            <div className="grid content-start gap-2">
              <StatGrid cells={selStat} />
              {kehadiran ? (
                <ProgressRow
                  label="Kehadiran Presensi"
                  value={kehadiran.present}
                  total={kehadiran.expected}
                  caption={`${formatNumber(kehadiran.present)} dari ${formatNumber(kehadiran.expected)} peserta · ${formatNumber(kehadiran.sessions)} sesi`}
                  tone="cyan"
                />
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
          {panelGrafik}
          {panelAktivitasSempit}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {panelJadwal}
          {panelAdministrasi}
        </div>
      </div>
    );
  }

  /*
   * Bagian bawah, berpasangan dua kolom; yang terakhir melebar penuh ketika
   * jumlahnya ganjil.
   *
   * Urutannya dipilih dari tinggi TERUKUR di peramban, bukan dari dugaan.
   * Jadwal adalah kartu tertinggi karena kotak tanggalnya (320px), jadi ia
   * berpasangan dengan Administrasi yang juga berisi daftar (275px);
   * Pemilihan (270px) dan pratinjau anggota (275px) yang sama-sama pendek
   * berpasangan sesudahnya.
   */
  /*
   * Pemilihan naik ke baris grafik ketika tidak ada kolom Informasi Cepat.
   *
   * Bukan pemeriksaan role — `AccessContext` memang tidak menyimpannya — tapi
   * konsekuensi langsung dari permission: kolom Informasi Cepat hanya lahir
   * ketika kandidat metriknya melimpah, dan itu hanya terjadi pada peran yang
   * berhak atas banyak modul. Peran yang tidak punya kolom itu meninggalkan
   * sepertiga baris grafiknya menganggur, dan pemilihan adalah hal yang paling
   * ingin ditemukan seorang anggota di sana — bukan di dasar halaman.
   */
  const pemilihanDiSamping = !panelCepat && panelPemilihan !== null;
  const sampingGrafik =
    panelCepat ?? (pemilihanDiSamping ? panelPemilihan : null);

  const bawah = [
    panelJadwal ? { key: "jadwal", node: panelJadwal } : null,
    panelAdministrasi ? { key: "administrasi", node: panelAdministrasi } : null,
    panelAktivitas ? { key: "aktivitas", node: panelAktivitas } : null,
    panelPemilihan && !pemilihanDiSamping
      ? { key: "pemilihan", node: panelPemilihan }
      : null,
  ].filter((section) => section !== null);

  return (
    <div className="space-y-4">
      {sapaan}
      {kisiMetrik}

      {/* --------------------------------------- perlu ditindaklanjuti */}
      {attention.length > 0 ? <AttentionPanel items={attention} /> : null}

      {/* ---------------------------------- grafik + informasi cepat */}
      {series || sampingGrafik ? (
        <div
          /*
            Meregang, bukan mengikuti isi masing-masing.

            Sebelumnya baris ini `items-start` supaya panel pendek tidak
            diregang menjadi ruang kosong. Yang berubah adalah sebabnya: kini
            setiap badan panel berdiri di atas `SLOT_KONTEN` yang sama dengan
            batas bawah grafik, jadi kekosongannya sudah TERBATAS sebelum
            peregangan dimulai — dan tepi bawah yang rata lebih berharga
            daripada selisih beberapa puluh piksel yang tersisa.
          */
          className={cn(
            "grid gap-4",
            series &&
              sampingGrafik &&
              // Informasi Cepat adalah kolom angka sempit dan cukup dengan
              // lebar tetap; panel Pemilihan berisi baris judul dan batang
              // progres, dan pada 320px keduanya berdesakan — jadi ia mendapat
              // sepertiga baris, bukan sebuah bilah samping.
              (pemilihanDiSamping
                ? "xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]"
                : "xl:grid-cols-[minmax(0,1fr)_320px]"),
          )}
        >
          {series ? (
            <Panel
              title="Kegiatan Organisasi"
              subtitle={`${formatNumber(series.total)} kegiatan · ${series.sources.join(", ").toLowerCase()}`}
              action={
                <span className="rounded-sm border border-border px-2 py-1 text-[11.5px] font-medium text-muted-foreground">
                  {series.range}
                </span>
              }
              /*
                Rincian per sumber pindah ke SAMPING grafik, bukan di bawahnya.
                Di bawah, ia menambah 90px pada kartu yang sudah paling tinggi
                di halaman; di samping, ia mengisi ruang yang memang menganggur
                dan kartunya memendek tanpa kehilangan satu angka pun.

                Menumpuk kembali di bawah 640px: tiga baris selebar sepertiga
                layar ponsel tidak memuat wadah ikon beserta labelnya.
              */
              bodyClassName={cn(
                "grid gap-3",
                rincianKegiatan.length > 0 &&
                  // Batas bawah 180px, bukan nisbah murni: diukur di peramban
                  // pada 1280px, nisbah 0.34 menyusutkan kolom ini ke 150px
                  // dan label "Pengumuman" — teks tetap, bukan isi buatan
                  // pengguna — ikut terpotong; pada 160px ia masih kurang 5px.
                  // Label terpanjang di sinilah yang menentukan batasnya.
                  "sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.34fr)]",
              )}
            >
              <ActivityChart points={series.points} />

              {rincianKegiatan.length > 0 ? (
                <ItemList>
                  {rincianKegiatan.map((row) => (
                    <ListItem
                      key={row.label}
                      leading={<IconBox icon={row.icon} tone={row.tone} />}
                      title={row.label}
                      trailing={<ItemValue>{row.value}</ItemValue>}
                    />
                  ))}
                </ItemList>
              ) : null}
            </Panel>
          ) : null}

          {sampingGrafik}
        </div>
      ) : null}

      {/* ------------------------------------------------ bagian bawah */}
      {/*
        Tiga panel sejajar pada desktop. Kolomnya mengikuti jumlah panel yang
        memang dirender, bukan angka tetap: peran dengan dua panel mendapat dua
        kolom penuh, bukan dua kolom dan satu sel menganga.
      */}
      {bawah.length > 0 ? (
        <div
          className={cn(
            // Meregang: setiap panel di baris ini sudah punya lantai
            // `SLOT_KONTEN` yang sama, jadi kartu berisi satu item tidak lagi
            // 96px lebih pendek daripada kartu berisi tiga — dan tepi
            // bawahnya boleh dirapikan tanpa membuat lubang.
            "grid gap-4",
            KOLOM_BAWAH[bawah.length] ?? "",
          )}
        >
          {bawah.map((section, index) => (
            <div
              key={section.key}
              className={cn(
                // `min-w-0` wajib: item grid bawaannya `min-width: auto`,
                // sehingga isi yang lebih lebar akan melebarkan seluruh halaman
                // alih-alih digulung di dalam kartunya sendiri. `grid`, bukan
                // `flex`, supaya panelnya meregang ke DUA arah — diukur pada
                // 1440px, sel selebar 366px berisi panel 366/353/320 dan tepi
                // kanan barisnya bergerigi.
                "grid min-w-0",
                // Panel ganjil terakhir melebar sepenuh baris pada kisi dua
                // kolom. Diukur di peramban pada 1024px: tanpa ini panel
                // ketiga duduk sendiri dan menyisakan satu sel kosong selebar
                // 349px di sebelahnya.
                bawah.length === 3 &&
                  index === 2 &&
                  "md:col-span-2 xl:col-span-1",
              )}
            >
              {section.node}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Kolom baris bawah menurut jumlah panelnya.
 *
 * Tablet berhenti di dua kolom: tiga panel selebar sepertiga layar 768px tidak
 * lagi memuat kotak tanggal beserta judulnya.
 */
const KOLOM_BAWAH: Record<number, string> = {
  1: "",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

/**
 * Kelas kisi kartu metrik, dipilih menurut jumlah kartunya.
 *
 * Lebarnya ikut dibatasi, bukan hanya jumlah kolomnya. Seorang anggota yang
 * hanya berhak melihat dua metrik akan melihat dua kartu selebar kartu pada
 * peran lain — bukan dua kartu yang melar setengah layar, dan bukan pula kisi
 * empat kolom dengan dua sel menganga di ujung kanan.
 */
const KOLOM_METRIK: Record<1 | 2 | 3, string> = {
  1: "xl:max-w-[25%]",
  2: "sm:grid-cols-2 xl:max-w-[50%]",
  3: "sm:grid-cols-2 xl:grid-cols-3 xl:max-w-[75%]",
};
