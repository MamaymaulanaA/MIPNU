import type { Metadata } from "next";
import { FileClock } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import {
  AUDIT_PAGE_SIZE,
  AUDIT_RESOURCE_LABELS,
  AUDIT_RESOURCE_OPTIONS,
} from "@/features/audit/audit-catalog";
import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Audit Log",
};

/** Aksi diterjemahkan ke bahasa manusia; kode mentah hanya untuk fallback. */
const ACTION_LABELS: Record<string, string> = {
  "member.created": "Menambah anggota",
  "member.updated": "Mengubah anggota",
  "member.status_changed": "Mengubah status anggota",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function satuNilai(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const context = await requireAccessContext();

  if (!context.organizationId || !can(context, PERMISSIONS.audit.view)) {
    return <ForbiddenState />;
  }

  const params = await searchParams;
  const cari = satuNilai(params.search).trim();
  const jenis = satuNilai(params.jenis);
  const halaman = Math.max(1, Number(satuNilai(params.page)) || 1);

  const supabase = await createClient();

  // Audit bersifat append-only dan tidak punya UI ubah/hapus. Halaman ini
  // memang hanya membaca (docs/DATABASE.md §44, RLS.md §115).
  //
  // Pencarian, penyaringan, DAN pembagian halaman seluruhnya di database.
  // Sebelumnya halaman ini menarik 100 baris terakhir tanpa cara menelusuri
  // yang lebih lama; batang gulir tidak menggantikan itu, ia hanya membatasi
  // tingginya (AGENTS.md §57, §64).
  const dari = (halaman - 1) * AUDIT_PAGE_SIZE;

  let query = supabase
    .from("audit_logs")
    .select(
      `
      id, action, resource_type, resource_id, created_at,
      profiles ( display_name )
    `,
      { count: "exact" },
    )
    .eq("organization_id", context.organizationId);

  if (jenis) query = query.eq("resource_type", jenis);
  if (cari) query = query.ilike("action", `%${cari.replace(/[%_]/g, "\$&")}%`);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(dari, dari + AUDIT_PAGE_SIZE - 1);

  type Row = {
    id: string;
    action: string;
    resource_type: string;
    created_at: string;
    profiles: { display_name: string } | null;
  };

  const logs = (data as unknown as Row[] | null) ?? [];
  const total = count ?? 0;
  const jumlahHalaman = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const disaring = cari !== "" || jenis !== "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        description="Catatan aktivitas sensitif. Bersifat append-only dan tidak dapat diubah."
      />

      <Card>
        <TableToolbar
          searchValue={cari}
          searchPlaceholder="Cari aktivitas…"
          searchLabel="Cari aktivitas"
          filters={[
            {
              key: "jenis",
              label: "Saring menurut objek",
              value: jenis,
              allLabel: "Semua objek",
              options: AUDIT_RESOURCE_OPTIONS,
            },
          ]}
        />

        {logs.length === 0 ? (
          <EmptyState
            icon={FileClock}
            title={
              disaring
                ? "Tidak ada aktivitas yang cocok"
                : "Belum ada aktivitas tercatat"
            }
            description={
              disaring
                ? "Coba ubah kata kunci atau saringan objek."
                : "Perubahan data sensitif akan tercatat di sini secara otomatis."
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Aktivitas</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">
                    Pelaku
                  </TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Objek
                  </TableHeaderCell>
                  <TableHeaderCell>Waktu</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="block text-[13px] text-muted-foreground sm:hidden">
                        {/* Pelaku bisa NULL bila akunnya sudah dihapus —
                            jejaknya tetap disimpan. */}
                        {log.profiles?.display_name ?? "Sistem"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {log.profiles?.display_name ?? "Sistem"}
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {AUDIT_RESOURCE_LABELS[log.resource_type] ??
                        log.resource_type}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}

        <Pagination
          page={halaman}
          pageCount={jumlahHalaman}
          total={total}
          pageSize={AUDIT_PAGE_SIZE}
        />
      </Card>
    </div>
  );
}
