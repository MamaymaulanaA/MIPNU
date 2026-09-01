import type { Metadata } from "next";
import Link from "next/link";
import { Building2, IdCard } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileIdentityCard } from "@/features/profile/components/profile-identity-card";
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
 * Batas pratinjau keanggotaan.
 *
 * Seorang super admin dapat mengakses SELURUH organisasi platform, dan
 * `listAccessibleOrganizations()` memang mengembalikan semuanya. Tanpa batas,
 * halaman profilnya memanjang sepanjang daftar organisasi — padahal yang
 * ditanyakan halaman ini adalah "saya siapa", bukan "ada organisasi apa saja".
 * Selebihnya cukup dihitung.
 */
const BATAS_KEANGGOTAAN = 6;

/**
 * Halaman swalayan.
 *
 * Setiap pengguna dapat membukanya tanpa permission apa pun — ia hanya
 * menampilkan data miliknya sendiri (docs/PERMISSIONS.md §60).
 *
 * SATU SUSUNAN UNTUK SEMUA PERAN. Yang berbeda antar peran hanyalah ISINYA:
 * super admin biasanya punya banyak keanggotaan dan tanpa data anggota,
 * seorang anggota punya satu keanggotaan dan satu data anggota. Susunannya
 * tidak bercabang menurut peran, dan tidak ada kartu yang dimunculkan hanya
 * agar kisinya terlihat penuh.
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
  const tampil = organizations.slice(0, BATAS_KEANGGOTAAN);
  const sisa = organizations.length - tampil.length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Profil Saya"
        description="Data akun dan keanggotaan Anda."
      />

      {/*
        Dua kolom, 40/60 — bukan 50/50.

        Kolom kiri memuat identitas dan data anggota: keduanya berupa beberapa
        baris pendek yang lebarnya tidak bertambah berguna. Kolom kanan memuat
        daftar keanggotaan, tempat nama organisasi panjang dan lencana peran
        harus muat pada satu baris. Membaginya rata membuat sisi yang butuh
        ruang justru yang paling sempit.

        Menumpuk di bawah 1024px: pada 768px, 40% dari lebar isi tinggal
        sekitar 260px, dan baris keanggotaan mulai membungkus.
      */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {/*
          `min-w-0` pada KEDUA anak kisi, dan itu bukan hiasan.

          Anak kisi bawaannya `min-width: auto`, artinya ia menolak menyusut di
          bawah lebar min-content isinya. Pada kolom tunggal di ponsel, isi
          terlebar — kepala kartu berisi judul beserta tombol "Ubah Profil" —
          menahan seluruh kolom di 387px. Diukur di dalam iframe selebar 320px:
          halaman meluber 83px ke kanan dan lencana peran keluar layar,
          sementara /dashboard dan /pengguna pada lebar yang sama nol.

          `minmax(0,…)` pada `lg:grid-cols` hanya mengurus TRACK-nya, dan hanya
          mulai 1024px. Yang menahan di bawah itu adalah itemnya.
        */}
        <div className="min-w-0 space-y-5">
          <ProfileIdentityCard
            displayName={profile.display_name}
            email={profile.email}
            avatarUrl={avatarUrl}
            gender={gender}
            identity={context.memberId ?? profile.id}
          />

          <Card>
            <CardHeader>
              <CardTitle>Data Anggota Saya</CardTitle>
              {ownMember ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/anggota/${ownMember.id}`}>Lihat detail</Link>
                </Button>
              ) : null}
            </CardHeader>

            {ownMember ? (
              <CardContent>
                <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                  <Rincian label="Nama Anggota" nilai={ownMember.fullName} />
                  <Rincian
                    label="Nomor Anggota"
                    nilai={orDash(ownMember.memberNumber)}
                  />
                  <div>
                    <dt className="text-[12.5px] text-muted-foreground">
                      Status
                    </dt>
                    <dd className="mt-1">
                      {memberStatus ? (
                        <Badge tone={memberStatus.tone}>
                          {memberStatus.label}
                        </Badge>
                      ) : null}
                    </dd>
                  </div>
                  <Rincian
                    label="Tanggal Bergabung"
                    nilai={
                      ownMember.joinDate ? formatDate(ownMember.joinDate) : "—"
                    }
                  />
                </dl>
              </CardContent>
            ) : (
              /* Keadaan kosong bersama, dipendekkan. Bawaannya `py-14` —
                 dirancang untuk keadaan kosong selebar halaman, dan di dalam
                 kartu sekecil ini ia menghasilkan lubang alih-alih penjelasan
                 (docs/UI.md §31). */
              <EmptyState
                icon={IdCard}
                title="Belum terhubung ke data anggota"
                description="Tanpa tautan itu, Anda belum dapat mendaftar event atau melakukan presensi mandiri. Hubungi operator organisasi Anda."
                className="px-5 py-9"
              />
            )}
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Keanggotaan Organisasi</CardTitle>
            {organizations.length > 0 ? (
              <span className="text-[12.5px] text-muted-foreground">
                {organizations.length} organisasi
              </span>
            ) : null}
          </CardHeader>

          {organizations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Belum tertaut ke organisasi"
              description="Hubungi operator organisasi Anda untuk mendapatkan akses."
              className="px-5 py-9"
            />
          ) : (
            <>
              <ul className="divide-y divide-border">
                {tampil.map((organization) => {
                  const role = roleStatus(organization.roleCode);
                  const isActive =
                    organization.organizationId === context.organizationId;

                  return (
                    <li
                      key={organization.organizationId}
                      className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {organization.name}
                        </p>
                        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                          {organization.levelCode} · {organization.typeCode}
                          {isActive ? " · sedang aktif" : ""}
                        </p>
                      </div>
                      {/* Lencana peran mengikuti lebar teksnya; `shrink-0`
                          menjaganya utuh ketika nama organisasi panjang. */}
                      <Badge tone={role.tone} className="shrink-0">
                        {role.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>

              {sisa > 0 ? (
                <div className="border-t border-border px-4 py-3 text-[12.5px] text-muted-foreground sm:px-5">
                  dan {sisa} organisasi lainnya
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Rincian({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm break-words text-foreground">{nilai}</dd>
    </div>
  );
}
