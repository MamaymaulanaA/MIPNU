import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { organizationStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Organisasi",
};

/**
 * Daftar seluruh organisasi platform.
 *
 * Berbeda dari organization switcher, yang hanya memuat organisasi tempat
 * pengguna benar-benar punya membership. Halaman ini administrasi platform:
 * super admin dapat melihat semua organisasi tanpa menjadi pengurus di
 * dalamnya (docs/PERMISSIONS.md §46-§47).
 */
export default async function AdminOrganizationsPage() {
  // Konteks platform: permission global, tanpa organisasi aktif.
  const context = await requireAccessContext(null);

  if (!can(context, PERMISSIONS.organization.create)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("organizations")
    .select(
      `
      id, name, short_name, slug, status,
      organization_types!inner ( code ),
      organization_levels!inner ( code, hierarchy_rank )
    `,
    )
    .is("deleted_at", null)
    .order("name", { ascending: true });

  type Row = {
    id: string;
    name: string;
    short_name: string | null;
    slug: string;
    status: string;
    organization_types: { code: string };
    organization_levels: { code: string; hierarchy_rank: number };
  };

  const organizations = (data as unknown as Row[] | null) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organisasi"
        description="Seluruh unit organisasi pada platform MIPNU."
        actions={
          <Button asChild>
            <Link href="/admin/organisasi/baru">
              <Plus size={16} aria-hidden="true" />
              Buat Organisasi
            </Link>
          </Button>
        }
      />

      <Card>
        {organizations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Belum ada organisasi"
            description="Buat organisasi pertama, lalu tautkan operator agar organisasi tersebut dapat mulai dikelola."
            action={
              <Button size="sm" asChild>
                <Link href="/admin/organisasi/baru">
                  Buat organisasi pertama
                </Link>
              </Button>
            }
          />
        ) : (
          <TableScroll>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Nama</TableHeaderCell>
                  <TableHeaderCell>Jenis</TableHeaderCell>
                  <TableHeaderCell>Tingkat</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="hidden lg:table-cell">
                    Slug
                  </TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {organizations.map((organization) => {
                  const status = organizationStatus(organization.status);

                  return (
                    <TableRow key={organization.id}>
                      <TableCell className="font-medium text-foreground">
                        {organization.name}
                      </TableCell>

                      <TableCell>
                        {/* IPNU dan IPPNU dibedakan oleh KODENYA yang tertulis
                            di sini, bukan oleh warna. Menyandikannya sebagai
                            hijau/ungu menuntut pembaca menghafal arti warna,
                            dan tidak menyampaikan apa pun kepada pembaca yang
                            tidak dapat membedakannya (docs/UI.md §8). */}
                        <span className="inline-flex items-center rounded-sm border border-primary-border bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-hover">
                          {organization.organization_types.code}
                        </span>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {organization.organization_levels.code}
                      </TableCell>

                      <TableCell>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {organization.slug}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </div>
  );
}
