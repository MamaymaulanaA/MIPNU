"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CsvExport } from "@/features/exports/actions/export-csv";
import type { ActionResult } from "@/lib/errors";

export function ExportButton({
  label = "Ekspor CSV",
  variant = "outline",
  size = "default",
  action,
}: {
  label?: string;
  variant?: "outline" | "secondary" | "ghost";
  size?: "default" | "sm";
  action: () => Promise<ActionResult<CsvExport>>;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        showToast(result.error, "error");
        return;
      }

      const blob = new Blob([result.data.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      showToast(`Berkas ${result.data.filename} diunduh.`);
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={download}
      disabled={isPending}
    >
      <Download size={size === "sm" ? 14 : 16} aria-hidden="true" />
      {isPending ? "Menyiapkan…" : label}
    </Button>
  );
}
