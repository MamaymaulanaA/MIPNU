import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

/**
 * Avatar bawaan.
 *
 * Lapisan presentasi murni: tidak membaca database, tidak memutuskan
 * wewenang, dan tidak pernah menjadi tempat menaruh aturan bisnis. Pemanggil
 * sudah memegang data yang berhak ia lihat; berkas ini hanya memutuskan
 * gambar mana yang ditampilkan.
 *
 * Gambarnya DIBANGKITKAN di dalam proses ini memakai @dicebear/core dengan
 * gaya `personas`. Tidak ada permintaan ke api.dicebear.com maupun layanan
 * avatar mana pun: aplikasi yang tidak dapat menampilkan wajah orang hanya
 * karena jaringan sedang putus adalah aplikasi yang bergantung pada hal yang
 * tidak perlu.
 *
 * MENGAPA `personas`, dari 31 gaya yang tersedia:
 *
 *   - opsinya BERNAMA — `long`, `bobCut`, `buzzcut`, `fade` — bukan
 *     `variant37`. Kurasi tampilan menjadi keputusan yang dapat dibaca dan
 *     diperiksa orang lain, bukan tebakan atas nomor;
 *   - ilustrasi datar yang modern dan dewasa, cocok untuk aplikasi
 *     organisasi; bukan piksel, bukan emoji, bukan avatar permainan;
 *   - tidak punya atribut keagamaan atau budaya yang akan terpasang tanpa
 *     data — tidak ada pilihan hijab maupun turban yang bisa terpilih
 *     kebetulan.
 */

/**
 * Jenis kelamin sebagaimana TERSIMPAN di `members.gender`: 'L' atau 'P', dan
 * sangat sering NULL.
 *
 * Nilai ini TIDAK PERNAH ditebak. Tidak dari nama, tidak dari email, tidak
 * dari jabatan. Menebak jenis kelamin seseorang lalu menampilkannya sebagai
 * gambar adalah kesalahan yang terlihat oleh orang yang bersangkutan, dan
 * tidak ada untungnya dibandingkan memakai tampilan netral.
 */
export type StoredGender = "L" | "P" | null | undefined;

/* -------------------------------------------------------------- palet */

/**
 * Latar, pakaian, dan rambut dikunci ke keluarga biru MIPNU.
 *
 * Palet bawaan `personas` memuat hijau (#6dbb58) dan tosca (#54d7c7) pada
 * pakaian; keduanya diganti seluruhnya, bukan disaring belakangan.
 */
const BACKGROUND = ["eef4ff", "c9d8ff", "ffffff"] as const;

const CLOTHING = [
  "1f356b", // navy
  "255ed3", // primary dark
  "2f6fed", // primary blue
  "667085", // slate
  "c9d8ff", // powder blue
] as const;

/** Warna rambut tetap alami — biru pada rambut akan terlihat seperti kostum. */
const HAIR_COLOR = ["362c47", "6c4545", "dee1f5"] as const;

/**
 * Rambut yang membawa warna di luar keluarga biru DIBUANG, bukan dibiarkan:
 *
 *   pigtails, curlyBun, straightBun  -> ikat rambut merah muda #f55d81
 *   cap                              -> aksen oranye #f29c65
 *   beanie                           -> merah #e15c66
 *   bunUndercut                      -> ungu #5a45ff
 *
 * `mohawk` dan `balding` juga dibuang: yang pertama terlalu mencolok untuk
 * konteks organisasi, yang kedua membaca sebagai usia tertentu tanpa data
 * apa pun yang mendasarinya.
 */
const HAIR_MASCULINE = [
  "sideShave",
  "shortCombover",
  "curlyHighTop",
  "buzzcut",
  "bald",
  "fade",
  "shortComboverChops",
] as const;

const HAIR_FEMININE = [
  "long",
  "bobCut",
  "curly",
  "bobBangs",
  "extraLong",
] as const;

