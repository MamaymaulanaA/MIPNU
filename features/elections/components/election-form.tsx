"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createElection,
  updateElection,
} from "@/features/elections/actions/manage-elections";
import {
  ELECTION_TYPES,
  ELECTION_TYPE_LABEL,
  RESULT_VISIBILITIES,
  RESULT_VISIBILITY_LABEL,
} from "@/features/elections/schemas/election.schema";
import type { ActionResult } from "@/lib/errors";

export type ElectionOption = { id: string; label: string };

export type ElectionFormValues = {
  id: string;
  name: string;
  description: string | null;
  electionType: string;
  periodId: string | null;
  startAt: string;
  endAt: string;
  resultVisibility: string;
};

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ElectionFields({
  periodOptions,
  election,
}: {
  periodOptions: ElectionOption[];
  election?: ElectionFormValues | null;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nama pemilihan" htmlFor="election-name" required>
        <Input
          id="election-name"
          name="name"
          required
          maxLength={200}
          defaultValue={election?.name ?? ""}
          placeholder="Pemilihan Ketua PAC Masa Khidmat 2026-2028"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis" htmlFor="election-type" required>
          <Select
            id="election-type"
            name="electionType"
            defaultValue={election?.electionType ?? "KETUA"}
          >
            {ELECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ELECTION_TYPE_LABEL[type]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Periode" htmlFor="election-period">
          <Select
            id="election-period"
            name="organizationPeriodId"
            defaultValue={election?.periodId ?? ""}
          >
            <option value="">Tanpa periode</option>
            {periodOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mulai" htmlFor="election-start" required>
          <Input
            id="election-start"
            name="startAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(election?.startAt)}
          />
        </Field>

        <Field label="Selesai" htmlFor="election-end" required>
          <Input
            id="election-end"
            name="endAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(election?.endAt)}
          />
        </Field>
      </div>

      <Field
        label="Visibilitas hasil"
        htmlFor="election-visibility"
        hint="Menentukan siapa yang dapat melihat hasil SETELAH dipublikasikan."
      >
        <Select
          id="election-visibility"
          name="resultVisibility"
          defaultValue={election?.resultVisibility ?? "ORGANIZATION"}
        >
          {RESULT_VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {RESULT_VISIBILITY_LABEL[value]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Keterangan" htmlFor="election-description">
        <Textarea
          id="election-description"
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={election?.description ?? ""}
        />
      </Field>
    </div>
  );
}

export function ElectionCreateDialog({
  organizationId,
  periodOptions,
}: {
  organizationId: string;
  periodOptions: ElectionOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" />
        Pemilihan Baru
      </Button>

      <ElectionDialog
        key={open ? "election-new" : "election-new-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        periodOptions={periodOptions}
      />
    </>
  );
}

export function ElectionEditDialog({
  organizationId,
  periodOptions,
  election,
}: {
  organizationId: string;
  periodOptions: ElectionOption[];
  election: ElectionFormValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil size={16} aria-hidden="true" />
        Ubah
      </Button>

      <ElectionDialog
        key={open ? `election-edit-${election.id}` : "election-edit-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        periodOptions={periodOptions}
        election={election}
      />
    </>
  );
}

function ElectionDialog({
  open,
  onClose,
  organizationId,
  periodOptions,
  election,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  periodOptions: ElectionOption[];
  election?: ElectionFormValues;
}) {
  const { showToast } = useToast();
  const isEdit = election !== undefined;

  const action = isEdit
    ? updateElection.bind(null, organizationId, election.id)
    : createElection.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.success) {
      showToast(
        isEdit
          ? "Pemilihan diperbarui."
          : "Pemilihan dibuat sebagai rancangan.",
        "success",
      );
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Pemilihan" : "Pemilihan Baru"}
      description={
        isEdit
          ? "Penyuntingan hanya mungkin selama suara belum dibuka."
          : "Pemilihan selalu lahir sebagai rancangan. Kandidat dan DPT disusun dulu sebelum suara dibuka."
      }
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state?.success === false ? state.error : ""} />
        <ElectionFields periodOptions={periodOptions} election={election} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>
            {isEdit ? "Simpan Perubahan" : "Simpan Rancangan"}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
