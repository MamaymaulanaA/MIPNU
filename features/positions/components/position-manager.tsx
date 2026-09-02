"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { KeyRound, Network, Pencil, Plus, Trash2 } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { TableToolbar } from "@/components/data-table/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import {
  createPosition,
  deletePosition,
  setPositionPermissions,
  updatePosition,
} from "@/features/positions/actions/manage-position";
import type { ActionResult } from "@/lib/errors";
import { orDash } from "@/lib/format";

export type PositionRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  sortOrder: number;
  parentPositionId: string | null;
  parentName: string | null;
  permissionIds: string[];
};

export type PermissionOption = {
  id: string;
  code: string;
  resource: string;
  description: string | null;
};

export type PositionPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
};

export type KeadaanDaftar = {
  cari: string;
  halaman: number;
  total: number;
  ukuranHalaman: number;
};

export function PositionManager({
  organizationId,
  positions,
  permissionCatalog,
  permissions,
  daftar,
}: {
  organizationId: string;
  positions: PositionRow[];
  permissionCatalog: PermissionOption[];
  permissions: PositionPermissions;
  daftar: KeadaanDaftar;
}) {
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PositionRow | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<PositionRow | null>(
    null,
  );
  const [deleting, setDeleting] = useState<PositionRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runDelete() {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      const result = await deletePosition(organizationId, target.id);
      setDeleting(null);
      showToast(
        result.success ? `Jabatan ${target.name} dihapus.` : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Jabatan"
        description="Jabatan organisasi beserta permission yang melekat padanya. Jabatan bukan role sistem."
        actions={
          permissions.canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" />
              Tambah Jabatan
            </Button>
          ) : undefined
        }
      />

      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari jabatan…"
          searchLabel="Cari jabatan"
        />

        {positions.length === 0 ? (
          <EmptyState
            icon={Network}
            title={
              daftar.cari ? "Tidak ada jabatan yang cocok" : "Belum ada jabatan"
            }
            description={
              daftar.cari
                ? "Coba ubah kata kuncinya."
                : "Jabatan menentukan hak operasional pengurus. Ketua, Sekretaris, dan Bendahara dibuat di sini — bukan sebagai role sistem."
            }
            action={
              !daftar.cari && permissions.canCreate ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Buat jabatan pertama
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableScroll bounded>
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>Jabatan</TableHeaderCell>
                  <TableHeaderCell className="hidden md:table-cell">
                    Induk
                  </TableHeaderCell>
                  <TableHeaderCell>Permission</TableHeaderCell>
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {positions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {position.name}
                      </span>
                      {position.code ? (
                        <span className="ml-2 text-[13px] text-muted-foreground">
                          {position.code}
                        </span>
                      ) : null}
                      <span className="block text-[13px] text-muted-foreground md:hidden">
                        {orDash(position.parentName)}
                      </span>
                    </TableCell>

                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {orDash(position.parentName)}
                    </TableCell>

                    <TableCell>
                      {position.permissionIds.length === 0 ? (
                        <span className="text-[13px] text-muted-foreground">
                          Belum diatur
                        </span>
                      ) : (
                        <Badge tone="primary">
                          {position.permissionIds.length} permission
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {permissions.canManagePermissions ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPermissionTarget(position)}
                          >
                            <KeyRound size={14} aria-hidden="true" />
                            Permission
                          </Button>
                        ) : null}

                        {permissions.canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(position)}
                          >
                            <Pencil size={14} aria-hidden="true" />
                            Ubah
                          </Button>
                        ) : null}

                        {permissions.canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(position)}
                            aria-label={`Hapus ${position.name}`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )}
        <Pagination
          page={daftar.halaman}
          pageCount={Math.max(
            1,
            Math.ceil(daftar.total / daftar.ukuranHalaman),
          )}
          total={daftar.total}
          pageSize={daftar.ukuranHalaman}
        />
      </Card>

      <PositionDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
        positions={positions}
      />

      <PositionDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        positions={positions}
        position={editing}
      />

      <PermissionDialog
        key={permissionTarget?.id ?? "perm-closed"}
        open={Boolean(permissionTarget)}
        onClose={() => setPermissionTarget(null)}
        organizationId={organizationId}
        position={permissionTarget}
        catalog={permissionCatalog}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={runDelete}
        pending={isPending}
        destructive
        confirmLabel="Hapus Jabatan"
        title={`Hapus jabatan ${deleting?.name ?? ""}?`}
        description="Jabatan yang sudah pernah dipakai pada kepengurusan tidak dapat dihapus, karena riwayat penugasan menunjuk padanya."
      />
    </div>
  );
}

function PositionDialog({
  open,
  onClose,
  organizationId,
  positions,
  position,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  positions: PositionRow[];
  position?: PositionRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(position);

  const action = isEdit
    ? updatePosition.bind(null, organizationId, position!.id)
    : createPosition.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Jabatan diperbarui." : "Jabatan dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  // Sebuah jabatan tidak boleh memilih dirinya sendiri sebagai induk.
  const parentOptions = positions.filter((item) => item.id !== position?.id);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Jabatan" : "Tambah Jabatan"}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Jabatan"
          htmlFor="position-name"
          required
          hint="Contoh: Ketua, Sekretaris, Ketua Departemen Kaderisasi"
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="position-name"
            name="name"
            required
            maxLength={100}
            defaultValue={position?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Kode"
            htmlFor="position-code"
            error={fieldErrors?.code?.[0]}
          >
            <Input
              id="position-code"
              name="code"
              maxLength={30}
              defaultValue={position?.code ?? ""}
            />
          </Field>

          <Field
            label="Urutan Tampil"
            htmlFor="position-sort"
            required
            hint="Angka kecil tampil lebih dulu."
            error={fieldErrors?.sortOrder?.[0]}
          >
            <Input
              id="position-sort"
              name="sortOrder"
              type="number"
              min={0}
              max={9999}
              required
              defaultValue={position?.sortOrder ?? 0}
            />
          </Field>
        </div>

        <Field
          label="Jabatan Induk"
          htmlFor="position-parent"
          hint="Kosongkan untuk jabatan tertinggi."
          error={fieldErrors?.parentPositionId?.[0]}
        >
          <Select
            id="position-parent"
            name="parentPositionId"
            defaultValue={position?.parentPositionId ?? ""}
          >
            <option value="">Tanpa induk</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Deskripsi"
          htmlFor="position-description"
          error={fieldErrors?.description?.[0]}
        >
          <Textarea
            id="position-description"
            name="description"
            rows={2}
            maxLength={500}
            defaultValue={position?.description ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Jabatan"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * Pemilihan permission jabatan.
 *
 * Dikelompokkan per resource supaya daftar 70+ permission tetap terbaca.
 * Permission platform tidak muncul di katalog sama sekali — ia memang tidak
 * dapat didelegasikan lewat jabatan.
 */
function PermissionDialog({
  open,
  onClose,
  organizationId,
  position,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  position: PositionRow | null;
  catalog: PermissionOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(
    setPositionPermissions.bind(null, organizationId, position?.id ?? ""),
    null,
  );

  useEffect(() => {
    if (state?.success) {
      showToast("Permission jabatan diperbarui.");
      onClose();
    }
  }, [state, onClose, showToast]);

  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionOption[]>();
    for (const permission of catalog) {
      const list = groups.get(permission.resource) ?? [];
      list.push(permission);
      groups.set(permission.resource, list);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);

  const assigned = new Set(position?.permissionIds ?? []);
  const failed = state && !state.success ? state : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Permission — ${position?.name ?? ""}`}
      description="Hak yang melekat pada jabatan ini, berlaku selama penugasan masih aktif."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={failed?.error} />

        {grouped.map(([resource, items]) => (
          <fieldset key={resource} className="space-y-2">
            <legend className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              {resource}
            </legend>

            <div className="grid gap-1.5">
              {items.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-1.5 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={permission.id}
                    defaultChecked={assigned.has(permission.id)}
                    className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-foreground">
                      {permission.description ?? permission.code}
                    </span>
                    <span className="block font-mono text-[12px] text-muted-foreground">
                      {permission.code}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card pt-3">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Simpan Permission</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
