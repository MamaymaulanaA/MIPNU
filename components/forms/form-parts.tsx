"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
