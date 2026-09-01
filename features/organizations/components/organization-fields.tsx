"use client";

import { Field, Input, Textarea } from "@/components/ui/field";

/**
 * Field profil organisasi yang dapat disunting.
 *
 * Dipakai bersama oleh dua form yang berbeda tempat: pembuatan organisasi di
 * `/admin/organisasi/baru`, dan penyuntingan profil lewat dialog di
 * `/organisasi`. Keduanya menyunting kolom yang sama persis, dan sebelum
 * berkas ini ada keduanya menuliskan sepuluh field itu sendiri-sendiri.
 *
 * Yang TIDAK ada di sini: slug, jenis, tingkat, dan induk. Keempatnya hanya
 * dapat ditentukan saat pembuatan — lihat `updateOrganizationSchema`, yang
 * memang tidak menerimanya. Form pembuatan menyisipkannya lewat
 * `identitySlot`, tepat setelah nama singkat, sehingga urutan tampilannya
 * tidak berubah.
 *
 * Komponen ini sengaja tidak memegang `<form>`, action, maupun state: ia hanya
 * menggambar field. Pemanggilnya yang menentukan ke mana datanya dikirim, dan
 * itulah yang membuatnya dapat berdiri baik di dalam halaman maupun di dalam
 * dialog.
 */

export type OrganizationFieldValues = {
  name: string;
  shortName: string;
  address: string;
  village: string;
  district: string;
  cityRegency: string;
  province: string;
  email: string;
  phone: string;
  description: string;
};

export const EMPTY_ORGANIZATION_FIELDS: OrganizationFieldValues = {
  name: "",
  shortName: "",
  address: "",
  village: "",
  district: "",
  cityRegency: "",
  province: "",
  email: "",
  phone: "",
  description: "",
};

export function OrganizationFields({
  values,
  fieldErrors,
  identitySlot,
}: {
  values: OrganizationFieldValues;
  /** Hasil validasi Zod dari server, ditampilkan inline pada fieldnya. */
  fieldErrors?: Record<string, string[]>;
  /** Field identitas yang hanya ada saat pembuatan. */
  identitySlot?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Nama Organisasi"
        htmlFor="name"
        required
        error={fieldErrors?.name?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="name"
          name="name"
          required
          maxLength={150}
          defaultValue={values.name}
          aria-invalid={Boolean(fieldErrors?.name)}
        />
      </Field>

      <Field
        label="Nama Singkat"
        htmlFor="shortName"
        hint="Dipakai di sidebar dan pemilih organisasi."
        error={fieldErrors?.shortName?.[0]}
      >
        <Input
          id="shortName"
          name="shortName"
          maxLength={60}
          defaultValue={values.shortName}
        />
      </Field>

      {identitySlot}

      <Field label="Email" htmlFor="email" error={fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={values.email}
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </Field>

      <Field label="Telepon" htmlFor="phone" error={fieldErrors?.phone?.[0]}>
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
          rows={2}
          maxLength={255}
          defaultValue={values.address}
        />
      </Field>

      <Field label="Desa/Kelurahan" htmlFor="village">
        <Input
          id="village"
          name="village"
          maxLength={100}
          defaultValue={values.village}
        />
      </Field>

      <Field label="Kecamatan" htmlFor="district">
        <Input
          id="district"
          name="district"
          maxLength={100}
          defaultValue={values.district}
        />
      </Field>

      <Field label="Kabupaten/Kota" htmlFor="cityRegency">
        <Input
          id="cityRegency"
          name="cityRegency"
          maxLength={100}
          defaultValue={values.cityRegency}
        />
      </Field>

      <Field label="Provinsi" htmlFor="province">
        <Input
          id="province"
          name="province"
          maxLength={100}
          defaultValue={values.province}
        />
      </Field>

      <Field
        label="Deskripsi"
        htmlFor="description"
        error={fieldErrors?.description?.[0]}
        className="sm:col-span-2"
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={1000}
          defaultValue={values.description}
        />
      </Field>
    </div>
  );
}
