"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-md bg-destructive-soft text-destructive"
      >
        <AlertCircle size={20} strokeWidth={1.9} />
      </span>

      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="max-w-md text-[13px] text-muted-foreground">
        Halaman ini gagal dimuat. Silakan coba lagi. Jika masalah berlanjut,
        hubungi operator organisasi Anda.
      </p>

      {error.digest ? (
        <p className="text-[12px] text-muted-foreground">
          Kode kejadian: {error.digest}
        </p>
      ) : null}

      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
}
