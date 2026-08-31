# MIPNU

## Manajemen Informasi Pelajar Nahdlatul Ulama

MIPNU adalah platform manajemen organisasi terintegrasi untuk **IPNU dan IPPNU**.

Project ini dirancang sebagai sistem organisasi berbasis web yang dapat digunakan untuk mengelola:

- organisasi;
- anggota;
- kepengurusan;
- periode kepengurusan;
- jabatan;
- kaderisasi;
- program kerja;
- agenda;
- event;
- presensi;
- rapat;
- administrasi surat;
- dokumen;
- keuangan;
- pengumuman;
- laporan;
- audit log;
- dan e-voting.

MIPNU bukan project demo.

Seluruh pengembangan harus diarahkan menjadi aplikasi yang:

- production-ready;
- aman;
- modular;
- maintainable;
- scalable;
- responsive;
- menggunakan data nyata;
- memiliki multi-organization architecture;
- menggunakan authorization sampai level database.

---

# Source of Truth

Sebelum melakukan perubahan pada project ini, AI agent atau developer **WAJIB membaca dokumen berikut**:

1. `README.md`
2. `PRD.md`
3. `SYSTEM.md` jika sudah tersedia
4. `AGENTS.md` jika sudah tersedia
5. dokumen terkait di folder `docs/`
6. migration dan schema Supabase yang sudah tersedia

Urutan prioritas instruksi:

```text
PRD.md
↓
SYSTEM.md
↓
AGENTS.md
↓
docs/*
↓
existing architecture/code
```

Jika terdapat konflik antara implementasi lama dan PRD terbaru, analisis terlebih dahulu sebelum melakukan perubahan besar.

Jangan melakukan rewrite project tanpa alasan teknis yang jelas.

---

# Product

**Nama:** MIPNU

**Kepanjangan:**

Manajemen Informasi Pelajar Nahdlatul Ulama

**Deskripsi:**

Platform Manajemen Terintegrasi IPNU & IPPNU.

---

# Product Scope

MIPNU dirancang sebagai satu platform yang dapat digunakan oleh banyak unit organisasi.

Contoh:

```text
PW
│
├── PC
│   │
│   ├── PAC
│   │   │
│   │   ├── PR
│   │   └── PK
```

IPNU dan IPPNU dapat memiliki entitas organisasi masing-masing.

Setiap organisasi mempunyai data sendiri.

Data organisasi tidak boleh bocor ke organisasi lain.

---

# Architecture

MIPNU menggunakan pendekatan:

**Multi-Organization / Multi-Tenant**

Satu platform MIPNU dapat digunakan banyak organisasi.

Tidak menggunakan satu Supabase project per organisasi.

Data dipisahkan melalui organization context dan database authorization.

---

# Core Roles

MIPNU memiliki empat role utama:

```text
SUPER_ADMIN
OPERATOR_ORGANISASI
PENGURUS
ANGGOTA
```

Jangan menambahkan role baru tanpa kebutuhan yang jelas.

---

# Role dan Jabatan Harus Dipisahkan

Contoh:

```text
Nama:
Ahmad

Role:
PENGURUS

Jabatan:
Sekretaris
```

Ketua, Wakil Ketua, Sekretaris, Bendahara, Ketua Departemen, dan jabatan organisasi lainnya **bukan system role**.

Hak akses ditentukan menggunakan:

```text
ROLE
+
POSITION
+
PERMISSION
+
ORGANIZATION CONTEXT
```

---

# Special Assignment

Tugas sementara tidak dibuat sebagai role permanen.

Contoh:

```text
Ketua Panitia
Panitia Event
Operator Event
Panitia Pemilihan
Operator Pemilihan
```

Gunakan assignment yang terikat kepada event atau election tertentu.

---

# Technology Stack

## Application

- Next.js
- TypeScript
- App Router

## UI

- Tailwind CSS
- shadcn/ui
- Lucide Icons

## Database

- Supabase PostgreSQL

## Authentication

- Supabase Auth

## Authorization

- Supabase Row Level Security
- Role
- Permission
- Organization Membership

## Storage

- Supabase Storage

## Validation

- Zod

## Forms

- React Hook Form jika sesuai

## Charts

- Recharts jika diperlukan

## Deployment

- Vercel

---

# UI Reference

Referensi visual utama MIPNU:

https://github.com/MamaymaulanaA/Apeiron-portal

Repository tersebut digunakan **hanya sebagai referensi UI/UX**.

Pelajari:

