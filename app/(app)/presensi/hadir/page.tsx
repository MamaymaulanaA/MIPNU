import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCheckIn } from "@/features/attendance/components/qr-check-in";

export const metadata: Metadata = {
  title: "Presensi QR",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Halaman tujuan pemindaian QR.
 *
 * Berada di dalam area terautentikasi, sehingga pengunjung yang belum masuk
 * dialihkan proxy ke /login lebih dulu dan kembali ke sini setelahnya —
 * itulah yang membuat kehadiran selalu terikat pada akun sungguhan.
 *
 * Token TIDAK ditukar di sini. Ia diserahkan ke component client yang
 * memanggil server action, supaya penukaran terjadi sekali atas tindakan
 * pengguna, bukan pada setiap render ulang halaman.
 */
export default async function QrCheckInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const token = typeof params.t === "string" ? params.t : "";

  return (
    <div className="mx-auto max-w-md space-y-5">
      <PageHeader
        title="Presensi"
        description="Konfirmasi kehadiran Anda pada sesi ini."
      />

      {token === "" ? (
        <Card>
          <div className="space-y-3 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              Tautan presensi tidak lengkap
            </p>
            <p className="text-[13px] text-muted-foreground">
              Pindai ulang QR yang ditampilkan panitia.
            </p>
            <Button variant="outline" asChild>
              <Link href="/presensi">Ke daftar presensi</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Suspense fallback={<Card className="h-64" />}>
          <QrCheckIn token={token} />
        </Suspense>
      )}
    </div>
  );
}
