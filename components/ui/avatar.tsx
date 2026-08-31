import { getAvatarPresentation, type StoredGender } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Avatar.
 *
 * Satu-satunya tempat avatar digambar. Tanpa ini, aturan "unggahan menang,
 * lalu jenis kelamin tersimpan, lalu netral" akan ditulis ulang di setiap
 * daftar — dan cepat atau lambat salah satunya berbeda.
 *
 * Soal pembaca layar (docs/UI.md §47): gambarnya DEKORATIF. Nama orangnya
 * selalu sudah tertulis di sebelahnya, jadi `alt` dikosongkan agar tidak
 * dibacakan dua kali. Avatar bawaan juga tidak boleh membacakan "pengguna
 * laki-laki" — itu menyuarakan dugaan sistem, bukan fakta tentang orangnya.
 *
 * Bila avatar berdiri SENDIRI tanpa nama di dekatnya, pemanggil wajib
 * mengisi `label`.
 */
const SIZES = {
  sm: "size-8", // 32px — header, baris padat
  md: "size-9", // 36px — daftar
  lg: "size-10", // 40px — baris anggota
  xl: "size-20", // 80px — halaman profil & detail anggota
  "2xl": "size-24", // 96px — kartu kandidat
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  customUrl,
  gender,
  identity,
  size = "md",
  label,
  className,
}: {
  customUrl?: string | null;
  gender?: StoredGender;
  identity?: string | null;
  size?: AvatarSize;
  /** Isi HANYA bila tidak ada nama tertulis di dekat avatar ini. */
  label?: string;
  className?: string;
}) {
  const { src } = getAvatarPresentation({ customUrl, gender, identity });

  return (
    // next/image dilewati dengan sengaja: avatar unggahan datang sebagai
    // signed URL berumur pendek dengan host dinamis, sehingga tidak dapat
    // disimpan sebagai aset stabil. Avatar bawaannya berupa data URI SVG yang
    // dibangkitkan di dalam proses — tidak ada berkas untuk dioptimasi, dan
    // pipeline gambar hanya akan menambah kerja tanpa menghemat apa pun.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      className={cn(
        "shrink-0 rounded-full border border-border bg-primary-soft object-cover",
        SIZES[size],
        className,
      )}
    />
  );
}
