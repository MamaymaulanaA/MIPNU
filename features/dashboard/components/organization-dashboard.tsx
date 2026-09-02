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

import { PageHeader } from "@/components/layout/page-header";
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
  description?: string;
  noteValue?: string;
  noteLabel?: string;
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
  terdekat?: Partial<Record<ScheduleKind, string>>,
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

const SUMBER_RUPA: Record<string, { icon: LucideIcon; tone: Aksen }> = {
  Agenda: { icon: CalendarDays, tone: "blue" },
  Event: { icon: CalendarRange, tone: "rose" },
  Rapat: { icon: Presentation, tone: "cyan" },
};

function subjudulJadwal(sources: ScheduleSources) {
  const bagian = [
    sources.agenda ? "agenda" : null,
    sources.events ? "event" : null,
    sources.meetings ? "rapat" : null,
  ].filter((x) => x !== null);

  if (bagian.length === 0) return "Belum ada sumber jadwal";

  const kalimat =
    bagian.length === 1
      ? bagian[0]!
      : bagian.length === 2
        ? `${bagian[0]} dan ${bagian[1]}`
        : `${bagian.slice(0, -1).join(", ")}, dan ${bagian[bagian.length - 1]}`;

  return kalimat.charAt(0).toUpperCase() + kalimat.slice(1);
}

const JADWAL_RUPA: Record<ScheduleKind, { label: string; tone: BadgeTone }> = {
  agenda: { label: "Agenda", tone: "info" },
  event: { label: "Event", tone: "primary" },
  meeting: { label: "Rapat", tone: "neutral" },
};

