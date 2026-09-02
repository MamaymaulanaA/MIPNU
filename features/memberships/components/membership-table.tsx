"use client";

import { useState, useTransition } from "react";
import { KeyRound, Link2, ShieldCheck, UserCog } from "lucide-react";

import { EmptyState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
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
  changeMembershipRole,
  endMembership,
  linkMembershipToMember,
} from "@/features/memberships/actions/manage-membership";
import { resendInvitation } from "@/features/memberships/actions/provision-user";
import { InviteLinkBox } from "@/features/memberships/components/provision-user-dialog";
import { formatShortDate } from "@/lib/format";
import { roleStatus } from "@/lib/status";

export type MembershipRow = {
  id: string;
  profileId: string;
  displayName: string;
  roleId: string;
  roleCode: string;
  status: string;
  joinedAt: string;
  memberId: string | null;
  memberName: string | null;
};

export type RoleOption = { id: string; code: string; name: string };
export type MemberOption = { id: string; label: string };

export function MembershipTable({
  organizationId,
  memberships,
  roleOptions,
  memberOptions,
  currentProfileId,
  canEdit,
}: {
  organizationId: string;
  memberships: MembershipRow[];
  roleOptions: RoleOption[];
  memberOptions: MemberOption[];
  currentProfileId: string;
  canEdit: boolean;
}) {
  const { showToast } = useToast();
  const [linking, setLinking] = useState<MembershipRow | null>(null);
  const [changingRole, setChangingRole] = useState<MembershipRow | null>(null);
  const [ending, setEnding] = useState<MembershipRow | null>(null);
  const [invite, setInvite] = useState<{ name: string; link: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  if (memberships.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="Belum ada pengguna"
        description="Akun yang ditautkan ke organisasi ini akan tampil di sini."
      />
    );
  }

  function runEnd() {
    if (!ending) return;
    const target = ending;

    startTransition(async () => {
      const result = await endMembership(organizationId, target.id);
      setEnding(null);
      showToast(
        result.success ? `Akses ${target.displayName} diakhiri.` : result.error,
        result.success ? "success" : "error",
      );
    });
  }

  function runResend(membership: MembershipRow) {
    startTransition(async () => {
      const result = await resendInvitation(organizationId, membership.id);

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      if (result.data.emailSent) {
        showToast(`Tautan akses dikirim ke email ${membership.displayName}.`);
        return;
      }

      if (result.data.inviteLink) {
        setInvite({
          name: membership.displayName,
          link: result.data.inviteLink,
        });
        return;
      }

      showToast(
        "Tautan tidak dapat diterbitkan. Minta pengguna memakai “Lupa kata sandi” di halaman masuk.",
        "error",
      );
    });
  }

  return (
    <>
      <TableScroll bounded>
        <Table>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableHeaderCell>Nama Akun</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell className="hidden md:table-cell">
                Tertaut ke Anggota
              </TableHeaderCell>
              <TableHeaderCell className="hidden lg:table-cell">
                Bergabung
              </TableHeaderCell>
              {canEdit ? (
                <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
              ) : null}
            </TableRow>
          </TableHead>

          <TableBody>
            {memberships.map((membership) => {
              const role = roleStatus(membership.roleCode);

              const isSelf = membership.profileId === currentProfileId;
              const editable = canEdit && !isSelf;

              return (
                <TableRow key={membership.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">
                      {membership.displayName}
                    </span>
                    {isSelf ? (
                      <span className="ml-2 text-[13px] text-muted-foreground">
                        (Anda)
                      </span>
                    ) : null}
                    {membership.status !== "ACTIVE" ? (
                      <span className="block text-[13px] text-muted-foreground">
                        Akses tidak aktif
                      </span>
                    ) : null}
                  </TableCell>

                  <TableCell>
                    <Badge tone={role.tone}>{role.label}</Badge>
                  </TableCell>

                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {membership.memberName ?? "—"}
                  </TableCell>

                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatShortDate(membership.joinedAt)}
                  </TableCell>

                  {canEdit ? (
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {editable ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setChangingRole(membership)}
                            >
                              <ShieldCheck size={14} aria-hidden="true" />
                              Role
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLinking(membership)}
                            >
                              <Link2 size={14} aria-hidden="true" />
                              Tautkan
                            </Button>

                            {membership.status === "ACTIVE" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() => runResend(membership)}
                                >
                                  <KeyRound size={14} aria-hidden="true" />
                                  Tautan Akses
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEnding(membership)}
                                >
                                  Akhiri
                                </Button>
                              </>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroll>

      <ChangeRoleDialog
        key={changingRole?.id ?? "role-tertutup"}
        open={Boolean(changingRole)}
        onClose={() => setChangingRole(null)}
        organizationId={organizationId}
        membership={changingRole}
        roleOptions={roleOptions}
      />

      <LinkMemberDialog
        key={linking?.id ?? "link-closed"}
        open={Boolean(linking)}
        onClose={() => setLinking(null)}
        organizationId={organizationId}
        membership={linking}
        memberOptions={memberOptions}
      />

      <Dialog
        open={Boolean(invite)}
        onClose={() => setInvite(null)}
        title={`Tautan akses ${invite?.name ?? ""}`}
        description="Pengiriman email belum aktif di environment ini, jadi sampaikan tautan berikut lewat kanal yang Anda percaya."
        footer={<Button onClick={() => setInvite(null)}>Selesai</Button>}
      >
        {invite ? <InviteLinkBox link={invite.link} /> : null}
      </Dialog>

      <ConfirmDialog
        open={Boolean(ending)}
        onClose={() => setEnding(null)}
        onConfirm={runEnd}
        pending={isPending}
        destructive
        confirmLabel="Akhiri Akses"
        title={`Akhiri akses ${ending?.displayName ?? ""}?`}
        description="Akun tidak lagi dapat membuka data organisasi ini. Catatan keanggotaannya tetap tersimpan sebagai riwayat, tidak dihapus."
      />
    </>
  );
}

function ChangeRoleDialog({
  open,
  onClose,
  organizationId,
  membership,
  roleOptions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  membership: MembershipRow | null;
  roleOptions: RoleOption[];
}) {
  const { showToast } = useToast();
  const [roleId, setRoleId] = useState(membership?.roleId ?? "");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!membership) return;

    startTransition(async () => {
      const result = await changeMembershipRole(
        organizationId,
        membership.id,
        roleId,
      );
      if (result.success) {
        showToast("Role diperbarui.");
        onClose();
      } else {
        showToast(result.error, "error");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ubah Role Akun"
      description={
        membership
          ? `Menentukan wewenang ${membership.displayName} di organisasi ini.`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || roleId === membership?.roleId}
          >
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <Field label="Role" htmlFor="membership-role">
        <Select
          id="membership-role"
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
        >
          {roleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}

function LinkMemberDialog({
  open,
  onClose,
  organizationId,
  membership,
  memberOptions,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  membership: MembershipRow | null;
  memberOptions: MemberOption[];
}) {
  const { showToast } = useToast();
  const [memberId, setMemberId] = useState(membership?.memberId ?? "");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!membership) return;

    startTransition(async () => {
      const result = await linkMembershipToMember(
        organizationId,
        membership.id,
        memberId === "" ? null : memberId,
      );
      if (result.success) {
        showToast("Tautan akun diperbarui.");
        onClose();
      } else {
        showToast(result.error, "error");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tautkan Akun ke Data Anggota"
      description="Tanpa tautan ini, akun tidak dapat mendaftar event atau melakukan presensi mandiri."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </>
      }
    >
      <Field label="Data Anggota" htmlFor="membership-member">
        <Select
          id="membership-member"
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        >
          <option value="">Tidak ditautkan</option>
          {memberOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}
