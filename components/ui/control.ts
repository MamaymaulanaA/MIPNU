/**
 * Tinggi kontrol standar: 46px di bawah 480px, 44px di atasnya.
 *
 * Satu tempat untuk Button, Input, dan Select — ditulis ulang di dua berkas,
 * cepat atau lambat keduanya bergeser dan toolbar terlihat bertingkat. Ponsel
 * sengaja lebih besar: jari menuntut sasaran lebih luas daripada kursor.
 * `min-[480px]` arbitrer karena batas tablet spesifikasi ini 480px, bukan 640px.
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

export const TINGGI_KONTROL_RINGKAS = "h-11 min-[480px]:h-9";