/** Netral memakai gabungan keduanya: tidak menyiratkan apa pun. */
const HAIR_NEUTRAL = [
  "long",
  "bobCut",
  "curly",
  "shortCombover",
  "curlyHighTop",
  "buzzcut",
  "fade",
] as const;

/** `walrus` dan `pyramid` dilewati — keduanya berkesan lelucon. */
const FACIAL_HAIR = ["beardMustache", "goatee", "shadow", "soulPatch"] as const;

/**
 * `lips` (gincu) dibuang dari semua kelompok: ia mengandung merah muda di luar
 * palet, dan memasangkannya berdasarkan jenis kelamin adalah dugaan tentang
 * cara seseorang berdandan.
 */
const MOUTH = ["smile", "bigSmile", "smirk"] as const;

/** `sleep`, `wink`, dan `sunglasses` dilewati agar tetap terlihat resmi. */
const EYES = ["open", "happy", "glasses"] as const;

type Presentation = "L" | "P" | "N";

function options(presentation: Presentation) {
  const hair =
    presentation === "L"
      ? HAIR_MASCULINE
      : presentation === "P"
        ? HAIR_FEMININE
        : HAIR_NEUTRAL;

  return {
    backgroundColor: [...BACKGROUND],
    clothingColor: [...CLOTHING],
    hairColor: [...HAIR_COLOR],
    hair: [...hair],
    mouth: [...MOUTH],
    eyes: [...EYES],
    facialHair: [...FACIAL_HAIR],
    // Janggut hanya muncul pada tampilan maskulin, dan tidak selalu.
    facialHairProbability: presentation === "L" ? 35 : 0,
  };
}

/* ------------------------------------------------------------- cache */

/**
 * Hasilnya dihafal per (tampilan, identitas).
 *
 * Satu avatar berukuran sekitar 4 KB dan dibangkitkan dalam hitungan mikro-
 * detik, tetapi daftar anggota menggambar puluhan baris sekaligus dan sering
 * dirender ulang. Batas 512 entri menjaga proses server yang berumur panjang
 * tidak menumpuk memori tanpa akhir.
 */
const cache = new Map<string, string>();
const CACHE_LIMIT = 512;

function generate(presentation: Presentation, seed: string): string {
  const key = `${presentation}:${seed}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const uri = createAvatar(personas, {
    seed,
    ...options(presentation),
  }).toDataUri();

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, uri);

  return uri;
}

/* -------------------------------------------------------------- API */

export type AvatarInput = {
  /** URL avatar yang benar-benar diunggah pengguna. Selalu menang. */
  customUrl?: string | null;
  /** Nilai `members.gender` apa adanya. Jangan diisi hasil tebakan. */
  gender?: StoredGender;
  /** Identitas stabil — id profil atau id anggota — sebagai benih. */
  identity?: string | null;
};

export type AvatarPresentation = {
  src: string;
  /** True bila yang tampil adalah unggahan pengguna, bukan gambar bawaan. */
  isCustom: boolean;
};

/**
 * Urutan yang dipakai, dan urutannya penting:
 *
 *   1. unggahan pengguna — apa pun yang lain, ini menang;
 *   2. avatar bawaan sesuai jenis kelamin yang MEMANG tersimpan;
 *   3. avatar netral.
 *
 * Benihnya identitas stabil, sehingga orang yang sama selalu mendapat wajah
 * yang sama — antar muat ulang, antar sesi, dan antara render server dan
 * klien. Tidak ada Math.random, tidak ada Date.now.
 */
export function getAvatarPresentation({
  customUrl,
  gender,
  identity,
}: AvatarInput): AvatarPresentation {
  if (customUrl) return { src: customUrl, isCustom: true };

  const presentation: Presentation =
    gender === "L" ? "L" : gender === "P" ? "P" : "N";

  return { src: generate(presentation, identity ?? "mipnu"), isCustom: false };
}
