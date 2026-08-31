import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AvatarCard } from "@/features/profile/components/avatar-card";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getOwnAvatarUrl } from "@/features/profile/queries/get-avatar-url";
import { getOwnGender } from "@/features/profile/queries/get-own-gender";
import {
  listAccessibleOrganizations,
  requireAccessContext,
  requireProfile,
} from "@/lib/auth/context";
import { formatDate, orDash } from "@/lib/format";
import { memberStatus as memberStatusTone, roleStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profil Saya",
};

/**
 * Halaman swalayan.
 *
 * Setiap pengguna dapat membukanya tanpa permission apa pun — ia hanya
 * menampilkan data miliknya sendiri (docs/PERMISSIONS.md §60).
 */
export default async function ProfilePage() {
  const [profile, context, organizations, avatarUrl, gender] =
    await Promise.all([
      requireProfile(),
      requireAccessContext(),
      listAccessibleOrganizations(),
      getOwnAvatarUrl(),
      getOwnGender(),
    ]);

  // Data anggota milik pengguna pada organisasi aktif, bila akunnya memang
  // sudah ditautkan.
  let ownMember: {
    id: string;
    fullName: string;
    memberNumber: string | null;
    status: string;
    joinDate: string | null;
  } | null = null;

  if (context.memberId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("members")
      .select("id, full_name, member_number, status, join_date")
      .eq("id", context.memberId)
      .maybeSingle();

    if (data) {
      ownMember = {
        id: data.id,
        fullName: data.full_name,
        memberNumber: data.member_number,
        status: data.status,
        joinDate: data.join_date,
      };
    }
  }

  const memberStatus = ownMember ? memberStatusTone(ownMember.status) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Profil Saya"
        description="Data akun dan keanggotaan Anda."
      />

      <AvatarCard
        avatarUrl={avatarUrl}
        gender={gender}
        identity={context.memberId ?? profile.id}
      />

      <ProfileForm displayName={profile.display_name} email={profile.email} />

      <Card>
        <CardHeader>
          <CardTitle>Keanggotaan Organisasi</CardTitle>
        </CardHeader>

        {organizations.length === 0 ? (
          <CardContent>
            <p className="text-[13px] text-muted-foreground">
              Akun Anda belum ditautkan ke organisasi mana pun. Hubungi operator
              organisasi Anda untuk mendapatkan akses.
            </p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {organizations.map((organization) => {
              const role = roleStatus(organization.roleCode);
              const isActive =
                organization.organizationId === context.organizationId;

              return (
                <li
                  key={organization.organizationId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {organization.name}
                      {isActive ? (
                        <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                          (aktif)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {organization.levelCode} · {organization.typeCode}
                    </p>
                  </div>
                  <Badge tone={role.tone}>{role.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Anggota Saya</CardTitle>
          {ownMember ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/anggota/${ownMember.id}`}>Lihat detail</Link>
            </Button>
          ) : null}
        </CardHeader>

        <CardContent>
          {ownMember ? (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-muted-foreground">
                  Nama Anggota
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {ownMember.fullName}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">
                  Nomor Anggota
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {orDash(ownMember.memberNumber)}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">Status</dt>
                <dd className="mt-0.5">
                  {memberStatus ? (
                    <Badge tone={memberStatus.tone}>{memberStatus.label}</Badge>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">
                  Tanggal Bergabung
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">
                  {ownMember.joinDate ? formatDate(ownMember.joinDate) : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Akun Anda belum ditautkan ke data anggota pada organisasi aktif.
              Tanpa tautan itu, Anda belum dapat mendaftar event atau melakukan
              presensi mandiri.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
