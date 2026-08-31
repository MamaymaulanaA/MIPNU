"use client";

import { useActionState, useEffect } from "react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updateOwnProfile } from "@/features/profile/actions/update-profile";
import type { ActionResult } from "@/lib/errors";

export function ProfileForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string | null;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateOwnProfile, null);

  useEffect(() => {
    if (state?.success) showToast("Profil diperbarui.");
  }, [state, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4">
          <FormAlert message={fieldErrors ? undefined : failed?.error} />

          <Field
            label="Nama Tampilan"
            htmlFor="displayName"
            required
            error={fieldErrors?.displayName?.[0]}
          >
            <Input
              id="displayName"
              name="displayName"
              required
              maxLength={100}
              defaultValue={displayName}
              aria-invalid={Boolean(fieldErrors?.displayName)}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="profile-email"
            hint="Email terikat pada akun autentikasi dan tidak dapat diubah dari sini."
          >
            <Input id="profile-email" value={email ?? "—"} readOnly disabled />
          </Field>
        </CardContent>

        <CardFooter className="justify-end">
          <SubmitButton>Simpan Profil</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
