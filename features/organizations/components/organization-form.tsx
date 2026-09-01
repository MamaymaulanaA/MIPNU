"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  EMPTY_ORGANIZATION_FIELDS,
  OrganizationFields,
} from "@/features/organizations/components/organization-fields";
import { createOrganization } from "@/features/organizations/actions/manage-organization";
import type { ActionResult } from "@/lib/errors";

export type ReferenceOption = { id: string; label: string };

/**
 * Form pembuatan organisasi.
 *
 * HANYA pembuatan. Penyuntingan profil tidak lagi melewati form ini: ia sudah
 * pindah ke dialog pada halaman Profil Organisasi, sejalan dengan seluruh CRUD
 * MIPNU lainnya. Cabang `mode="edit"` yang dulu ada di sini ikut dihapus
 * bersama rutenya, bukan ditinggal menganggur (AGENTS.md §47).
 *
 * Slug, jenis, tingkat, dan induk hanya ada di sini dan tidak pernah muncul
 * lagi setelahnya. Keempatnya menentukan identitas organisasi; slug dipakai
 * sebagai identifier stabil, dan mengubahnya setelah beredar akan memutus
 * tautan yang sudah ada. `updateOrganizationSchema` memang tidak menerimanya.
 */
export function CreateOrganizationForm({
  types = [],
  levels = [],
  parents = [],
}: {
  types?: ReferenceOption[];
  levels?: ReferenceOption[];
  parents?: ReferenceOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createOrganization, null);

  useEffect(() => {
    if (!state?.success) return;
    showToast("Organisasi berhasil dibuat.");
    router.push("/admin/organisasi");
  }, [state, router, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-5">
          <FormAlert message={fieldErrors ? undefined : failed?.error} />

          <OrganizationFields
            values={EMPTY_ORGANIZATION_FIELDS}
            fieldErrors={fieldErrors}
            identitySlot={
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
            }
          />
        </CardContent>

        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <SubmitButton>Buat Organisasi</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
