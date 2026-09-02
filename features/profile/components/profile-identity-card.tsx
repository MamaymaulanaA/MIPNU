"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Pencil, Trash2, Upload } from "lucide-react";

import { FormDialog } from "@/components/forms/form-dialog";
import { FormAlert } from "@/components/forms/form-parts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  removeOwnAvatar,
  updateOwnAvatar,
} from "@/features/profile/actions/update-avatar";
import { updateOwnProfile } from "@/features/profile/actions/update-profile";
import type { ActionResult } from "@/lib/errors";

export function ProfileIdentityCard({
  displayName,
  email,
  avatarUrl,
  gender,
  identity,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  gender: "L" | "P" | null;
  identity: string;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isRemoving, startRemoving] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [state, avatarAction, isUploading] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateOwnAvatar, null);

  useEffect(() => {
    if (state?.success) showToast("Avatar diperbarui.");
  }, [state, showToast]);

  const failed = state && !state.success ? state : null;
  const shown = preview ?? avatarUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil &amp; Akun</CardTitle>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          <Pencil size={16} aria-hidden="true" />
          Ubah Profil
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormAlert message={failed?.error} />

        <div className="flex items-center gap-4">
          <Avatar
            customUrl={shown}
            gender={gender}
            identity={identity}
            size="xl"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-[13px] text-muted-foreground">
              {email ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form ref={formRef} action={avatarAction}>
            <input
              ref={inputRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPreview((previous) => {
                  if (previous) URL.revokeObjectURL(previous);
                  return URL.createObjectURL(file);
                });
                formRef.current?.requestSubmit();
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={14} aria-hidden="true" />
              {isUploading ? "Mengunggah…" : "Ganti Foto"}
            </Button>
          </form>

          {avatarUrl ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isRemoving}
              onClick={() =>
                startRemoving(async () => {
                  const result = await removeOwnAvatar();
                  if (result.success) setPreview(null);
                  showToast(
                    result.success ? "Foto profil dihapus." : result.error,
                    result.success ? "success" : "error",
                  );
                })
              }
            >
              <Trash2 size={14} aria-hidden="true" />
              Hapus
            </Button>
          ) : null}
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-[12.5px] text-muted-foreground">
            Email terikat pada akun autentikasi dan tidak dapat diubah dari
            sini.
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            Foto: PNG, JPG, atau WebP, maksimal 2 MB. Disimpan pada bucket
            privat dan hanya dapat dibuka oleh Anda.
          </p>
        </div>
      </CardContent>

      <FormDialog
        key={editOpen ? "ubah-terbuka" : "ubah-tertutup"}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Ubah Profil"
        description="Nama tampilan dipakai di seluruh aplikasi, termasuk pada catatan aktivitas."
        action={updateOwnProfile}
        submitLabel="Simpan Perubahan"
        successMessage="Profil diperbarui."
        size="sm"
      >
        {(fieldErrors) => (
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
        )}
      </FormDialog>
    </Card>
  );
}
