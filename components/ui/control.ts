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

/**
 * Tinggi kontrol RINGKAS untuk aksi sebaris.
 *
 * Dipakai oleh kontrol yang duduk di dalam kartu berdampingan dengan tombol
 * `size="sm"` — pemilih status pada Program Kerja dan Anggaran. Tombol itu
 * setinggi 36px; kontrol standar 44px, dan berdampingan keduanya terbaca
 * sebagai dua komponen dari sistem berbeda, bukan satu kelompok aksi.
 *
 * `min-[480px]:h-9` BUKAN pengulangan yang bisa dibuang. Menulis `h-9` saja
 * hanya menimpa `h-[46px]` dari `TINGGI_KONTROL`; varian `min-[480px]:h-11`
 * miliknya selamat dan kembali berlaku begitu layar >= 480px. Itulah sebabnya
 * pemilih status terukur 44px di desktop padahal kodenya menulis `h-9` —
 * kelasnya ada, tetapi kalah oleh varian yang lebih spesifik.
 */
export const TINGGI_KONTROL_RINGKAS = "h-9 min-[480px]:h-9";
