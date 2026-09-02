"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { useJagaIsian } from "@/components/forms/use-jaga-isian";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createEvent,
  updateEvent,
} from "@/features/events/actions/manage-event";
import {
  EVENT_STATUSES,
  EVENT_VISIBILITIES,
} from "@/features/events/schemas/event.schema";
import type { ActionResult } from "@/lib/errors";
import { toDateTimeLocal } from "@/lib/format";
import { eventStatus } from "@/lib/status";

export type EventFormValues = {
  id: string;
  name: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  capacity: number | null;
  registrationStartAt: string | null;
  registrationEndAt: string | null;
  status: string;
  visibility: string;
};

const VISIBILITY_LABELS: Record<string, string> = {
  ORGANIZATION: "Seluruh anggota",
  PENGURUS: "Pengurus saja",
};

export function EventFormDialog({
  organizationId,
  event,
  triggerVariant = "primary",
}: {
  organizationId: string;
  event?: EventFormValues;
  triggerVariant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(event);

  return (
    <>
      <Button variant={triggerVariant} onClick={() => setOpen(true)}>
        {isEdit ? (
          <>
            <Pencil size={16} aria-hidden="true" />
            Ubah
          </>
        ) : (
          <>
            <Plus size={16} aria-hidden="true" />
            Tambah Event
          </>
        )}
      </Button>

      <EventDialog
        key={open ? "open" : "closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        event={event}
      />
    </>
  );
}

function EventDialog({
  open,
  onClose,
  organizationId,
  event,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  event?: EventFormValues;
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(event);

  const action = isEdit
    ? updateEvent.bind(null, organizationId, event!.id)
    : createEvent.bind(null, organizationId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | ActionResult<void> | null,
    FormData
  >(action as never, null);

  const jagaIsian = useJagaIsian(state);

  useEffect(() => {
    if (state?.success) {
      showToast(isEdit ? "Event diperbarui." : "Event dibuat.");
      onClose();
    }
  }, [state, isEdit, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Ubah Event" : "Tambah Event"}
      description={
        isEdit
          ? undefined
          : "Event baru ditautkan otomatis ke periode kepengurusan yang sedang aktif."
      }
    >
      <form {...jagaIsian(formAction)} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        <Field
          label="Nama Event"
          htmlFor="event-name"
          required
          error={fieldErrors?.name?.[0]}
        >
          <Input
            id="event-name"
            name="name"
            required
            maxLength={150}
            defaultValue={event?.name ?? ""}
            aria-invalid={Boolean(fieldErrors?.name)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Waktu Mulai"
            htmlFor="event-start"
            required
            error={fieldErrors?.startAt?.[0]}
          >
            <Input
              id="event-start"
              name="startAt"
              type="datetime-local"
              required
              defaultValue={toDateTimeLocal(event?.startAt)}
            />
          </Field>

          <Field
            label="Waktu Selesai"
            htmlFor="event-end"
            error={fieldErrors?.endAt?.[0]}
          >
            <Input
              id="event-end"
              name="endAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event?.endAt)}
              aria-invalid={Boolean(fieldErrors?.endAt)}
            />
          </Field>

          <Field
            label="Status"
            htmlFor="event-status"
            required
            error={fieldErrors?.status?.[0]}
          >
            <Select
              id="event-status"
              name="status"
              required
              defaultValue={event?.status ?? "DRAFT"}
            >
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {eventStatus(status).label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Visibilitas"
            htmlFor="event-visibility"
            required
            error={fieldErrors?.visibility?.[0]}
          >
            <Select
              id="event-visibility"
              name="visibility"
              required
              defaultValue={event?.visibility ?? "ORGANIZATION"}
            >
              {EVENT_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {VISIBILITY_LABELS[visibility]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Lokasi"
            htmlFor="event-location"
            error={fieldErrors?.location?.[0]}
          >
            <Input
              id="event-location"
              name="location"
              maxLength={200}
              defaultValue={event?.location ?? ""}
            />
          </Field>

          <Field
            label="Kapasitas"
            htmlFor="event-capacity"
            hint="Kosongkan bila tanpa batas."
            error={fieldErrors?.capacity?.[0]}
          >
            <Input
              id="event-capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={event?.capacity ?? ""}
              aria-invalid={Boolean(fieldErrors?.capacity)}
            />
          </Field>

          <Field
            label="Pendaftaran Dibuka"
            htmlFor="event-reg-start"
            error={fieldErrors?.registrationStartAt?.[0]}
          >
            <Input
              id="event-reg-start"
              name="registrationStartAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event?.registrationStartAt)}
            />
          </Field>

          <Field
            label="Pendaftaran Ditutup"
            htmlFor="event-reg-end"
            error={fieldErrors?.registrationEndAt?.[0]}
          >
            <Input
              id="event-reg-end"
              name="registrationEndAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(event?.registrationEndAt)}
              aria-invalid={Boolean(fieldErrors?.registrationEndAt)}
            />
          </Field>
        </div>

        <Field
          label="Deskripsi"
          htmlFor="event-description"
          error={fieldErrors?.description?.[0]}
        >
          <Textarea
            id="event-description"
            name="description"
            rows={3}
            maxLength={2000}
            defaultValue={event?.description ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>{isEdit ? "Simpan" : "Buat Event"}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
