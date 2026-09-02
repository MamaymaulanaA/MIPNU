import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  CalendarDays,
  FileText,
  History,
  Layers,
  ShieldCheck,
  Unlink2,
  UserCog,
  UserRoundPlus,
  UserRoundX,
  Users,
  Vote,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { Aksen } from "@/features/dashboard/components/accent";
import {
  CountBadge,
  EmptyNote,
  IconBox,
  ItemList,
  ListItem,
  MetricCard,
  SLOT_KONTEN,
  Panel,
  PersonGrid,
  SeeAll,
  SummaryList,
  type SummaryRow,
} from "@/features/dashboard/components/cards";
import {
  DonutChart,
  DonutLegend,
  GrowthChart,
} from "@/features/dashboard/components/platform-charts";
import type {
  ActivityDomain,
  ActivityItem,
} from "@/features/dashboard/queries/dashboard-sections";
import type {
  AccountPreview,
  PlatformGrowth,
  QuickInfo,
  SystemActivity,
} from "@/features/dashboard/queries/platform-insight";
import type { PlatformStats } from "@/features/dashboard/queries/organization-summary";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const INFO_RUPA: Record<string, { icon: LucideIcon; tone: Aksen }> = {
  "Organisasi Baru": { icon: Building2, tone: "blue" },
  "Akun Baru": { icon: UserRoundPlus, tone: "cyan" },
  "Peristiwa Audit": { icon: ShieldCheck, tone: "purple" },
  "Akun Nonaktif": { icon: UserRoundX, tone: "amber" },
};

function barisInformasi(items: QuickInfo[]): SummaryRow[] {
  return items.map((info) => {
    const rupa = INFO_RUPA[info.label] ?? {
      icon: Activity,
      tone: "slate" as Aksen,
    };

    return {
      label: info.label,
      value: formatNumber(info.value),
      context: info.context,
      icon: rupa.icon,
      tone: rupa.tone,
    };
  });
}

