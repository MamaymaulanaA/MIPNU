"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createMember } from "@/features/members/actions/create-member";
import { updateMember } from "@/features/members/actions/manage-member";
import { MEMBER_STATUSES } from "@/features/members/schemas/member.schema";
import type { ActionResult } from "@/lib/errors";
import { memberStatus } from "@/lib/status";

export type MemberFormValues = {
  fullName: string;
  memberNumber: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  status: string;
  notes: string;
};

const EMPTY: MemberFormValues = {
  fullName: "",
  memberNumber: "",
  gender: "",
  birthPlace: "",
  birthDate: "",
  email: "",
  phone: "",
  address: "",
  joinDate: "",
  status: "ACTIVE",
  notes: "",
};

/**
 * Form anggota, dipakai untuk penambahan maupun penyuntingan.
 *
 * `organizationId` diikat di server lewat `bind`, bukan sebagai input
 * tersembunyi. Field tersembunyi dapat disunting di browser; argumen yang
 * di-bind tidak — dan server tetap memvalidasinya ulang terhadap access
 * context.
 */
export function MemberForm({
  organizationId,
  memberId,
  values = EMPTY,
  canEditPrivate = true,
  canEditStatus = true,
}: {
  organizationId: string;
  memberId?: string;
  values?: MemberFormValues;
  canEditPrivate?: boolean;
  /** Perubahan status butuh `members.manage_status`, dijaga trigger database. */
  canEditStatus?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const isEdit = Boolean(memberId);

  const [createState, createAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createMember.bind(null, organizationId), null);

  const [editState, editAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateMember.bind(null, organizationId, memberId ?? ""), null);

  const state = isEdit ? editState : createState;

  useEffect(() => {
    if (!state?.success) return;

    showToast(isEdit ? "Data anggota tersimpan." : "Anggota ditambahkan.");
    router.push(isEdit && memberId ? `/anggota/${memberId}` : "/anggota");
  }, [state, isEdit, memberId, router, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={isEdit ? editAction : createAction}>
      <Card>
        <CardContent className="space-y-5">
          <FormAlert message={fieldErrors ? undefined : failed?.error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama Lengkap"
              htmlFor="fullName"
              required
              error={fieldErrors?.fullName?.[0]}
              className="sm:col-span-2"
            >
              <Input
                id="fullName"
                name="fullName"
                required
                maxLength={150}
                autoComplete="off"
                defaultValue={values.fullName}
                aria-invalid={Boolean(fieldErrors?.fullName)}
              />
            </Field>

            <Field
              label="Nomor Anggota"
              htmlFor="memberNumber"
              hint="Kosongkan bila belum diterbitkan."
              error={fieldErrors?.memberNumber?.[0]}
            >
              <Input
                id="memberNumber"
                name="memberNumber"
                maxLength={50}
                autoComplete="off"
                defaultValue={values.memberNumber}
                aria-invalid={Boolean(fieldErrors?.memberNumber)}
              />
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              required
              hint={
                canEditStatus
                  ? undefined
                  : "Perubahan status membutuhkan permission tersendiri."
              }
              error={fieldErrors?.status?.[0]}
            >
              <Select
                id="status"
                name="status"
                required
                defaultValue={values.status}
                disabled={!canEditStatus}
              >
                {MEMBER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {memberStatus(status).label}
                  </option>
                ))}
              </Select>
              {/*
                Field yang disabled tidak ikut terkirim. Nilai lama dikirim
                lewat hidden input supaya server menerima status yang tidak
                berubah, bukan status kosong.
              */}
              {canEditStatus ? null : (
                <input type="hidden" name="status" value={values.status} />
              )}
            </Field>

            <Field
              label="Jenis Kelamin"
              htmlFor="gender"
              error={fieldErrors?.gender?.[0]}
            >
              <Select id="gender" name="gender" defaultValue={values.gender}>
                <option value="">Tidak diisi</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </Select>
            </Field>

            <Field
              label="Tanggal Bergabung"
              htmlFor="joinDate"
              error={fieldErrors?.joinDate?.[0]}
            >
              <Input
                id="joinDate"
                name="joinDate"
                type="date"
                defaultValue={values.joinDate}
              />
            </Field>

            <Field
              label="Tempat Lahir"
              htmlFor="birthPlace"
              error={fieldErrors?.birthPlace?.[0]}
            >
              <Input
                id="birthPlace"
                name="birthPlace"
                maxLength={100}
                defaultValue={values.birthPlace}
              />
            </Field>

            <Field
              label="Tanggal Lahir"
              htmlFor="birthDate"
              error={fieldErrors?.birthDate?.[0]}
            >
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={values.birthDate}
              />
            </Field>

            {canEditPrivate ? (
              <>
                <Field
                  label="Email"
                  htmlFor="email"
                  error={fieldErrors?.email?.[0]}
                >
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                    defaultValue={values.email}
                    aria-invalid={Boolean(fieldErrors?.email)}
                  />
                </Field>

                <Field
                  label="Nomor Telepon"
                  htmlFor="phone"
                  error={fieldErrors?.phone?.[0]}
                >
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={30}
                    defaultValue={values.phone}
                  />
                </Field>

                <Field
                  label="Alamat"
                  htmlFor="address"
                  error={fieldErrors?.address?.[0]}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="address"
                    name="address"
                    maxLength={255}
                    rows={2}
                    defaultValue={values.address}
                  />
                </Field>
              </>
            ) : null}

            <Field
              label="Catatan"
              htmlFor="notes"
              hint="Catatan internal organisasi."
              error={fieldErrors?.notes?.[0]}
              className="sm:col-span-2"
            >
              <Textarea
                id="notes"
                name="notes"
                maxLength={1000}
                rows={3}
                defaultValue={values.notes}
              />
            </Field>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <SubmitButton>
            {isEdit ? "Simpan Perubahan" : "Simpan Anggota"}
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
