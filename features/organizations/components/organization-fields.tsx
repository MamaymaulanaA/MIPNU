"use client";

import { Field, Input, Textarea } from "@/components/ui/field";

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
  fieldErrors?: Record<string, string[]>;
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
