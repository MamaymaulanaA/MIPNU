/**
 * Tinggi kontrol standar MIPNU.
 *
 * SATU tempat, dipakai bersama oleh Button, Input, dan Select. Aturan
 * "field dan tombol setinggi sama" tidak dapat dijaga oleh disiplin penulis —
 * begitu tingginya ditulis ulang di dua berkas, cepat atau lambat salah
 * satunya bergeser dan toolbar terlihat bertingkat.
 *
 * SKALA:
 *
 *   < 480px   46px   ponsel — sasaran sentuh paling nyaman
 *   >= 480px  44px   tablet dan desktop
 *
 * Ponsel sengaja SEDIKIT lebih besar, bukan sama. Jari menuntut sasaran yang
 * lebih besar daripada kursor; sebaliknya 46px di desktop mulai terasa
 * bongsor untuk formulir yang panjang.
 *
 * `min-[480px]` dipakai apa adanya karena Tailwind tidak punya breakpoint di
 * situ — batas tablet pada spesifikasi ini memang 480px, bukan 640px.
 */
export const TINGGI_KONTROL = "h-[46px] min-[480px]:h-11";

/**
 * Tombol khusus ikon.
 *
 * Sedikit lebih ringkas daripada kontrol standar di layar besar: sebuah
 * kotak 44px yang hanya berisi ikon 18px terlihat kosong berdampingan dengan
 * tombol berteks. Di ponsel ia TIDAK dikecilkan — di sanalah sasaran sentuh
 * justru paling menentukan.
 */
export const TINGGI_KONTROL_IKON = "size-11 min-[480px]:size-10";
