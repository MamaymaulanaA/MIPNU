"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  assignCommittee,
  removeCommittee,
} from "@/features/elections/actions/manage-elections";
import { ASSIGNABLE_COMMITTEE_PERMISSIONS } from "@/features/elections/schemas/election.schema";
import type { CommitteeRow } from "@/features/elections/queries/get-election";
import type { ActionResult } from "@/lib/errors";

export type CommitteeMemberOption = { id: string; label: string };

/** Nama manusiawi untuk kode hak panitia. */
const PERMISSION_LABEL: Record<string, string> = {
  "elections.view": "Melihat pemilihan",
  "elections.manage_candidates": "Mengelola kandidat",
  "elections.manage_voters": "Mengelola DPT",
  "elections.view_audit": "Melihat jejak audit",
  "elections.view_result": "Melihat hasil sementara",
  "elections.open": "Membuka pemungutan suara",
  "elections.close": "Menutup pemungutan suara",
};

/**
 * Panitia pemilihan.
 *
 * Penugasan, bukan role: haknya berlaku pada pemilihan INI saja dan berakhir
 * bersama penugasannya. Karena itu daftar hak yang dapat dilekatkan sengaja
 * tidak memuat publikasi hasil — itu keputusan organisasi, bukan panitia
 * teknis (PERMISSIONS.md §57).
 */
/**
 * Tombol "Tugaskan Panitia" beserta dialognya.
 *
 * Di kepala halaman, sebaris dengan tombol ekspor tab lain. Sebelumnya ia
 * melayang rata kanan di atas daftar panitia — dan karena tombol ekspor di tab
 * tetangganya memakai `size="sm"`, halaman yang sama menampilkan aksi primer
 * setinggi 44px di satu tab dan 36px di tab lain.
 */
export function CommitteeAssignDialog({
  organizationId,
  electionId,
  committee,
  memberOptions,
}: {
  organizationId: string;
  electionId: string;
  committee: CommitteeRow[];
  memberOptions: CommitteeMemberOption[];
}) {
  const [open, setOpen] = useState(false);

  const assigned = new Set(committee.map((row) => row.memberId));
  const available = memberOptions.filter((option) => !assigned.has(option.id));

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus size={16} aria-hidden="true" />
        Tugaskan Panitia
      </Button>

      <CommitteeDialog
        key={open ? "committee-new" : "committee-new-closed"}
        open={open}
        onClose={() => setOpen(false)}
        organizationId={organizationId}
        electionId={electionId}
        options={available}
      />
    </>
  );
}

export function CommitteePanel({
  organizationId,
  electionId,
  committee,
  memberOptions,
  permissionNames,
  canAssign,
}: {
  organizationId: string;
  electionId: string;
  committee: CommitteeRow[];
  memberOptions: CommitteeMemberOption[];
  /** Peta id permission → kode, untuk menampilkan hak yang sudah melekat. */
  permissionNames: Record<string, string>;
  canAssign: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<CommitteeRow | null>(null);

  return (
    /*
      Kartu pembungkus dengan kepala bagian — bentuk yang sama dengan kedua
      bagian pada halaman Akun Kas. Aksinya berada di kepala itu, bukan
      melayang rata kanan di atas daftar: data panitianya diambil di dalam
      seksi async ini, jadi menaikkannya ke kepala HALAMAN akan menuntut
      pengambilan kedua hanya demi sebuah tombol.
    */
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-[15px] font-semibold text-foreground">Panitia</h2>
        {canAssign ? (
          <CommitteeAssignDialog
            organizationId={organizationId}
            electionId={electionId}
            committee={committee}
            memberOptions={memberOptions}
          />
        ) : null}
      </div>

      {committee.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Belum ada panitia"
          description={
            canAssign
              ? "Tugaskan panitia beserta hak yang dibutuhkannya untuk pemilihan ini saja."
              : "Belum ada panitia yang ditugaskan pada pemilihan ini."
          }
        />
      ) : (
        <ul className="space-y-3 p-4 sm:p-5">
          {committee.map((member) => (
            <li
              key={member.id}
              className="rounded-md border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[15px] font-semibold text-foreground">
                    {member.fullName}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {member.positionName}
                  </p>
                </div>

                {canAssign ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoving(member)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Cabut
                  </Button>
                ) : null}
              </div>

              {member.permissionIds.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {member.permissionIds.map((id) => {
                    const code = permissionNames[id];
                    if (!code) return null;

                    return (
                      <li key={id}>
                        <Badge tone="info">
                          {PERMISSION_LABEL[code] ?? code}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground">
                  Tanpa hak tambahan. Penugasan ini hanya bersifat
                  administratif.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          if (!target) return;

          startTransition(async () => {
            const result = await removeCommittee(
              organizationId,
              electionId,
              target.id,
            );
            setRemoving(null);

            if (!result.success) {
              showToast(result.error, "error");
              return;
            }
            showToast("Penugasan panitia dicabut.", "success");
          });
        }}
        title="Cabut penugasan panitia?"
        description={`${removing?.fullName ?? ""} akan kehilangan seluruh hak yang berasal dari penugasan ini.`}
        confirmLabel="Cabut"
        destructive
        pending={isPending}
      />
    </Card>
  );
}

function CommitteeDialog({
  open,
  onClose,
  organizationId,
  electionId,
  options,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  electionId: string;
  options: CommitteeMemberOption[];
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(assignCommittee.bind(null, organizationId, electionId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Panitia ditugaskan.", "success");
      onClose();
    }
  }, [state, showToast, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tugaskan Panitia"
      description="Hak yang dipilih berlaku pada pemilihan ini saja, dan berakhir bersama penugasannya."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state?.success === false ? state.error : ""} />

        <Field label="Anggota" htmlFor="committee-member" required>
          <Select id="committee-member" name="memberId" required>
            <option value="">Pilih anggota</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Jabatan panitia" htmlFor="committee-position" required>
          <Input
            id="committee-position"
            name="positionName"
            required
            maxLength={100}
            placeholder="Ketua Panitia Pemilihan"
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-foreground">
            Hak yang menyertai
          </legend>
          <p className="text-[13px] text-muted-foreground">
            Publikasi hasil sengaja tidak tersedia di sini — itu keputusan
            organisasi, bukan panitia teknis.
          </p>

          <ul className="space-y-1 rounded-md border border-border p-1">
            {ASSIGNABLE_COMMITTEE_PERMISSIONS.map((code) => (
              <li key={code}>
                <label className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-[13px] hover:bg-muted">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={code}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  <span className="text-foreground">
                    {PERMISSION_LABEL[code] ?? code}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Tugaskan</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
