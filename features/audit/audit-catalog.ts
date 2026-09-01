/**
 * Katalog jenis sumber daya pada audit log.
 *
 * Himpunan TERTUTUP: setiap nilai di sini benar-benar ditulis oleh
 * `recordAudit()` di suatu tempat pada aplikasi — daftarnya ditelusuri dari
 * pemanggil `resourceType`, bukan dikarang.
 *
 * Dipakai sebagai pilihan penyaring. Alternatifnya adalah menanyakan nilai
 * distinct ke database setiap kali halaman dimuat, dan PostgREST tidak punya
 * DISTINCT — yang tersisa hanyalah menarik ribuan baris lalu menyaringnya di
 * aplikasi, persis yang dilarang untuk daftar sepanjang ini (AGENTS.md §57).
 */
export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  agenda_item: "Agenda",
  announcement: "Pengumuman",
  attendance_session: "Sesi Presensi",
  budget: "Anggaran",
  cadreship_record: "Kaderisasi",
  document: "Dokumen",
  election: "Pemilihan",
  event: "Event",
  financial_account: "Akun Kas",
  financial_category: "Kategori Keuangan",
  financial_transaction: "Transaksi",
  incoming_letter: "Surat Masuk",
  management_assignment: "Kepengurusan",
  meeting: "Rapat",
  member: "Anggota",
  organization: "Organisasi",
  organization_membership: "Akun Organisasi",
  organization_period: "Periode",
  outgoing_letter: "Surat Keluar",
  position: "Jabatan",
  work_program: "Program Kerja",
};

/** Pilihan penyaring, sudah berurut menurut labelnya. */
export const AUDIT_RESOURCE_OPTIONS = Object.entries(AUDIT_RESOURCE_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, "id"));

/** Ukuran halaman audit. Kecil, karena barisnya dibaca satu per satu. */
export const AUDIT_PAGE_SIZE = 25;