- sidebar;
- navigation;
- dashboard composition;
- typography;
- spacing;
- cards;
- table;
- form;
- button;
- badge;
- modal;
- dropdown;
- responsive behavior;
- loading state;
- empty state;
- visual hierarchy.

---

# Important UI Rule

JANGAN mengambil business logic Apeiron Portal.

Apeiron Portal adalah:

```text
VISUAL REFERENCE
```

MIPNU adalah:

```text
NEW PRODUCT
+
NEW DATABASE
+
NEW BUSINESS LOGIC
```

Jangan mencampurkan domain Apeiron dengan domain MIPNU.

---

# Design Direction

UI MIPNU harus:

- clean;
- professional;
- modern;
- mature;
- responsive;
- mudah digunakan;
- konsisten;
- information-dense tetapi tidak sesak.

Hindari:

- excessive gradient;
- glow;
- glassmorphism berlebihan;
- shadow berlebihan;
- card terlalu besar;
- radius tidak konsisten;
- whitespace berlebihan;
- dashboard generik hasil AI;
- elemen dekoratif yang tidak mempunyai fungsi.

Gunakan repository Apeiron sebagai sumber visual utama.

---

# Real Data Only

Production application tidak boleh bergantung pada placeholder atau hardcoded statistics.

Jangan membuat:

```text
Total Anggota: 1.284
Saldo: Rp12.000.000
Event: 24
```

sebagai angka tetap di component.

Semua informasi production harus berasal dari database.

Seed/mock data hanya boleh digunakan untuk development/testing dan harus dipisahkan dari production behavior.

---

# Security Principles

Security merupakan requirement utama.

WAJIB:

- Supabase RLS;
- server-side authorization;
- secure authentication;
- organization isolation;
- input validation;
- permission checking;
- audit log;
- secure file access.

Jangan hanya menyembunyikan button pada frontend.

User yang tidak mempunyai permission tidak boleh dapat menjalankan operasi tersebut melalui API secara langsung.

---

# Supabase Service Role

`SUPABASE_SERVICE_ROLE_KEY`:

- hanya server-side;
- tidak boleh berada di Client Component;
- tidak boleh memiliki prefix `NEXT_PUBLIC`;
- tidak boleh dikirim ke browser;
- tidak boleh ditulis langsung ke source code;
- tidak boleh dicetak ke log.

Secrets harus menggunakan environment variables.

---

# Row Level Security

RLS merupakan bagian inti architecture.

Contoh:

```text
PAC IPNU A
```

tidak boleh dapat membaca:

```text
PAC IPNU B
```

meskipun user mencoba memanggil endpoint/database secara manual.

Security harus ditegakkan sampai database layer.

---

# Database

Gunakan PostgreSQL relational architecture.

Jangan menyimpan relationship penting sebagai JSON jika relational model lebih tepat.

Domain utama meliputi:

```text
organizations
organization_periods

profiles
members
organization_memberships

roles
permissions
positions

cadreship

programs

events
event_participants
attendance

meetings

letters

documents

financial_accounts
transactions

announcements

elections
candidates
election_voters
ballots

audit_logs
```

Schema final mengikuti `PRD.md` dan dokumen database.

---

# Database Migration

Semua perubahan schema database harus menggunakan migration.

Jangan hanya melakukan perubahan manual pada Supabase Dashboard tanpa mencatat migration di repository.

Database schema dan source code harus selalu sinkron.

---

# E-Voting

E-Voting bukan CRUD biasa.

Sistem harus memenuhi:

```text
ONE PERSON
ONE ELECTION
ONE VOTE
```

Validasi harus dilakukan server/database-side.

---

# Secret Ballot

Jika election menggunakan secret ballot:

Jangan menyimpan:

```text
member_id
+
candidate_id
```

secara langsung pada satu ballot record.

Pisahkan identity voter dengan ballot.

Sistem boleh mengetahui:

```text
siapa sudah memilih
```

tetapi tidak menyimpan hubungan langsung:

```text
siapa memilih siapa
```

---

# Voting Transaction

Cast vote harus atomic.

```text
Authenticate
↓
Validate Election
↓
Validate DPT
↓
Validate Not Voted
↓
Insert Anonymous Ballot
+
Mark Voter as Voted
↓
Commit
```

Jika satu operasi gagal:

```text
ROLLBACK
```

Duplicate voting tidak boleh terjadi.

---

# Development Strategy

Jangan membangun semua fitur sekaligus.

---

## Phase 1

