"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { ShieldOff, Trash2, UserPlus, Users } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
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
  addVoters,
  removeVoter,
  setVoterEligibility,
} from "@/features/elections/actions/manage-elections";
import type { VoterRow } from "@/features/elections/queries/get-election";
import type { ActionResult } from "@/lib/errors";
import { formatDateTime, orDash } from "@/lib/format";
import { voterStatus } from "@/lib/status";

export type VoterMemberOption = {
  id: string;
  label: string;
  memberNumber: string | null;
};

export function VoterPanel({
  organizationId,
  electionId,
  voters,
  memberOptions,
  canManage,
  locked,
}: {
  organizationId: string;
  electionId: string;
  voters: VoterRow[];
  memberOptions: VoterMemberOption[];
  canManage: boolean;
  locked: boolean;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<VoterRow | null>(null);
  const [revoking, setRevoking] = useState<VoterRow | null>(null);

  const editable = canManage && !locked;

  const enrolled = useMemo(
    () => new Set(voters.map((voter) => voter.memberId)),
    [voters],
  );
  const available = memberOptions.filter((option) => !enrolled.has(option.id));

  const eligible = voters.filter((voter) => voter.eligible).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {voters.length} terdaftar · {eligible} berhak memilih
        </p>

        {editable ? (
          <Button onClick={() => setAdding(true)}>
            <UserPlus size={16} aria-hidden="true" />
            Tambah Pemilih
          </Button>
        ) : null}
      </div>

      {locked && canManage ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          DPT terkunci karena pemungutan suara sudah dibuka. Koreksi setelah
          tahap ini harus melalui proses insiden resmi, bukan lewat layar ini.
        </p>
      ) : null}

      {voters.length === 0 ? (
        <EmptyState
          icon={Users}
          title="DPT masih kosong"
          description={
            editable
              ? "Tambahkan anggota yang berhak memilih sebelum pemungutan suara dibuka."
              : "Daftar pemilih belum disusun untuk pemilihan ini."
          }
        />
      ) : (
        <TableScroll>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Nama</TableHeaderCell>
                <TableHeaderCell className="hidden sm:table-cell">
                  No. Anggota
                </TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="hidden md:table-cell">
                  Waktu Memilih
                </TableHeaderCell>
                {editable ? (
                  <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {voters.map((voter) => {
                const state = !voter.eligible
                  ? voterStatus("INELIGIBLE")
                  : voter.hasVoted
                    ? voterStatus("VOTED")
                    : voterStatus("NOT_VOTED");

                return (
                  <TableRow key={voter.id}>
                    <TableCell className="font-medium text-foreground">
                      {voter.fullName}
                      {!voter.eligible && voter.ineligibleReason ? (
                        <span className="block text-[12px] font-normal text-muted-foreground">
                          {voter.ineligibleReason}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {orDash(voter.memberNumber)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={state.tone}>{state.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {voter.votedAt ? formatDateTime(voter.votedAt) : "—"}
                    </TableCell>
                    {editable ? (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {voter.eligible ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRevoking(voter)}
                            >
                              <ShieldOff size={14} aria-hidden="true" />
                              Cabut Hak
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoving(voter)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            Hapus
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableScroll>
      )}

      <AddVoterDialog
        open={adding}
        onClose={() => setAdding(false)}
        organizationId={organizationId}
        electionId={electionId}
        options={available}
      />

      <RevokeDialog
        key={revoking?.id ?? "revoke-closed"}
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        organizationId={organizationId}
        electionId={electionId}
        voter={revoking}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          if (!target) return;

          startTransition(async () => {
            const result = await removeVoter(
              organizationId,
              electionId,
              target.id,
            );
            setRemoving(null);

            if (!result.success) {
              showToast(result.error, "error");
              return;
            }
            showToast("Pemilih dihapus dari DPT.", "success");
          });
        }}
        title="Hapus dari DPT?"
        description={`${removing?.fullName ?? ""} akan kehilangan hak pilih pada pemilihan ini.`}
        confirmLabel="Hapus"
        destructive
        pending={isPending}
      />
    </div>
  );
}

function AddVoterDialog({
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
  options: VoterMemberOption[];
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah Pemilih"
      description="Anggota yang sudah berada di DPT tidak ditampilkan lagi."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            disabled={isPending || selected.length === 0}
            onClick={() =>
              startTransition(async () => {
                const result = await addVoters(
                  organizationId,
                  electionId,
                  selected,
                );

                if (!result.success) {
                  showToast(result.error, "error");
                  return;
                }

                showToast(
                  `${result.data.added} anggota ditambahkan ke DPT.`,
                  "success",
                );
                setSelected([]);
                onClose();
              })
            }
          >
            {isPending
              ? "Menambahkan…"
              : `Tambahkan ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Cari anggota" htmlFor="voter-search">
          <Input
            id="voter-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ketik nama anggota"
          />
        </Field>

        {options.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Semua anggota yang dapat Anda lihat sudah berada di DPT. Bila ada
            anggota yang belum muncul, Anda mungkin belum berhak melihat seluruh
            data anggota (members.view).
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Tidak ada anggota yang cocok dengan pencarian itu.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
            {filtered.map((option) => (
              <li key={option.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 text-[13px] hover:bg-muted">
                  <input
                    type="checkbox"
                    className="size-4 accent-[hsl(var(--primary))]"
                    checked={selected.includes(option.id)}
                    onChange={() => toggle(option.id)}
                  />
                  <span className="text-foreground">{option.label}</span>
                  {option.memberNumber ? (
                    <span className="ml-auto text-muted-foreground">
                      {option.memberNumber}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}

function RevokeDialog({
  open,
  onClose,
  organizationId,
  electionId,
  voter,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  electionId: string;
  voter: VoterRow | null;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(setVoterEligibility.bind(null, organizationId, electionId), null);

  useEffect(() => {
    if (state?.success) {
      showToast("Hak pilih dicabut.", "success");
      onClose();
    }
  }, [state, showToast, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cabut hak pilih?"
      description={`${voter?.fullName ?? ""} tetap tercatat di DPT, tetapi tidak dapat memberikan suara. Alasannya disimpan agar koreksi ini dapat dipertanggungjawabkan.`}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state?.success === false ? state.error : ""} />
        <input type="hidden" name="voterId" value={voter?.id ?? ""} />
        <input type="hidden" name="eligible" value="false" />

        <Field label="Alasan" htmlFor="revoke-reason">
          <Textarea
            id="revoke-reason"
            name="reason"
            rows={3}
            maxLength={500}
            placeholder="Mis. berpindah organisasi sebelum hari pemungutan suara."
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton variant="destructive" pendingLabel="Mencabut…">
            Cabut Hak Pilih
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
