"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ShieldCheck, X } from "lucide-react";

import { OrganizationSwitcher } from "@/components/layout/organization-switcher";
import {
  filterNavigation,
  resolveActiveHref,
} from "@/components/layout/navigation";
import { Button } from "@/components/ui/button";
import type { AccessibleOrganization } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export function AppSidebar({
  permissions,
  organizations,
  currentOrganizationId,
  open,
  onClose,
}: {
  permissions: string[];
  organizations: AccessibleOrganization[];
  currentOrganizationId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const groups = useMemo(
    () => filterNavigation(new Set(permissions)),
    [permissions],
  );

  const activeHref = useMemo(() => resolveActiveHref(pathname), [pathname]);

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-(--sidebar-width) flex-col",
          "border-r border-sidebar-border bg-sidebar",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
        )}
      >
        <div className="flex h-(--header-height) shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-2.5"
            onClick={onClose}
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-[15px] font-bold text-primary-foreground shadow-raised"
            >
              M
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[15px] font-bold text-foreground">
                MIPNU
              </span>
              <span className="truncate text-[11px] font-medium tracking-wide text-sidebar-muted uppercase">
                IPNU &amp; IPPNU
              </span>
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Tutup menu"
            onClick={onClose}
            className="ml-auto lg:hidden"
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>

        <div className="border-b border-sidebar-border p-3">
          <OrganizationSwitcher
            organizations={organizations}
            currentOrganizationId={currentOrganizationId}
          />
        </div>

        <nav
          aria-label="Navigasi utama"
          className="scroll-area flex-1 px-3 py-5"
        >
          {groups.map((group, groupIndex) => (
            <div
              key={group.label ?? `group-${groupIndex}`}
              className={groupIndex > 0 ? "mt-6" : undefined}
            >
              {group.label ? (
                <p className="px-3 pb-2 text-[10.5px] font-semibold tracking-[0.09em] text-sidebar-muted uppercase">
                  {group.label}
                </p>
              ) : null}

              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === activeHref;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm",
                          "transition-colors duration-150",
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground ring-1 ring-primary-border ring-inset"
                            : "font-medium text-sidebar-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.9}
                          aria-hidden="true"
                          className={cn("shrink-0", active && "text-primary")}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"
            >
              <ShieldCheck size={16} strokeWidth={1.9} />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[12.5px] font-semibold text-sidebar-foreground">
                MIPNU Platform
              </span>
              <span className="truncate text-[11px] text-sidebar-muted">
                Manajemen Informasi Pelajar NU
              </span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
