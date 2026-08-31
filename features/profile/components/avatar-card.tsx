"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Trash2, Upload } from "lucide-react";

import { FormAlert } from "@/components/forms/form-parts";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  removeOwnAvatar,
  updateOwnAvatar,
} from "@/features/profile/actions/update-avatar";
import type { ActionResult } from "@/lib/errors";

/**
 * Avatar dikirim begitu berkas dipilih.
 *
 * Tidak ada tombol "simpan" terpisah: memilih gambar lalu lupa menyimpannya
 * adalah kegagalan yang paling mudah terjadi di pola dua langkah, dan tidak
 * ada yang perlu dipertimbangkan ulang di antara keduanya.
 */
export function AvatarCard({
  avatarUrl,
  gender,
  identity,
}: {
  avatarUrl: string | null;
  gender: "L" | "P" | null;
  identity: string;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isRemoving, startRemoving] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);

  const [state, formAction, isUploading] = useActionState<
    ActionResult<void> | null,
    FormData
  >(updateOwnAvatar, null);

  useEffect(() => {
    if (state?.success) showToast("Avatar diperbarui.");
  }, [state, showToast]);

  // Pratinjau sengaja TIDAK dibersihkan setelah unggah berhasil: gambar yang
  // ditampilkannya sama persis dengan avatar baru, sehingga membuangnya hanya
  // menghasilkan kedipan ketika signed URL menyusul.

  const failed = state && !state.success ? state : null;
  const shown = preview ?? avatarUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto Profil</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormAlert message={failed?.error} />

        <div className="flex flex-wrap items-center gap-4">
          {/* Pratinjau unggahan menang atas apa pun, lalu avatar tersimpan,
              lalu gambar bawaan. Judul kartu sudah menyebut "Foto Profil"
              dan nama pengguna ada di kartu sebelahnya, jadi gambarnya
              dekoratif. */}
          <Avatar
            customUrl={shown}
            gender={gender}
            identity={identity}
            size="xl"
          />

          <div className="flex flex-wrap gap-2">
            <form ref={formRef} action={formAction}>
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
        </div>

        <p className="text-[13px] text-muted-foreground">
          PNG, JPG, atau WebP. Maksimal 2 MB. Foto disimpan pada bucket privat
          dan hanya dapat dibuka oleh Anda.
        </p>
      </CardContent>
    </Card>
  );
}
