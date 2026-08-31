"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createOrganization,
  updateOrganization,
} from "@/features/organizations/actions/manage-organization";
import type { ActionResult } from "@/lib/errors";

export type ReferenceOption = { id: string; label: string };

export type OrganizationFormValues = {
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

const EMPTY: OrganizationFormValues = {
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

/**
 * Form organisasi, dipakai untuk pembuatan maupun penyuntingan.
 *
 * Mode `create` menambahkan slug, jenis, tingkat, dan induk — ketiganya
 * menentukan identitas organisasi dan sengaja tidak dapat diubah lagi
 * setelahnya.
 */
export function OrganizationForm({
  mode,
  organizationId,
  values = EMPTY,
  types = [],
  levels = [],
  parents = [],
}: {
  mode: "create" | "edit";
  organizationId?: string;
  values?: OrganizationFormValues;
  types?: ReferenceOption[];
  levels?: ReferenceOption[];
  parents?: ReferenceOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const isCreate = mode === "create";

  const [createState, createAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createOrganization, null);

  const [editState, editAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateOrganization.bind(null, organizationId ?? ""), null);

  const state = isCreate ? createState : editState;

  useEffect(() => {
    if (!state?.success) return;

    if (isCreate) {
      showToast("Organisasi berhasil dibuat.");
      router.push("/admin/organisasi");
    } else {
      showToast("Perubahan organisasi tersimpan.");
      router.push("/organisasi");
    }
  }, [state, isCreate, router, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={isCreate ? createAction : editAction}>
      <Card>
        <CardContent className="space-y-5">
          <FormAlert message={fieldErrors ? undefined : failed?.error} />

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

            {isCreate ? (
              <>
                <Field
                  label="Slug"
                  htmlFor="slug"
                  required
                  hint="Identifier permanen. Tidak dapat diubah setelah dibuat."
                  error={fieldErrors?.slug?.[0]}
                >
                  <Input
                    id="slug"
                    name="slug"
                    required
                    maxLength={80}
                    placeholder="pac-ipnu-nama-kecamatan"
                    aria-invalid={Boolean(fieldErrors?.slug)}
                  />
                </Field>

                <Field
                  label="Jenis Organisasi"
                  htmlFor="organizationTypeId"
                  required
                  error={fieldErrors?.organizationTypeId?.[0]}
                >
                  <Select
                    id="organizationTypeId"
                    name="organizationTypeId"
                    required
                  >
                    <option value="">Pilih jenis</option>
                    {types.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Tingkat Organisasi"
                  htmlFor="organizationLevelId"
                  required
                  error={fieldErrors?.organizationLevelId?.[0]}
                >
                  <Select
                    id="organizationLevelId"
                    name="organizationLevelId"
                    required
                  >
                    <option value="">Pilih tingkat</option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Organisasi Induk"
                  htmlFor="parentOrganizationId"
                  hint="Kosongkan bila ini organisasi tertinggi."
                  error={fieldErrors?.parentOrganizationId?.[0]}
                  className="sm:col-span-2"
                >
                  <Select
                    id="parentOrganizationId"
                    name="parentOrganizationId"
                    defaultValue=""
                  >
                    <option value="">Tanpa induk</option>
                    {parents.map((parent) => (
                      <option key={parent.id} value={parent.id}>
                        {parent.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            <Field
              label="Email"
              htmlFor="email"
              error={fieldErrors?.email?.[0]}
            >
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={values.email}
                aria-invalid={Boolean(fieldErrors?.email)}
              />
            </Field>

            <Field
              label="Telepon"
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
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <SubmitButton>
            {isCreate ? "Buat Organisasi" : "Simpan Perubahan"}
          </SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
