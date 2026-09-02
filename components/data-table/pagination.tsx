"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  pageKey = "page",
  label = "data",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  pageKey?: string;
  label?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete(pageKey);
    } else {
      params.set(pageKey, String(nextPage));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[13px] text-muted-foreground">
        Menampilkan {formatNumber(first)}–{formatNumber(last)} dari{" "}
        {formatNumber(total)} {label}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft size={15} aria-hidden="true" />
          Sebelumnya
        </Button>

        <span className="px-1 text-[13px] text-muted-foreground">
          {page} / {pageCount}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => goToPage(page + 1)}
        >
          Berikutnya
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
