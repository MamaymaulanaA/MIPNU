"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const LEBAR_FILTER = "sm:field-sizing-content sm:w-auto sm:max-w-56";

export type TableFilter = {
  key: string;
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
};

export type TableDateFilter = {
  key: string;
  label: string;
  value: string;
};

export function TableToolbar({
  searchKey = "search",
  searchValue,
  searchPlaceholder,
  searchLabel,
  filters = [],
  dateFilters = [],
  resetKeys = [],
}: {
  searchKey?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  filters?: TableFilter[];
  dateFilters?: TableDateFilter[];
  resetKeys?: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const adaPencarian = searchValue !== undefined;
  const [search, setSearch] = useState(searchValue ?? "");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!adaPencarian) return;

    const timer = setTimeout(() => {
      const sekarang =
        new URLSearchParams(window.location.search).get(searchKey) ?? "";
      if (sekarang === search) return;

      updateParams({ [searchKey]: search, page: null, ...kosongkanLain() });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function kosongkanLain(): Record<string, null> {
    return Object.fromEntries(resetKeys.map((kunci) => [kunci, null]));
  }

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);

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

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
      {adaPencarian ? (
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className="pl-9"
          />
        </div>
      ) : null}

      {filters.length > 0 || dateFilters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) =>
                updateParams({
                  [filter.key]: event.target.value,
                  page: null,
                  ...kosongkanLain(),
                })
              }
              className={cn("w-full", LEBAR_FILTER)}
            >
              <option value="">{filter.allLabel}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          ))}

          {dateFilters.map((filter) => (
            <Input
              key={filter.key}
              type="date"
              value={filter.value}
              aria-label={filter.label}
              onChange={(event) =>
                updateParams({
                  [filter.key]: event.target.value,
                  page: null,
                  ...kosongkanLain(),
                })
              }
              className="w-full sm:w-40"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
