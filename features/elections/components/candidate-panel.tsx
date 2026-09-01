"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from "@/features/elections/actions/manage-elections";
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABEL,
} from "@/features/elections/schemas/election.schema";
import type { CandidateRow } from "@/features/elections/queries/get-election";
import type { ActionResult } from "@/lib/errors";
import { candidateStatus } from "@/lib/status";

export type MemberOption = { id: string; label: string };

/**
 * Daftar kandidat.
 *
 * Terkunci begitu pemilihan dibuka. `locked` hanya menyembunyikan tombolnya;
 * trigger `candidates_guard` di database yang benar-benar menolak, sehingga
 * permintaan langsung ke API pun berakhir sama.
 */
export function CandidatePanel({
  organizationId,
  electionId,
  candidates,
  memberOptions,
  canManage,
  locked,
}: {
  organizationId: string;
  electionId: string;
  candidates: CandidateRow[];
  memberOptions: MemberOption[];
  canManage: boolean;
  locked: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CandidateRow | null>(null);
  const [removing, setRemoving] = useState<CandidateRow | null>(null);

  const editable = canManage && !locked;

  return (
    <div className="space-y-4">
      {editable ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden="true" />
            Tambah Kandidat
          </Button>
        </div>
      ) : null}

      {locked && canManage ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          Daftar kandidat terkunci karena pemungutan suara sudah dibuka.
          Perubahan di tengah pemilihan akan mengubah pilihan yang sudah
          diberikan.
        </p>
      ) : null}

      {candidates.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Belum ada kandidat"
          description={
            editable
              ? "Tambahkan kandidat beserta nomor urutnya sebelum pemungutan suara dibuka."
              : "Kandidat belum disusun untuk pemilihan ini."
          }
        />
      ) : (
        // Padding kisi: kartu kandidat berada DI DALAM kartu pembungkus, jadi
        // ia butuh jarak ke tepinya. Diukur di peramban, padding kisinya 0 di
        // keempat sisi dan kartunya menempel rata pada garis pembungkusnya.
        <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          {candidates.map((candidate) => {
            const status = candidateStatus(candidate.status);

            return (
              <li
                key={candidate.id}
                className="rounded-md border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-[15px] font-semibold text-accent-foreground"
                  >
                    {String(candidate.candidateNumber).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-semibold text-foreground">
                        {candidate.displayName}
                      </p>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>

                    <p className="text-[13px] text-muted-foreground">
                      Nomor urut {candidate.candidateNumber}
                    </p>

                    {candidate.vision ? (
                      <p className="line-clamp-3 pt-1 text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Visi:{" "}
                        </span>
                        {candidate.vision}
                      </p>
                    ) : null}
                  </div>
                </div>

                {editable ? (
                  <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(candidate)}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Ubah
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoving(candidate)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Hapus
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <CandidateDialog
        key={creating ? "candidate-new" : "candidate-new-closed"}
        open={creating}
        onClose={() => setCreating(false)}
        organizationId={organizationId}
        electionId={electionId}
        memberOptions={memberOptions}
        nextNumber={
          candidates.reduce(
            (max, item) => Math.max(max, item.candidateNumber),
            0,
          ) + 1
        }
      />

      <CandidateDialog
        key={editing?.id ?? "candidate-edit-closed"}
        open={editing !== null}
        onClose={() => setEditing(null)}
        organizationId={organizationId}
        electionId={electionId}
        memberOptions={memberOptions}
        candidate={editing}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          if (!target) return;

          startTransition(async () => {
            const result = await deleteCandidate(
              organizationId,
              electionId,
              target.id,
            );
            setRemoving(null);

            if (!result.success) {
              showToast(result.error, "error");
              return;
            }
            showToast("Kandidat dihapus.", "success");
          });
        }}
        title="Hapus kandidat?"
        description={`${removing?.displayName ?? ""} akan dihapus dari daftar kandidat pemilihan ini.`}
        confirmLabel="Hapus"
        destructive
        pending={isPending}
      />
    </div>
  );
}

function CandidateDialog({
  open,
  onClose,
  organizationId,
  electionId,
  memberOptions,
  candidate,
  nextNumber,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  electionId: string;
  memberOptions: MemberOption[];
  candidate?: CandidateRow | null;
  nextNumber?: number;
}) {
  const { showToast } = useToast();

  const action = candidate
    ? updateCandidate.bind(null, organizationId, electionId, candidate.id)
    : createCandidate.bind(null, organizationId, electionId);

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(action, null);

  useEffect(() => {
    if (state?.success) {
      showToast(
        candidate ? "Kandidat diperbarui." : "Kandidat ditambahkan.",
        "success",
      );
      onClose();
    }
  }, [state, showToast, onClose, candidate]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={candidate ? "Ubah Kandidat" : "Tambah Kandidat"}
      description="Nama yang disimpan menjadi arsip pemilihan ini dan tidak ikut berubah bila profil anggota diperbarui kelak."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state?.success === false ? state.error : ""} />

        <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
          <Field label="Nomor urut" htmlFor="candidate-number" required>
            <Input
              id="candidate-number"
              name="candidateNumber"
              inputMode="numeric"
              required
              defaultValue={candidate?.candidateNumber ?? nextNumber ?? 1}
            />
          </Field>

          <Field label="Nama kandidat" htmlFor="candidate-name" required>
            <Input
              id="candidate-name"
              name="displayName"
              required
              maxLength={200}
              defaultValue={candidate?.displayName ?? ""}
            />
          </Field>
        </div>

        <Field
          label="Tautkan ke anggota"
          htmlFor="candidate-member"
          hint="Opsional. Kandidat dari luar kepengurusan boleh tanpa tautan anggota."
        >
          <Select
            id="candidate-member"
            name="memberId"
            defaultValue={candidate?.memberId ?? ""}
          >
            <option value="">Tanpa tautan anggota</option>
            {memberOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Status" htmlFor="candidate-status">
          <Select
            id="candidate-status"
            name="status"
            defaultValue={candidate?.status ?? "ACTIVE"}
          >
            {CANDIDATE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {CANDIDATE_STATUS_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Visi" htmlFor="candidate-vision">
          <Textarea
            id="candidate-vision"
            name="vision"
            rows={3}
            maxLength={2000}
            defaultValue={candidate?.vision ?? ""}
          />
        </Field>

        <Field label="Misi" htmlFor="candidate-mission">
          <Textarea
            id="candidate-mission"
            name="mission"
            rows={3}
            maxLength={2000}
            defaultValue={candidate?.mission ?? ""}
          />
        </Field>

        <Field label="Profil singkat" htmlFor="candidate-profile">
          <Textarea
            id="candidate-profile"
            name="profileText"
            rows={3}
            maxLength={2000}
            defaultValue={candidate?.profileText ?? ""}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton>Simpan</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
