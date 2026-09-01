import Link from "next/link";
import type { Route } from "next";

import { TINGGI_KONTROL } from "@/components/ui/control";
import { cn } from "@/lib/utils";

export const ELECTION_TABS = [
  "ringkasan",
  "kandidat",
  "dpt",
  "panitia",
  "partisipasi",
  "hasil",
  "audit",
] as const;

export type ElectionTab = (typeof ELECTION_TABS)[number];

const TAB_LABEL: Record<ElectionTab, string> = {
  ringkasan: "Ringkasan",
  kandidat: "Kandidat",
  dpt: "DPT",
  panitia: "Panitia",
  partisipasi: "Partisipasi",
  hasil: "Hasil",
  audit: "Audit",
};

export function parseTab(value: string | undefined): ElectionTab {
  return ELECTION_TABS.includes(value as ElectionTab)
    ? (value as ElectionTab)
    : "ringkasan";
}

/**
 * Tab detail pemilihan.
 *
 * Berbasis tautan, bukan state client: setiap tab punya URL sendiri sehingga
 * dapat dibagikan, di-refresh, dan dibuka di tab peramban baru — dan seluruh
 * isinya tetap dirender server, tempat permission benar-benar diperiksa.
 *
 * Tab yang tidak berhak dilihat pengguna TIDAK ditampilkan; halaman tetap
 * menolaknya lagi bila URL-nya diketik langsung.
 */
export function ElectionTabs({
  electionId,
  active,
  visible,
}: {
  electionId: string;
  active: ElectionTab;
  visible: readonly ElectionTab[];
}) {
  return (
    <nav
      aria-label="Bagian pemilihan"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1 border-b border-border">
        {visible.map((tab) => {
          const isActive = tab === active;

          return (
            <li key={tab}>
              <Link
                href={
                  `/pemilihan/${electionId}${
                    tab === "ringkasan" ? "" : `?tab=${tab}`
                  }` as Route
                }
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  // Tinggi dari konstanta bersama: 40px yang ditulis sendiri
                  // membuat deretan tab ini satu-satunya kontrol di halaman
                  // yang tidak sejajar dengan tombol di sebelahnya.
                  TINGGI_KONTROL,
                  "-mb-px inline-flex items-center border-b-2 px-3 text-[13px] font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {TAB_LABEL[tab]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
