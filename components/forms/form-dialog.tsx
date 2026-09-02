"use client";

import { useActionState, useEffect } from "react";

import { FormAlert, SubmitButton } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, type DialogSize } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/errors";

export function FormDialog<T>({
  open,
  onClose,
  title,
  description,
  action,
  submitLabel,
  pendingLabel,
  successMessage,
  size,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  action: (
    previousState: ActionResult<T> | null,
    formData: FormData,
  ) => Promise<ActionResult<T>>;
  submitLabel: string;
  pendingLabel?: string;
  successMessage: string;
  size?: DialogSize;
  children: (fieldErrors?: Record<string, string[]>) => React.ReactNode;
}) {
  const { showToast } = useToast();

  const [state, formAction] = useActionState<ActionResult<T> | null, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (!state?.success) return;
    showToast(successMessage);
    onClose();
  }, [state, successMessage, onClose, showToast]);

  const failed = state && !state.success ? state : null;
  const fieldErrors = failed?.fieldErrors;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={fieldErrors ? undefined : failed?.error} />

        {children(fieldErrors)}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
