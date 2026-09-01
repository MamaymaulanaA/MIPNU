import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import {
  AgendaCalendar,
  AgendaViewToggle,
} from "@/features/agenda/components/agenda-calendar";
import {
  AgendaManager,
  type AgendaRow,
} from "@/features/agenda/components/agenda-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AGENDA_TYPES } from "@/features/agenda/schemas/agenda.schema";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { agendaType } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Agenda",
};

const AGENDA_COLUMNS =
  "id, title, description, agenda_type, start_at, end_at, location, visibility";

type AgendaQueryRow = {
  id: string;
  title: string;
  description: string | null;
  agenda_type: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  visibility: string;
};

function toRow(row: AgendaQueryRow): AgendaRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    agendaType: row.agenda_type,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    visibility: row.visibility,
  };
}

/** `YYYY-MM` yang tervalidasi; nilai aneh dari URL jatuh ke bulan berjalan. */
function resolveMonthKey(raw: string | undefined): string {
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return fallback;

  const year = Number(raw.slice(0, 4));
  return year >= 2000 && year <= 2100 ? raw : fallback;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.agenda.view)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const view = params.tampilan === "kalender" ? "kalender" : "daftar";
  const monthKey = resolveMonthKey(
    typeof params.bulan === "string" ? params.bulan : undefined,
  );

  const supabase = await createClient();

  const permissions = {
    canCreate: can(context, PERMISSIONS.agenda.create),
    canEdit: can(context, PERMISSIONS.agenda.edit),
    canDelete: can(context, PERMISSIONS.agenda.delete),
  };

  const header = (
    <PageHeader
      title="Agenda"
      description="Kalender kegiatan organisasi."
      actions={
        <Suspense fallback={<div className="h-10 w-40" />}>
          <AgendaViewToggle current={view} />
        </Suspense>
      }
    />
  );

  if (view === "kalender") {
    // Hanya bulan yang sedang dilihat yang diambil — bukan seluruh agenda
    // organisasi lalu disaring di browser (SYSTEM.md §63).
    const [year, month] = monthKey.split("-").map(Number);
    const from = new Date(year!, month! - 1, 1);
    const to = new Date(year!, month!, 1);

    const { data } = await supabase
      .from("agenda_items")
      .select(AGENDA_COLUMNS)
      .eq("organization_id", context.organizationId)
      .is("deleted_at", null)
      .gte("start_at", from.toISOString())
      .lt("start_at", to.toISOString())
      .order("start_at", { ascending: true });

    return (
      <div className="space-y-5">
        {header}
        <Suspense fallback={<div className="h-96" />}>
          <AgendaCalendar
            monthKey={monthKey}
            items={((data as AgendaQueryRow[] | null) ?? []).map(toRow)}
          />
        </Suspense>
      </div>
    );
  }

  const daftar = bacaParamDaftar(params, {
    ukuranHalaman: 1,
    kunciSaring: ["jenis"],
  });

  const nowIso = new Date().toISOString();

  // Dua query terpisah, bukan satu daftar panjang: agenda mendatang dan
  // agenda lampau dibaca dengan cara berbeda — yang satu untuk direncanakan,
  // yang lain untuk ditelusuri.
  // Pencarian dan penyaringan diterapkan pada KEDUANYA — bukan sekali pada
  // gabungannya. Menggabungkan dua bacaan itu hanya demi satu penyaring akan
  // menghapus perbedaan yang justru berguna.
  let mendatangQuery = supabase
    .from("agenda_items")
    .select(AGENDA_COLUMNS)
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null)
    .gte("start_at", nowIso);

  let lampauQuery = supabase
    .from("agenda_items")
    .select(AGENDA_COLUMNS)
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null)
    .lt("start_at", nowIso);

  if (daftar.saring.jenis) {
    mendatangQuery = mendatangQuery.eq("agenda_type", daftar.saring.jenis);
    lampauQuery = lampauQuery.eq("agenda_type", daftar.saring.jenis);
  }

  if (daftar.cari) {
    const pola = polaCari(daftar.cari);
    mendatangQuery = mendatangQuery.ilike("title", pola);
    lampauQuery = lampauQuery.ilike("title", pola);
  }

  const [upcoming, past] = await Promise.all([
    mendatangQuery.order("start_at", { ascending: true }).limit(50),
    lampauQuery.order("start_at", { ascending: false }).limit(20),
  ]);

  return (
    <AgendaManager
      aksiTambahan={
        <Suspense fallback={<div className="h-11 w-40" />}>
          <AgendaViewToggle current={view} />
        </Suspense>
      }
      organizationId={context.organizationId}
      upcoming={((upcoming.data as AgendaQueryRow[] | null) ?? []).map(toRow)}
      past={((past.data as AgendaQueryRow[] | null) ?? []).map(toRow)}
      permissions={permissions}
      daftar={{
        cari: daftar.cari,
        jenis: daftar.saring.jenis,
        jenisOptions: AGENDA_TYPES.map((jenis) => ({
          value: jenis,
          label: agendaType(jenis).label,
        })),
      }}
    />
  );
}
