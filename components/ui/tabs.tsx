import Link from "next/link";
import type { Route } from "next";

import { TINGGI_KONTROL } from "@/components/ui/control";
import { cn } from "@/lib/utils";

export type PageTabItem = {
  href: string;
  label: string;
  active: boolean;
};

/**
 * Deretan tab halaman: kepala kartu, bukan bilah mengambang.
 *
 * Sebelumnya aplikasi ini punya DUA bentuk tab. Pemilihan memakai garis bawah
 * setinggi kontrol lain; Surat memakai pil di dalam jalur `bg-muted/40`, dan
 * pil aktifnya diisi `bg-background`. Bentuk kedua itu rapuh: warna isinya
 * adalah token latar halaman, jadi setiap kali latar dinaikkan mendekati
 * putih, penanda "tab ini sedang aktif" ikut memudar. Pada 98.5% ia tinggal
 * berselisih satu level dari jalurnya sendiri — praktis tak terlihat.
 *
 * Bentuk garis bawah tidak punya kelemahan itu: penandanya `--primary`, warna
 * yang tidak pernah ikut bergerak bersama latar. Ia juga memberi tab tinggi
 * yang sama dengan tombol dan kolom cari di sebelahnya.
 */
export function PageTabs({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly PageTabItem[];
  className?: string;
}) {
  return (
    // <nav> dengan `aria-current`, bukan `role="tablist"`: setiap tab di sini
    // adalah tautan yang mengubah URL, jadi ini navigasi halaman. `role="tab"`
    // menjanjikan panel yang bertukar tanpa berpindah alamat.
    <nav
      aria-label={label}
      className={cn(
        "scroll-none border-b border-border px-4 sm:px-5",
        className,
      )}
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                TINGGI_KONTROL,
                "-mb-px inline-flex items-center border-b-2 px-3 text-[13px] font-medium transition-colors",
                item.active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
