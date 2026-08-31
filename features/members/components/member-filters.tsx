"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { MEMBER_STATUSES } from "@/features/members/schemas/member.schema";
import { memberStatus } from "@/lib/status";

/**
 * Filter daftar anggota.
 *
 * State disimpan di URL, bukan di state client, supaya hasil filter dapat
 * dibagikan dan bertahan saat refresh. Pencarian dieksekusi database-side;
 * komponen ini hanya menyusun query string.
 */
export function MemberFilters({
  initialSearch,
  initialStatus,
}: {
  initialSearch: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const isFirstRender = useRef(true);

  // Debounce: menunggu pengguna berhenti mengetik supaya satu kata pencarian
  // tidak menghasilkan satu request per huruf.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      updateParams({ search, page: null });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `?${query}` : "?");
    });
  }

  const hasFilter = search !== "" || initialStatus !== "";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari nama atau nomor anggota"
          aria-label="Cari anggota"
          className="pl-9"
        />
      </div>

      <Select
        value={initialStatus}
        aria-label="Filter status"
        onChange={(event) =>
          updateParams({ status: event.target.value, page: null })
        }
        className="sm:w-48"
      >
        <option value="">Semua status</option>
        {MEMBER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {memberStatus(status).label}
          </option>
        ))}
      </Select>

      {hasFilter ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setSearch("");
            updateParams({ search: null, status: null, page: null });
          }}
        >
          <X size={15} aria-hidden="true" />
          Reset
        </Button>
      ) : null}
    </div>
  );
}
