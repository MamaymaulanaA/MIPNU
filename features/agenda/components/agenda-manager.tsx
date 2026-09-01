"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CalendarDays, MapPin, Pencil, Plus, Trash2 } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { EmptyState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { TableToolbar } from "@/components/data-table/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createAgendaItem,
  deleteAgendaItem,
  updateAgendaItem,
} from "@/features/agenda/actions/manage-agenda";
import {
  AGENDA_TYPES,
  AGENDA_VISIBILITIES,
} from "@/features/agenda/schemas/agenda.schema";
import type { ActionResult } from "@/lib/errors";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { agendaType } from "@/lib/status";

export type AgendaRow = {
  id: string;
  title: string;
  description: string | null;
  agendaType: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  visibility: string;
};

export type AgendaPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const VISIBILITY_LABELS: Record<string, string> = {
  ORGANIZATION: "Seluruh anggota",
  PENGURUS: "Pengurus saja",
  PUBLIC: "Publik",
};

/** Keadaan toolbar — seluruhnya dari URL, disaring di server. */
export type KeadaanDaftar = {
  cari: string;
  jenis: string;
  jenisOptions: { value: string; label: string }[];
};

export function AgendaManager({
  organizationId,
  upcoming,
  past,
  permissions,
  daftar,
  aksiTambahan,
}: {
  organizationId: string;
  upcoming: AgendaRow[];
  past: AgendaRow[];
  permissions: AgendaPermissions;
  daftar: KeadaanDaftar;
  /** Pengalih tampilan daftar/kalender, dirender Server Component. */
  aksiTambahan?: React.ReactNode;
}) {
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaRow | null>(null);
  const [deleting, setDeleting] = useState<AgendaRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function runDelete() {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      const result = await deleteAgendaItem(organizationId, target.id);
      setDeleting(null);
      showToast(
        result.success ? "Agenda dihapus." : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        description="Kalender kegiatan organisasi."
        actions={
          <>
            {aksiTambahan}
            {permissions.canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                Tambah Agenda
              </Button>
            ) : null}
          </>
        }
      />

      {/*
        Toolbar berdiri di kartunya sendiri, di ATAS kedua daftar.

        Agenda sengaja dibaca sebagai dua daftar — mendatang untuk
        direncanakan, lampau untuk ditelusuri — dan itu tidak diubah di sini.
        Konsekuensinya satu: pencarian dan penyaringnya berlaku untuk KEDUANYA,
        jadi ia tidak dapat duduk di dalam salah satu kartu tanpa terbaca
        seolah hanya menyaring kartu itu.
      */}
      <Card>
        <TableToolbar
          searchValue={daftar.cari}
          searchPlaceholder="Cari agenda…"
          searchLabel="Cari agenda"
          filters={[
            {
              key: "jenis",
              size: "sm",
              label: "Saring menurut jenis",
              value: daftar.jenis,
              allLabel: "Semua jenis",
              options: daftar.jenisOptions,
            },
          ]}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mendatang</CardTitle>
        </CardHeader>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Belum ada agenda mendatang"
            description="Agenda yang dijadwalkan ke depan akan tampil di sini."
            action={
              permissions.canCreate ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Buat agenda
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="scroll-area max-h-[calc(100dvh-24rem)] min-h-[160px] divide-y divide-border">
            {upcoming.map((item) => (
              <AgendaRowItem
                key={item.id}
                item={item}
                permissions={permissions}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sudah Berlalu</CardTitle>
          </CardHeader>
          <ul className="scroll-area max-h-[calc(100dvh-24rem)] min-h-[160px] divide-y divide-border">
            {past.map((item) => (
              <AgendaRowItem
                key={item.id}
                item={item}
                permissions={permissions}
                onEdit={setEditing}
                onDelete={setDeleting}
                muted
              />
            ))}
          </ul>
        </Card>
      ) : null}

      <AgendaDialog
        key={createOpen ? "create-open" : "create-closed"}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        organizationId={organizationId}
      />

      <AgendaDialog
        key={editing?.id ?? "edit-closed"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        item={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={runDelete}
        pending={isPending}
        destructive
        confirmLabel="Hapus Agenda"
        title={`Hapus agenda "${deleting?.title ?? ""}"?`}
        description="Agenda tidak akan tampil lagi di kalender organisasi. Datanya tetap tersimpan sebagai riwayat, tidak dihapus permanen."
      />
    </div>
  );
}

function AgendaRowItem({
  item,
  permissions,
  onEdit,
  onDelete,
  muted,
}: {
  item: AgendaRow;
  permissions: AgendaPermissions;
  onEdit: (item: AgendaRow) => void;
  onDelete: (item: AgendaRow) => void;
  muted?: boolean;
}) {
  const type = agendaType(item.agendaType);

  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
      <div className="min-w-0 space-y-1">
        <p
          className={
            muted
              ? "text-sm font-medium text-muted-foreground"
              : "text-sm font-medium text-foreground"
          }
        >
          {item.title}
        </p>

        {item.description ? (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">
            {item.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            {formatDateTime(item.startAt)}
          </span>
          {item.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} aria-hidden="true" />
              {item.location}
            </span>
          ) : null}
          {item.visibility === "PENGURUS" ? (
            <span>{VISIBILITY_LABELS[item.visibility]}</span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <Badge tone={type.tone}>{type.label}</Badge>

        {permissions.canEdit ? (
          <Button variant="ghost" size="iconSm" onClick={() => onEdit(item)}>
            <Pencil size={14} aria-hidden="true" />
            <span className="sr-only">Ubah {item.title}</span>
          </Button>
        ) : null}

        {permissions.canDelete ? (
          <Button variant="ghost" size="iconSm" onClick={() => onDelete(item)}>
            <Trash2 size={14} aria-hidden="true" />
            <span className="sr-only">Hapus {item.title}</span>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function AgendaDialog({
  open,
  onClose,
  organizationId,
  item,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  item?: AgendaRow | null;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(item);

  const action = isEdit
    ? updateAgendaItem.bind(null, organizationId, item!.id)
    : createAgendaItem.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Agenda diperbarui." : "Agenda dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Agenda" : "Tambah Agenda"}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Judul"
          htmlFor="agenda-title"
          required
          error={fieldErrors?.title?.[0]}
        >
          <Input
            id="agenda-title"
            name="title"
            required
            maxLength={150}
            defaultValue={item?.title ?? ""}
            aria-invalid={Boolean(fieldErrors?.title)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Jenis"
            htmlFor="agenda-type"
            required
            error={fieldErrors?.agendaType?.[0]}
          >
            <Select
              id="agenda-type"
              name="agendaType"
              required
              defaultValue={item?.agendaType ?? "OTHER"}
            >
              {AGENDA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {agendaType(type).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Visibilitas"
            htmlFor="agenda-visibility"
            required
            error={fieldErrors?.visibility?.[0]}
          >
            <Select
              id="agenda-visibility"
              name="visibility"
              required
              defaultValue={item?.visibility ?? "ORGANIZATION"}
            >
              {AGENDA_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Waktu Mulai"
            htmlFor="agenda-start"
            required
            error={fieldErrors?.startAt?.[0]}
          >
            <Input
              id="agenda-start"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(item?.startAt)}
            />
          </Field>

          <Field
            label="Waktu Selesai"
            htmlFor="agenda-end"
            hint="Opsional."
            error={fieldErrors?.endAt?.[0]}
          >
            <Input
              id="agenda-end"
              name="endAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(item?.endAt)}
              aria-invalid={Boolean(fieldErrors?.endAt)}
            />
          </Field>
        </div>

        <Field
          label="Lokasi"
          htmlFor="agenda-location"
          error={fieldErrors?.location?.[0]}
        >
          <Input
            id="agenda-location"
            name="location"
            maxLength={200}
            defaultValue={item?.location ?? ""}
          />
        </Field>

        <Field
          label="Deskripsi"
          htmlFor="agenda-description"
          error={fieldErrors?.description?.[0]}
        >
          <Textarea
            id="agenda-description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={item?.description ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Agenda"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
