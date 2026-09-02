"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mipnu] root layout error", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "#ffffff",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>
          Aplikasi gagal dimuat
        </h1>

        <p
          style={{
            maxWidth: "28rem",
            fontSize: "13px",
            color: "#64748b",
            margin: 0,
          }}
        >
          Terjadi kesalahan sebelum halaman sempat ditampilkan. Silakan muat
          ulang. Jika masalah berlanjut, hubungi operator organisasi Anda.
        </p>

        {error.digest ? (
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Kode kejadian: {error.digest}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          style={{
            height: "40px",
            padding: "0 16px",
            borderRadius: "8px",
            border: "none",
            background: "#2F6FED",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Coba lagi
        </button>
      </body>
    </html>
  );
}
