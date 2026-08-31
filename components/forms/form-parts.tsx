"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bagian form yang berulang di seluruh modul.
 *
 * Tujuannya satu: setiap form MIPNU punya loading state, disabled state, dan
 * error state tanpa harus diingat ulang tiap kali (SYSTEM.md §75).
 */

/**
 * Tombol submit yang tahu sendiri kapan form-nya sedang dikirim.
 *
 * `useFormStatus` membaca status dari `<form>` induk, sehingga tombol tidak
 * perlu dioper prop `pending` dari komponen di atasnya.
 */
export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  className,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      className={className}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Ringkasan error tingkat form — untuk kegagalan yang bukan milik satu field. */
export function FormAlert({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive",
        className,
      )}
    >
      <AlertCircle size={16} className="mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