Foundation / MVP:

- Authentication
- Organization
- Profile
- Roles & Permission foundation
- Members
- Organization Period
- Positions
- Kepengurusan
- Dashboard
- Agenda
- Event
- Attendance

---

## Phase 2

Operational Modules:

- Program Kerja
- Rapat
- Administrasi Surat
- Dokumen
- Pengumuman
- Kaderisasi

---

## Phase 3

Finance:

- akun kas;
- pemasukan;
- pengeluaran;
- kategori;
- anggaran;
- bukti transaksi;
- laporan.

---

## Phase 4

E-Voting:

- elections;
- candidates;
- DPT;
- committees;
- secret ballot;
- participation;
- result;
- publish result;
- audit;
- berita acara.

---

## Phase 5

Enhancement:

- PWA;
- public portal;
- notifications;
- advanced analytics;
- additional integrations.

---

# Development Rules

Sebelum coding:

1. baca `README.md`;
2. baca `PRD.md`;
3. baca `SYSTEM.md`;
4. baca `AGENTS.md`;
5. inspect existing code;
6. inspect database migration;
7. inspect repository UI reference jika perubahan menyangkut UI.

Jangan menebak architecture jika dokumentasi sudah tersedia.

---

# Never Do This

Jangan:

- disable RLS untuk memperbaiki bug;
- expose service role;
- hardcode authorization hanya di frontend;
- membuat mock authentication;
- menggunakan placeholder sebagai production data;
- membuat satu database per organisasi;
- menjadikan jabatan sebagai role;
- menjadikan panitia sebagai global role;
- melakukan hard delete terhadap histori penting tanpa alasan;
- mengubah architecture tanpa memahami dampaknya;
- meng-copy business logic Apeiron;
- melakukan giant rewrite tanpa kebutuhan;
- membuat seluruh aplikasi sebagai Client Component;
- membuat microservices tanpa alasan.

---

# Code Quality

Gunakan:

- strict TypeScript;
- modular architecture;
- descriptive naming;
- reusable components;
- feature-based separation bila sesuai;
- server/client boundaries yang jelas;
- error handling;
- validation;
- database typing.

Hindari penggunaan `any` tanpa alasan.

Jangan meninggalkan dead code.

---

# Documentation

Keputusan architecture penting harus didokumentasikan.

Gunakan folder:

```text
docs/
```

Contoh:

```text
docs/
├── ARCHITECTURE.md
├── DATABASE.md
├── AUTHORIZATION.md
├── RLS.md
├── EVOTING.md
└── UI.md
```

---

# AI Agent Instructions

Jika Anda adalah AI coding agent yang bekerja pada repository ini:

**Jangan langsung coding setelah membuka repository.**

Lakukan:

```text
READ README.md
↓
READ PRD.md
↓
READ SYSTEM.md
↓
READ AGENTS.md
↓
INSPECT EXISTING PROJECT
↓
UNDERSTAND CURRENT ARCHITECTURE
↓
IMPLEMENT
↓
TEST
↓
VERIFY AGAINST PRD
```

Jika `SYSTEM.md` atau `AGENTS.md` belum tersedia, jangan mengarang isinya.

Gunakan README dan PRD sebagai dasar dan buat dokumen tersebut ketika architecture sudah disepakati.

---

# Primary Goal

Tujuan project ini bukan sekadar menghasilkan dashboard yang terlihat bagus.

MIPNU harus memiliki fondasi yang:

```text
Correct
Secure
Maintainable
Scalable
Consistent
Production-Oriented
```

Prioritas engineering:

```text
1. Correctness
2. Security
3. Data Integrity
4. Maintainability
5. User Experience
6. Performance
7. Visual Polish
```

Visual yang bagus tidak boleh mengorbankan security atau correctness.

---

# Current Status

Project berada dalam tahap awal pembangunan.

Dokumen utama:

`README.md`
→ pengenalan dan aturan dasar repository.

`PRD.md`
→ product requirements dan business requirements.

Dokumen architecture lainnya akan dibuat selama tahap foundation.

---

# Next Step

Setelah memahami repository:

1. analisis PRD;
2. inspect Apeiron Portal sebagai referensi UI;
3. tentukan architecture;
4. rancang database;
5. rancang authorization;
6. rancang RLS;
7. rancang routes;
8. rancang folder structure;
9. implementasikan MVP Phase 1;
10. test dan verifikasi hasil.

Seluruh implementasi harus tetap konsisten dengan PRD MIPNU.