function DateTile({ date }: { date: Date }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-[42px] w-10 shrink-0 flex-col items-center justify-center gap-px rounded-sm border border-primary-border bg-primary-soft px-1 py-1"
    >
      <span className="text-[8px] leading-[9px] font-semibold tracking-wide text-primary uppercase">
        {BULAN_SINGKAT[date.getMonth()]}
      </span>
      <span className="text-[13px] leading-[14px] font-bold text-foreground">
        {date.getDate()}
      </span>
      <span className="text-[8px] leading-[9px] text-muted-foreground">
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

const OPERASIONAL_RUPA: Record<
  OperationalRow["key"],
  { icon: LucideIcon; tone: Aksen }
> = {
  jabatan: { icon: Briefcase, tone: "purple" },
  periode: { icon: CalendarRange, tone: "slate" },
  akun: { icon: KeyRound, tone: "cyan" },
};

function barisOperasional(rows: OperationalRow[]): SummaryRow[] {
  return rows.map((row) => ({
    label: row.label,
    value: formatNumber(row.value),
    context: row.context,
    icon: OPERASIONAL_RUPA[row.key].icon,
    tone: OPERASIONAL_RUPA[row.key].tone,
  }));
}

const ADMIN_RUPA: Record<
  AdministrationKind,
  { icon: LucideIcon; tone: Aksen; label: string }
> = {
  document: { icon: FolderOpen, tone: "amber", label: "Dokumen" },
  announcement: { icon: Megaphone, tone: "rose", label: "Pengumuman" },
};

function AdministrationPanel({
  items,
  sources,
}: {
  items: AdministrationItem[];
  sources: AdministrationSources;
}) {
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

function kolomTindak(jumlah: number) {
  if (jumlah <= 2) return "sm:grid-cols-2";
  if (jumlah === 3) return "sm:grid-cols-2 lg:grid-cols-3";
  if (jumlah % 4 === 0) return "sm:grid-cols-2 lg:grid-cols-4";
  if (jumlah % 3 === 0) return "sm:grid-cols-2 lg:grid-cols-3";
  return "sm:grid-cols-2 lg:grid-cols-4";
}

function AttentionPanel({
  items,
  columns,
}: {
  items: AttentionItem[];
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
      <div className="grid content-start gap-2">
        {summary.total === 0 ? (
          <EmptyNote icon={Vote}>
            Belum ada pemilihan yang tercatat pada organisasi ini.
          </EmptyNote>
        ) : null}

        {/*
          `ItemList`, BUKAN baris telanjang di dalam `div` pembungkus di atas.

          Sebelumnya `ListItem` dipanggil langsung sebagai anak `div` itu.
          `ListItem` merender `<li>`, dan sebuah `<li>` yang tidak berada di
          dalam `<ul>` tidak mewarisi `list-style: none` dari mana pun —
          Preflight Tailwind memasangnya pada wadahnya, bukan pada `li`. Maka
          setiap baris pemilihan tumbuh titik hitam di kirinya, sementara
          keenam daftar lain di dashboard yang sama bersih.

          Titiknya kini padam dua kali: `ListItem` membawa `list-none` sendiri,
          dan barisnya berada di dalam `<ul>` tempatnya memang seharusnya.
          Yang kedua bukan pengulangan yang pertama — ia yang membuat
          strukturnya benar bagi pembaca layar, yang mengumumkan "daftar,
          3 butir" hanya bila daftarnya memang sebuah daftar.
        */}
        {daftar.length > 0 ? (
          <ItemList>
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
          </ItemList>
        ) : null}

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
  stats: OrganizationStats | null;
  period: { name: string; start_date: string; end_date: string } | null;
  remaining: { text: string; short: string; caption: string } | null;
  series: ActivitySeries | null;
  summary: InsightSummary;
  schedule: ScheduleItem[] | null;
  activity: ActivityItem[] | null;
  election: ElectionSummary | null;
  attention: AttentionItem[];
  administration: AdministrationItem[] | null;
  administrationSources: AdministrationSources;
  scheduleSources: ScheduleSources;
  operational: OperationalRow[];
}) {
  const terdekat: Partial<Record<ScheduleKind, string>> = {};
  for (const item of schedule ?? []) {
    if (!terdekat[item.kind]) {
      terdekat[item.kind] = formatShortDate(item.startAt);
    }
  }

  const kandidat = stats
    ? susunKandidat(stats, summary, period?.name, remaining, terdekat, election)
    : [];
  const jumlahUtama =
    kandidat.length >= 8 ? 8 : kandidat.length >= 4 ? 4 : kandidat.length;
  const utama = kandidat.slice(0, jumlahUtama);

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

  const strukturRows: SummaryRow[] = barisOperasional(operational);

  if (barisAlumni) {
    if (operational.length > 0) strukturRows.push(barisAlumni);
    else cepat.push(barisAlumni);
  }

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
    <PageHeader
      title={`Selamat datang, ${displayName}`}
      description={
        period
          ? `Periode aktif ${formatPeriodRange(period.start_date, period.end_date)} · ${period.name}`
          : "Belum ada periode kepengurusan yang aktif."
      }
      actions={
        remaining ? <Badge tone="info">{remaining.text}</Badge> : undefined
      }
    />
  );

  const kisiMetrik =
    utama.length > 0 ? (
      <div
        className={cn(
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

  const susunanOperator = attention.length > 0 && operational.length > 0;

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

      {attention.length > 0 ? <AttentionPanel items={attention} /> : null}

      {series || sampingGrafik ? (
        <div
          className={cn(
            "grid gap-4",
            series &&
              sampingGrafik &&
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
              bodyClassName={cn(
                "grid gap-3",
                rincianKegiatan.length > 0 &&
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

      {bawah.length > 0 ? (
        <div className={cn("grid gap-4", KOLOM_BAWAH[bawah.length] ?? "")}>
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

const KOLOM_BAWAH: Record<number, string> = {
  1: "",
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 xl:grid-cols-3",
  4: "md:grid-cols-2 xl:grid-cols-4",
};

const KOLOM_METRIK: Record<1 | 2 | 3, string> = {
  1: "xl:max-w-[25%]",
  2: "sm:grid-cols-2 xl:max-w-[50%]",
  3: "sm:grid-cols-2 xl:grid-cols-3 xl:max-w-[75%]",
};
