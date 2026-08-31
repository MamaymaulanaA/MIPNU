"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Error boundary area aplikasi.
 *
 * Berbeda dari `app/error.tsx` yang menggantikan seluruh layar: yang ini
 * berada di dalam shell, sehingga sidebar dan header tetap ada dan pengguna
 * dapat berpindah ke halaman lain alih-alih menemui layar kosong.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mipnu] render error", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-xl">
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-md bg-destructive-soft text-destructive"
        >
          <AlertCircle size={18} strokeWidth={1.9} />
        </span>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Halaman ini gagal dimuat
          </p>
          <p className="mx-auto max-w-md text-[13px] text-muted-foreground">
            Silakan coba lagi. Jika masalah berlanjut, hubungi operator
            organisasi Anda.
          </p>
          {error.digest ? (
            <p className="text-[12px] text-muted-foreground">
              Kode kejadian: {error.digest}
            </p>
          ) : null}
        </div>

        <Button onClick={reset}>Coba lagi</Button>
      </div>
    </Card>
  );
}
