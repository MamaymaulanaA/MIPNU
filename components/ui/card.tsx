import { cn } from "@/lib/utils";

/**
 * Card MIPNU: border 1px, radius 8px, bayangan `raised`.
 *
 * Dulu tanpa bayangan sama sekali, dan itu benar selama latar halaman masih
 * cukup gelap untuk memisahkan sendiri. Sejak latar naik ke 99% — tiga
 * tingkat rgb dari kartu, ΔL* 1,01 — pemisahan lewat warna permukaan
 * berhenti bekerja, dan border 1px ditinggal memikulnya sendirian.
 *
 * Mata jauh lebih peka pada gradien di tepi daripada pada beda datar satu
 * tingkat, jadi bayangan setipis `raised` (0 1px 2px, 4% hitam) mengembalikan
 * hierarki tanpa menurunkan latar. UI.md §37 memang bersyarat: kartu tidak
 * harus memakai bayangan JIKA border sudah cukup.
 *
 * Nilainya bukan nilai baru. Kartu dashboard sudah memakai `shadow-raised`
 * sejak awal; yang berubah di sini justru 39 berkas lain berhenti menjadi
 * pengecualian.
 */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card text-card-foreground shadow-raised",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5",
        className,
      )}
      {...props}
    />
  );
}
