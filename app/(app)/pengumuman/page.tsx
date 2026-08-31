import type { Metadata } from "next";

import { ForbiddenState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import {
  AnnouncementManager,
  type AnnouncementRow,
} from "@/features/announcements/components/announcement-manager";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
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
export default async function AnnouncementsPage() {
  const context = await requireAccessContext();

  if (
    !context.organizationId ||
    !can(context, PERMISSIONS.announcements.view)
  ) {
    return <ForbiddenState />;
  }

  const canEdit = can(context, PERMISSIONS.announcements.edit);

  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      "id, title, content, audience_type, status, published_at, expires_at",
    )
    .eq("organization_id", context.organizationId)
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false });

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
    <div className="space-y-5">
      <PageHeader
        title="Pengumuman"
        description={
          canEdit
            ? "Pengumuman organisasi beserta draf dan arsipnya."
            : "Pengumuman yang ditujukan untuk Anda."
        }
      />

      <AnnouncementManager
        organizationId={context.organizationId}
        announcements={announcements}
        readOnly={!canEdit}
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
    </div>
  );
}
