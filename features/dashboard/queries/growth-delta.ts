// Kartu yang memakai delta ini menampilkan angka KUMULATIF, jadi "vs bulan
// lalu" berarti pertambahan total bulan ini — bukan selisih antar laju
// pertambahan. Memakai selisih antar laju membuat platform yang tumbuh
// terbaca menyusut.
export function deltaBulanTerakhir(
  pertambahanPerBulan: number[],
): number | null {
  return pertambahanPerBulan.length > 0
    ? pertambahanPerBulan[pertambahanPerBulan.length - 1]!
    : null;
}
