"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MEMBER_STATUSES } from "@/features/members/schemas/member.schema";
import { memberStatus } from "@/lib/status";

/**
 * Field data anggota, dipakai bersama dialog tambah dan sunting.
 *
 * Dua permission berlaku di sini: `members.view_private` menentukan email,
 * telepon, dan alamat TIDAK digambar sama sekali (bukan digambar lalu
 * disembunyikan); `members.manage_status` menonaktifkan select status dan
 * mengirim nilai lamanya lewat input tersembunyi agar server menerima status
 * yang tidak berubah, bukan kosong. Keduanya diperiksa ulang di server.
 */

export type MemberFieldValues = {
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

export const EMPTY_MEMBER_FIELDS: MemberFieldValues = {
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

export function MemberFields({
  values,
  fieldErrors,
  canEditPrivate = true,
  canEditStatus = true,
}: {
  values: MemberFieldValues;
  fieldErrors?: Record<string, string[]>;
  canEditPrivate?: boolean;
  canEditStatus?: boolean;
}) {
  return (
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
          <Field label="Email" htmlFor="email" error={fieldErrors?.email?.[0]}>
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
  );
}