function LevelBars({
  rows,
  total,
}: {
  rows: { code: string; total: number }[];
  total: number;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const persen = total > 0 ? Math.round((row.total / total) * 100) : 0;
        const terisi = row.total > 0;

        return (
          <li key={row.code} className="flex items-center gap-2.5">
            <span
              className={cn(
                "w-8 shrink-0 text-[12px] font-semibold",
                terisi ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.code}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${persen}%` }}
              />
            </span>
            <span
              className={cn(
                "w-5 shrink-0 text-right text-[12px] font-semibold",
                terisi ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.total}
            </span>
            <span className="w-9 shrink-0 text-right text-[11.5px] text-muted-foreground">
              {persen}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const RANAH_RUPA: Record<ActivityDomain, { icon: LucideIcon; tone: Aksen }> = {
  pemilihan: { icon: Vote, tone: "purple" },
  keanggotaan: { icon: UserRoundPlus, tone: "cyan" },
  kegiatan: { icon: CalendarDays, tone: "blue" },
  administrasi: { icon: FileText, tone: "amber" },
  lainnya: { icon: Activity, tone: "slate" },
};

export function ActivityList({
  items,
  columns = 2,
}: {
  items: ActivityItem[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <ItemList
      className={cn(
        columns === 1 && "grid-cols-1",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {items.map((item) => {
        const rupa = RANAH_RUPA[item.domain];

        return (
          <ListItem
            key={item.id}
            leading={<IconBox icon={rupa.icon} tone={rupa.tone} />}
            title={item.action}
            meta={`${formatDateTime(item.createdAt)}${
              item.actorName ? ` · ${item.actorName}` : ""
            }`}
          />
        );
      })}
    </ItemList>
  );
}

export function PlatformDashboard({
  displayName,
  stats,
  growth,
  system,
  quickInfo,
  activity,
  accounts,
}: {
  displayName: string;
  stats: PlatformStats;
  growth: PlatformGrowth | null;
  system: SystemActivity | null;
  quickInfo: QuickInfo[];
  activity: ActivityItem[];
  accounts: AccountPreview[];
}) {
  const jenis = stats.by_type.map((row) => ({
    label: row.code,
    total: row.total,
    share:
      stats.organizations.total > 0
        ? Math.round((row.total / stats.organizations.total) * 100)
        : 0,
  }));

  const porsiTanpaOrganisasi =
    stats.accounts.total > 0
      ? Math.round((stats.accounts.unassigned / stats.accounts.total) * 100)
      : 0;
  const rerataAnggota =
    stats.organizations.total > 0
      ? (stats.members_total / stats.organizations.total)
          .toFixed(1)
          .replace(".", ",")
      : "0";

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Selamat datang, ${displayName}`}
        description="Pantau kondisi dan aktivitas platform MIPNU dari satu dashboard."
        actions={
          <Button asChild>
            <Link href="/admin/organisasi">
              <ShieldCheck size={16} aria-hidden="true" />
              Kelola organisasi
            </Link>
          </Button>
        }
      />

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Organisasi"
          value={formatNumber(stats.organizations.total)}
          description={`${formatNumber(stats.organizations.active)} aktif`}
          icon={Building2}
          tone="blue"
          delta={growth?.organizationDelta}
          series={growth?.newOrganizations}
        />
        <MetricCard
          label="Total Akun"
          value={formatNumber(stats.accounts.total)}
          description={`${formatNumber(stats.accounts.active)} aktif`}
          icon={UserCog}
          tone="cyan"
          delta={growth?.accountDelta}
          series={growth?.newAccounts}
        />
        <MetricCard
          label="Akun Tanpa Organisasi"
          value={formatNumber(stats.accounts.unassigned)}
          description="Perlu ditautkan"
          icon={Unlink2}
          tone="amber"
          noteValue={`${porsiTanpaOrganisasi}%`}
          noteLabel="dari total akun"
        />
        <MetricCard
          label="Total Anggota"
          value={formatNumber(stats.members_total)}
          description="Seluruh organisasi"
          icon={Layers}
          tone="purple"
          noteValue={rerataAnggota}
          noteLabel="per organisasi"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        {growth ? (
          <Panel
            title="Pertumbuhan Platform"
            subtitle="Organisasi & akun, kumulatif per bulan"
            action={
              <span className="rounded-sm border border-border px-2 py-1 text-[11.5px] font-medium text-muted-foreground">
                {growth.range}
              </span>
            }
          >
            <div className="mb-2 flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
                <span
                  aria-hidden="true"
                  className="h-[3px] w-5 rounded-full bg-primary"
                />
                Organisasi
              </span>
              <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-foreground">
                <span
                  aria-hidden="true"
                  className="h-[3px] w-5 rounded-full"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, hsl(var(--accent-purple)) 0 5px, transparent 5px 9px)",
                  }}
                />
                Akun
              </span>
            </div>

            <GrowthChart points={growth.points} />
          </Panel>
        ) : null}

        <Panel
          title="Informasi Cepat"
          subtitle="Pergerakan terakhir"
          bodyClassName={SLOT_KONTEN}
        >
          <SummaryList rows={barisInformasi(quickInfo)} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.55fr)]">
        <Panel
          title="Jenis Organisasi"
          subtitle="IPNU & IPPNU"
          bodyClassName={SLOT_KONTEN}
        >
          <div className="flex h-full flex-col justify-center gap-2">
            <DonutChart
              slices={jenis}
              total={stats.organizations.total}
              centerLabel="Organisasi"
              tones={["blue", "cyan"]}
              height={150}
            />
            <DonutLegend slices={jenis} tones={["blue", "cyan"]} />
          </div>
        </Panel>

        <Panel
          title="Tingkat Organisasi"
          subtitle="Distribusi berdasarkan tingkatan"
          bodyClassName={SLOT_KONTEN}
        >
          <div className="flex h-full flex-col justify-center">
            <LevelBars
              rows={stats.by_level}
              total={stats.organizations.total}
            />
          </div>
        </Panel>

        {system ? (
          <Panel
            title="Aktivitas Sistem"
            subtitle={`${system.days} hari terakhir · menurut domain`}
            bodyClassName={SLOT_KONTEN}
            className="lg:col-span-2 xl:col-span-1"
          >
            <div className="grid h-full items-center gap-4 sm:grid-cols-[minmax(0,170px)_minmax(0,1fr)]">
              <DonutChart
                slices={system.slices}
                total={system.total}
                centerLabel="Peristiwa"
                height={170}
              />
              <DonutLegend slices={system.slices} />
            </div>
          </Panel>
        ) : null}
      </div>

      {/*
        Panel akun hanya dirender bila barisnya memang ada. Pemanggil sudah
        menahan query-nya bagi yang tidak berhak, jadi daftar kosong di sini
        berarti "tidak boleh dilihat" atau "memang belum ada" — dan keduanya
        lebih jujur diselesaikan dengan tidak menampilkan panelnya daripada
        dengan kalimat yang menebak alasannya.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Pengguna Platform"
          subtitle="Terdaftar pada platform"
          action={
            <div className="flex items-center gap-2">
              <CountBadge value={stats.accounts.total} />
              <SeeAll href="/pengguna" />
            </div>
          }
          bodyClassName={SLOT_KONTEN}
        >
          {accounts.length === 0 ? (
            <EmptyNote icon={Users}>
              Belum ada akun yang terdaftar pada platform.
            </EmptyNote>
          ) : (
            <PersonGrid
              people={accounts.map((account) => ({
                id: account.id,
                name: account.displayName,
                flagged: account.status !== "ACTIVE",
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Aktivitas Terbaru"
          subtitle="Tercatat pada audit log"
          action={<SeeAll href="/audit" />}
          bodyClassName={SLOT_KONTEN}
        >
          {activity.length === 0 ? (
            <EmptyNote icon={History}>
              Belum ada aktivitas yang tercatat.
            </EmptyNote>
          ) : (
            <ActivityList items={activity} />
          )}
        </Panel>
      </div>
    </div>
  );
}
