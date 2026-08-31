import { Check } from "lucide-react";

/**
 * Kerangka halaman autentikasi.
 *
 * Login, lupa sandi, dan atur ulang sandi memakai bingkai yang sama supaya
 * ketiganya terasa satu alur, bukan tiga halaman yang kebetulan mirip
 * (docs/UI.md §24).
 *
 * Susunannya dua panel:
 *
 *   kiri   navy institusional — identitas dan alasan sistem ini ada;
 *   kanan  putih bersih — hanya form.
 *
 * Pada layar sempit pembagian 50/50 DITINGGALKAN: panel kiri menyusut
 * menjadi kepala ringkas dan form naik ke atas lipatan, karena orang yang
 * membuka halaman ini di ponsel datang untuk masuk, bukan membaca profil
 * organisasi (docs/UI.md §23).
 */

/** Tiga hal yang benar-benar dikerjakan MIPNU. Bukan slogan pemasaran. */
const POINTS = [
  "Data anggota dan kepengurusan dalam satu pangkalan data",
  "Keuangan berjenjang dengan jejak yang tidak dapat diubah",
  "Pemilihan dengan surat suara yang tetap rahasia",
];

function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        "grid shrink-0 place-items-center rounded-md bg-primary font-bold text-primary-foreground " +
        (className ?? "")
      }
    >
      M
    </span>
  );
}

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-card lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {/* ---------------------------------------------- panel institusional */}
      <aside className="bg-navy text-navy-foreground">
        {/* Ponsel: kepala ringkas. Cukup menandai tempat, lalu menyingkir. */}
        <div className="flex items-center gap-3 px-5 py-5 lg:hidden">
          <Mark className="size-9 text-base" />
          <div className="min-w-0">
            <p className="text-[15px] leading-tight font-semibold">MIPNU</p>
            <p className="truncate text-[12px] text-navy-foreground/70">
              Pelajar Nahdlatul Ulama
            </p>
          </div>
        </div>

        {/* Desktop: panel penuh. */}
        <div className="hidden h-full flex-col justify-between p-10 lg:flex xl:p-12">
          <div className="flex items-center gap-3">
            <Mark className="size-10 text-lg" />
            <span className="text-lg font-semibold tracking-tight">MIPNU</span>
          </div>

          <div className="max-w-md">
            {/* Warna ditulis eksplisit: aturan dasar `h1..h4` di globals.css
                memaksa `--foreground` yang gelap, dan itu mengalahkan
                pewarisan `text-navy-foreground` dari panel — headline-nya
                nyaris hitam di atas navy. */}
            <h2 className="text-[28px] leading-[1.2] font-semibold tracking-tight text-balance text-navy-foreground">
              Manajemen Informasi Pelajar Nahdlatul Ulama
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-navy-foreground/70">
              Satu sistem untuk keanggotaan, kepengurusan, kegiatan, keuangan,
              dan pemilihan organisasi.
            </p>

            <ul className="mt-8 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-navy-foreground/10"
                  >
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-navy-foreground/85">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[12px] text-navy-foreground/50">
            Akses terbatas bagi pengurus dan anggota terdaftar.
          </p>
        </div>
      </aside>

      {/* ------------------------------------------------------ panel form */}
      {/* `flex-1` hanya berarti di luar mode grid: di bawah `lg`, panel form
          mengisi sisa tinggi layar sehingga isinya benar-benar terpusat alih-
          alih menempel di bawah kepala navy dengan ruang kosong panjang. Pada
          `lg` ke atas properti ini tidak berlaku bagi item grid, jadi
          susunan dua panel tidak berubah sama sekali. */}
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {description}
          </p>

          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
