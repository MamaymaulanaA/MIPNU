# MIPNU

**Manajemen Informasi Pelajar Nahdlatul Ulama**

Platform manajemen organisasi untuk IPNU dan IPPNU: satu sistem untuk
keanggotaan, kepengurusan, kegiatan, administrasi, keuangan, dan pemilihan.

## Cakupan

| Bidang       | Isi                                                      |
| ------------ | -------------------------------------------------------- |
| Organisasi   | profil, periode kepengurusan, jabatan, struktur pengurus |
| Keanggotaan  | data anggota, status, kaderisasi, impor & ekspor         |
| Kegiatan     | agenda, event, presensi (termasuk QR), rapat             |
| Administrasi | surat masuk & keluar, dokumen, pengumuman                |
| Keuangan     | akun kas, transaksi, anggaran, laporan, bukti transaksi  |
| Pemilihan    | kandidat, DPT, panitia, pemungutan suara, hasil resmi    |
| Sistem       | pengguna, permission, jejak audit                        |

## Arsitektur

Multi-tenant. Setiap organisasi berdiri sendiri, dan pemisahannya ditegakkan
di database — bukan di antarmuka.

Otorisasi berlapis dan berasal dari satu sumber:

- **Row Level Security** pada setiap tabel aplikasi;
- **permission efektif** dihitung satu resolver SQL yang dipakai bersama oleh
  RLS dan aplikasi, sehingga tampilan dan database tidak pernah berbeda
  pendapat tentang siapa boleh apa;
- **empat role sistem** — `SUPER_ADMIN`, `OPERATOR_ORGANISASI`, `PENGURUS`,
  `ANGGOTA`. Jabatan (Ketua, Sekretaris, Bendahara) BUKAN role; wewenangnya
  datang dari permission jabatan yang berhenti sendiri ketika penugasannya
  berakhir.

Beberapa jaminan ditegakkan database dan tidak dapat dilanggar dari mana pun,
termasuk oleh super admin: transaksi keuangan yang sudah diposting tidak dapat
disunting, surat suara bersifat final dan tidak memuat identitas pemilih, dan
perolehan kandidat tidak dapat dibaca selama pemungutan suara berlangsung.

## Teknologi

Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase
(PostgreSQL, Auth, Storage) · Zod · Vitest

## Menjalankan secara lokal

```bash
npm ci
cp .env.example .env.local   # isi dengan kredensial project Supabase Anda
npm run dev
```

Perintah lain:

```bash
npm run build         # build produksi
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format:check  # Prettier
```

## Environment variable

Salin `.env.example`, lalu isi nilainya. Yang wajib untuk menjalankan aplikasi:

| Variable                        | Sisi    | Keterangan                                    |
| ------------------------------- | ------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | browser | URL project Supabase                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser | Anon key; keamanannya bersandar pada RLS      |
| `NEXT_PUBLIC_SITE_URL`          | browser | Asal aplikasi, dipakai membangun tautan email |
| `SUPABASE_SERVICE_ROLE_KEY`     | server  | Melewati seluruh RLS. Server-only.            |

`SUPABASE_SERVICE_ROLE_KEY` tidak boleh diberi prefiks `NEXT_PUBLIC_` dan tidak
boleh diimpor dari Client Component.

`NEXT_PUBLIC_SITE_URL` wajib diisi di lingkungan produksi. Tanpa itu, aplikasi
jatuh ke `http://localhost:3000`, dan tautan undangan, pemulihan sandi, serta
presensi QR akan menunjuk ke alamat yang tidak dapat dibuka siapa pun.

## Deployment

Repositori ini berisi source produksi dan siap dibangun di Vercel. Setel
keempat variable di atas pada project Vercel sebelum deployment pertama.

Skema database dikelola terpisah dari repositori ini.
