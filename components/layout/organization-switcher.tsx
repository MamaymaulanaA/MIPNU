"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { switchOrganization } from "@/features/organizations/actions/switch-organization";
import type { AccessibleOrganization } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
}: {
  organizations: AccessibleOrganization[];
  currentOrganizationId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const current =
    organizations.find(
      (organization) => organization.organizationId === currentOrganizationId,
    ) ?? organizations[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!current) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-[13px] text-muted-foreground">
        Belum terhubung ke organisasi.
      </p>
    );
  }

  const onlyOne = organizations.length === 1;

  function handleSelect(organizationId: string) {
    setOpen(false);
    if (organizationId === current?.organizationId) return;

    startTransition(async () => {
      await switchOrganization(organizationId);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={onlyOne || isPending}
        aria-haspopup={onlyOne ? undefined : "listbox"}
        aria-expanded={onlyOne ? undefined : open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md border border-border px-2.5 py-2 text-left",
          "transition-colors duration-150",
          onlyOne ? "cursor-default" : "hover:bg-muted",
          isPending && "opacity-60",
        )}
      >
        <OrganizationMark typeCode={current.typeCode} />

        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[13px] font-medium text-foreground">
            {current.shortName ?? current.name}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {current.levelCode} · {current.roleName}
          </span>
        </span>

        {onlyOne ? null : (
          <ChevronsUpDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        )}
      </button>

      {open && !onlyOne ? (
        <ul
          role="listbox"
          aria-label="Pilih organisasi"
          className={cn(
            "absolute inset-x-0 top-full z-40 mt-1 max-h-72 overflow-y-auto",
            "scroll-area rounded-md border border-border bg-popover p-1",
            "shadow-floating",
          )}
        >
          {organizations.map((organization) => {
            const selected =
              organization.organizationId === current.organizationId;

            return (
              <li key={organization.organizationId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(organization.organizationId)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left",
                    "transition-colors duration-150 hover:bg-muted",
                  )}
                >
                  <OrganizationMark typeCode={organization.typeCode} />

                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-[13px] text-foreground">
                      {organization.name}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {organization.levelCode} · {organization.roleName}
                    </span>
                  </span>

                  {selected ? (
                    <Check
                      size={15}
                      aria-hidden="true"
                      className="shrink-0 text-primary"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function OrganizationMark({ typeCode }: { typeCode: string }) {
  const isIppnu = typeCode === "IPPNU";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-sm text-[10px] font-semibold text-white",
        isIppnu ? "bg-ippnu" : "bg-ipnu",
      )}
    >
      {isIppnu ? "PU" : "NU"}
    </span>
  );
}
