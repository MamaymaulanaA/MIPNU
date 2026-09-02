import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Data tambahan untuk dashboard administrator platform.
 *
 * Seluruhnya bersandar pada tiga tabel yang MEMANG terbaca oleh pemegang
 * wewenang platform: `organizations`, `profiles`, dan `audit_logs`. RLS yang
 * memutuskan, bukan berkas ini — dan itu terlihat pada hasilnya: `members`,
 * `announcements`, dan `meetings` mengembalikan nol baris bagi peran ini,
 * sehingga tidak satu pun angka di sini berasal dari sana.
 *
 * Konsekuensinya disengaja: dashboard platform TIDAK menampilkan "Total
 * Program" atau "Total Rapat" seperti dashboard organisasi, karena angka itu
 * tidak boleh dan tidak dapat dibacanya. Menampilkannya sebagai nol akan
 * menyatakan sesuatu yang tidak benar tentang platform.
 */

const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function kerangka(months: number) {
  const sekarang = new Date();
  const titik: { month: string; label: string }[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    titik.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${BULAN[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`,
    });
  }

  return titik;
}

export type GrowthPoint = {
  label: string;
  organizations: number;
  accounts: number;
};

export type PlatformGrowth = {
  points: GrowthPoint[];
  range: string;
  newOrganizations: number[];
  newAccounts: number[];
  organizationDelta: number | null;
  accountDelta: number | null;
};

export async function getPlatformGrowth(
  months = 6,
): Promise<PlatformGrowth | null> {
  const supabase = await createClient();
  const titik = kerangka(months);
  const indeks = new Map(titik.map((t, i) => [t.month, i]));

  const [orgs, accounts] = await Promise.all([
    supabase.from("organizations").select("created_at").limit(5000),
    supabase.from("profiles").select("created_at").limit(5000),
  ]);

  if (orgs.error || accounts.error) {
    console.error(
      "[mipnu] gagal memuat pertumbuhan platform",
      orgs.error?.message ?? accounts.error?.message,
    );
    return null;
  }

  const baruOrg = new Array(months).fill(0) as number[];
  const baruAkun = new Array(months).fill(0) as number[];

  let awalOrg = 0;
  let awalAkun = 0;
  const batas = titik[0]!.month;

  for (const row of orgs.data ?? []) {
    const bulan = String(row.created_at).slice(0, 7);
    if (bulan < batas) awalOrg += 1;
    else {
      const i = indeks.get(bulan);
      if (i !== undefined) baruOrg[i]! += 1;
    }
  }

  for (const row of accounts.data ?? []) {
    const bulan = String(row.created_at).slice(0, 7);
    if (bulan < batas) awalAkun += 1;
    else {
      const i = indeks.get(bulan);
      if (i !== undefined) baruAkun[i]! += 1;
    }
  }

  let kumulatifOrg = awalOrg;
  let kumulatifAkun = awalAkun;

  const points: GrowthPoint[] = titik.map((t, i) => {
    kumulatifOrg += baruOrg[i]!;
    kumulatifAkun += baruAkun[i]!;
    return {
      label: t.label,
      organizations: kumulatifOrg,
      accounts: kumulatifAkun,
    };
  });

  const delta = (deret: number[]) =>
    deret.length >= 2
      ? deret[deret.length - 1]! - deret[deret.length - 2]!
      : null;

  return {
    points,
    range: `${titik[0]!.label} – ${titik[titik.length - 1]!.label}`,
    newOrganizations: baruOrg,
    newAccounts: baruAkun,
    organizationDelta: delta(baruOrg),
    accountDelta: delta(baruAkun),
  };
}

export type ActivitySlice = {
  label: string;
  total: number;
  share: number;
};

export type SystemActivity = {
  slices: ActivitySlice[];
  total: number;
  days: number;
};

const DOMAIN: Record<string, string> = {
  election: "Pemilihan",
  financial_account: "Keuangan",
  financial_category: "Keuangan",
  financial_transaction: "Keuangan",
  budget: "Keuangan",
  budget_item: "Keuangan",
  member: "Keanggotaan",
  organization_membership: "Keanggotaan",
  cadreship_record: "Keanggotaan",
  agenda_item: "Kegiatan",
  event: "Kegiatan",
  meeting: "Kegiatan",
  attendance_session: "Kegiatan",
  work_program: "Kegiatan",
  document: "Administrasi",
  announcement: "Administrasi",
  incoming_letter: "Administrasi",
  outgoing_letter: "Administrasi",
  organization: "Organisasi & Akses",
  organization_period: "Organisasi & Akses",
  position: "Organisasi & Akses",
  management_assignment: "Organisasi & Akses",
  global_role_assignment: "Organisasi & Akses",
  profile: "Organisasi & Akses",
};

export async function getSystemActivity(
  days = 30,
): Promise<SystemActivity | null> {
  const supabase = await createClient();

  const sejak = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("resource_type")
    .gte("created_at", sejak)
    .limit(5000);

  if (error) {
    console.error("[mipnu] gagal memuat aktivitas sistem", error.message);
    return null;
  }

  const hitung = new Map<string, number>();

  for (const row of data ?? []) {
    const domain = DOMAIN[row.resource_type] ?? "Lainnya";
    hitung.set(domain, (hitung.get(domain) ?? 0) + 1);
  }

  const total = data?.length ?? 0;
  if (total === 0) return null;

  const slices = [...hitung.entries()]
    .map(([label, jumlah]) => ({
      label,
      total: jumlah,
      share: Math.round((jumlah / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  return { slices, total, days };
}

export type QuickInfo = {
  label: string;
  value: number;
  context: string;
};

export async function getPlatformQuickInfo(days = 30): Promise<QuickInfo[]> {
  const supabase = await createClient();
  const sejak = new Date(Date.now() - days * 86_400_000).toISOString();

  const [orgBaru, akunBaru, peristiwa, akunNonaktif] = await Promise.all([
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sejak),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sejak),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sejak),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .neq("status", "ACTIVE"),
  ]);

  return [
    {
      label: "Organisasi Baru",
      value: orgBaru.count ?? 0,
      context: `${days} hari terakhir`,
    },
    {
      label: "Akun Baru",
      value: akunBaru.count ?? 0,
      context: `${days} hari terakhir`,
    },
    {
      label: "Peristiwa Audit",
      value: peristiwa.count ?? 0,
      context: `${days} hari terakhir`,
    },
    {
      label: "Akun Nonaktif",
      value: akunNonaktif.count ?? 0,
      context: "Perlu ditinjau",
    },
  ];
}

export type AccountPreview = {
  id: string;
  displayName: string;
  status: string;
};

/**
 * Pratinjau akun platform.
 *
 * BUKAN pratinjau anggota. Tabel `members` mengembalikan nol baris bagi peran
 * ini — RLS-nya mengikat pada keanggotaan organisasi, dan administrator
 * platform tidak menjadi anggota di mana pun. Yang memang miliknya adalah
 * akun: `profiles` terbaca seluruhnya, dan itulah yang ditampilkan.
 *
 * Yang diambil hanya tiga kolom. Surel, telepon, dan tautan avatar tidak ikut:
 * deretan wajah pada dashboard tidak membutuhkannya, dan `profiles` tidak
 * menyimpan jenis kelamin — sehingga avatarnya netral, bukan hasil tebakan
 * dari nama.
 */
export async function getAccountPreview(limit = 12): Promise<AccountPreview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, status")
    .order("display_name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[mipnu] gagal memuat pratinjau akun", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    status: row.status,
  }));
}
