import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import {
  AnnouncementManager,
  type AnnouncementRow,
} from "@/features/announcements/components/announcement-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ANNOUNCEMENT_STATUSES } from "@/features/announcements/schemas/announcement.schema";
import { bacaParamDaftar, polaCari } from "@/lib/list-params";
import { announcementStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pengumuman",
};

/**
 * Satu halaman, dua pembaca.
 *
 * Pengelola melihat draf, terbit, dan arsip; anggota hanya menerima yang
 * sudah terbit, belum kedaluwarsa, dan memang ditujukan kepadanya.
 *
 * Penyaringan itu SELURUHNYA di policy `announcements_select`. Halaman ini
 * tidak menyaring apa pun — mengirim semuanya lalu menyembunyikan sebagian di
 * browser tetap berarti isinya sudah sampai ke sana.
 */
const UKURAN_HALAMAN = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (
    !context.organizationId ||
    !can(context, PERMISSIONS.announcements.view)
  ) {
    return <ForbiddenState />;
  }

  const canEdit = can(context, PERMISSIONS.announcements.edit);

  const daftar = bacaParamDaftar(await searchParams, {
    ukuranHalaman: UKURAN_HALAMAN,
    kunciSaring: ["status"],
  });

  const supabase = await createClient();

  // Penyaringan hak tetap sepenuhnya di policy `announcements_select`; yang
  // ditambahkan di sini hanya penyaringan yang DIMINTA pengguna, di atas apa
  // pun yang sudah diloloskan policy itu.
  let query = supabase
    .from("announcements")
    .select(
      "id, title, content, audience_type, status, published_at, expires_at",
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null);

  if (daftar.saring.status) query = query.eq("status", daftar.saring.status);
  if (daftar.cari) query = query.ilike("title", polaCari(daftar.cari));

  const { data, count } = await query
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(daftar.dari, daftar.sampai);

  const announcements: AnnouncementRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    audienceType: row.audience_type,
    status: row.status,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
  }));

  return (
    <AnnouncementManager
      organizationId={context.organizationId}
      announcements={announcements}
      readOnly={!canEdit}
      daftar={{
        cari: daftar.cari,
        status: daftar.saring.status,
        statusOptions: ANNOUNCEMENT_STATUSES.map((status) => ({
          value: status,
          label: announcementStatus(status).label,
        })),
        halaman: daftar.halaman,
        total: count ?? 0,
        ukuranHalaman: UKURAN_HALAMAN,
      }}
      permissions={{
        canCreate: can(context, PERMISSIONS.announcements.create),
        canEdit,
        canPublish: can(context, PERMISSIONS.announcements.publish),
        canManageAudience: can(
          context,
          PERMISSIONS.announcements.manageAudience,
        ),
        canDelete: can(context, PERMISSIONS.announcements.delete),
      }}
    />
  );
}
