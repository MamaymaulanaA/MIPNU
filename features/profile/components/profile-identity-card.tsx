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

/**
 * Kartu identitas: foto, nama tampilan, dan email dalam satu blok.
 *
 * Sebelumnya ketiganya terpecah menjadi DUA kartu — "Foto Profil" berdiri
 * sendiri hanya untuk memuat satu gambar dan dua tombol, lalu kartu kedua
 * berisi form nama. Keduanya menjelaskan orang yang sama, dan memisahkannya
 * membuat halaman memanjang tanpa menambah satu informasi pun.
 *
 * NAMA DAN EMAIL DITAMPILKAN, BUKAN DIJADIKAN FIELD PERMANEN. Halaman ini
 * dulu memuat `<input>` nama yang selalu terbuka beserta tombol "Simpan
 * Profil" — satu-satunya penyuntingan di MIPNU yang bekerja begitu, sementara
 * seluruh modul lain membaca dulu lalu menyunting lewat dialog. Sekarang ia
 * ikut pola yang sama.
 *
 * Email tidak diulang sebagai baris berlabel: ia sudah terbaca di blok
 * identitas, dan menuliskannya dua kali di kartu setinggi ini hanya menambah
 * baris tanpa menambah arti. Yang perlu dikatakan hanyalah bahwa ia tidak
 * dapat diubah dari sini.
 */
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

  // Pratinjau sengaja TIDAK dibersihkan setelah unggah berhasil: gambar yang
  // ditampilkannya sama persis dengan avatar baru, sehingga membuangnya hanya
  // menghasilkan kedipan ketika signed URL menyusul.

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
          {/* Pratinjau unggahan menang atas apa pun, lalu avatar tersimpan,
              lalu gambar bawaan. Nama tertulis tepat di sebelahnya, jadi
              gambarnya dekoratif. */}
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
          {/*
            Avatar terkirim BEGITU berkas dipilih — tidak ada tombol simpan
            terpisah, dan itu disengaja: memilih gambar lalu lupa menyimpannya
            adalah kegagalan yang paling mudah terjadi pada pola dua langkah,
            dan tidak ada yang perlu dipertimbangkan ulang di antara keduanya.
            Karena itu ia tetap di kartu, bukan dipindah ke dalam dialog yang
            justru menambah satu langkah tanpa menambah kendali.
          */}
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

      {/*
        `key` mengikuti keadaan terbuka supaya dialog yang pernah gagal
        validasi tidak dibuka kembali lengkap dengan pesan error lamanya.

        `size="sm"` karena isinya satu field. Lebar form manajemen (672px)
        untuk sebuah kolom nama akan terbaca sebagai dialog yang lupa diisi.
      */}
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
