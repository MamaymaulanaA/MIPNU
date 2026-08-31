"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, UserCircle } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { signOut } from "@/features/auth/actions/sign-out";
import type { AccessibleOrganization } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

/**
 * Kerangka aplikasi: sidebar + header + area konten.
 *
 * Client component karena memegang state drawer mobile. Seluruh pemuatan data
 * dan pemeriksaan authorization tetap terjadi di Server Component pemanggil
 * (SYSTEM.md §11-§12).
 */
export function AppShell({
  permissions,
  organizations,
  currentOrganizationId,
  displayName,
  email,
  avatarUrl,
  gender,
  identity,
  children,
}: {
  permissions: string[];
  organizations: AccessibleOrganization[];
  currentOrganizationId: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  gender: "L" | "P" | null;
  identity: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Drawer ditutup oleh tautan navigasi itu sendiri (AppSidebar memanggil
  // onClose saat item diklik), bukan lewat effect yang memantau pathname —
  // setState di dalam effect memicu render berantai tanpa perlu.

  // Kunci scroll body selama drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-background">
        <AppSidebar
          permissions={permissions}
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* min-w-0 mencegah konten lebar (tabel) mendorong lebar layout. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn(
              "sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-3",
              "border-b border-border bg-background/95 px-4 backdrop-blur sm:px-5 lg:px-6",
            )}
          >
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Buka menu"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu size={18} aria-hidden="true" />
            </Button>

            <div className="ml-auto">
              <UserMenu
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                gender={gender}
                identity={identity}
              />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-5 lg:p-6">{children}</main>

          {/* Penutup halaman. Tahunnya dihitung, bukan dituliskan, supaya
              tidak menjadi angka basi yang harus diingat setiap Januari. */}
          <footer className="border-t border-border px-4 py-3.5 text-center text-[11.5px] text-muted-foreground sm:px-5 lg:px-6">
            © {new Date().getFullYear()} MIPNU · Manajemen Informasi Pelajar
            Nahdlatul Ulama
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}

function UserMenu({
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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-muted"
      >
        {/* Nama pengguna tertulis tepat di sebelahnya, jadi avatar di sini
            dekoratif — lihat catatan aksesibilitas pada component Avatar. */}
        <Avatar
          customUrl={avatarUrl}
          gender={gender}
          identity={identity}
          size="sm"
        />
        <span className="hidden max-w-40 truncate text-[13px] font-medium text-foreground sm:block">
          {displayName}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-40 mt-1 w-60 rounded-md border border-border bg-popover p-1",
            "shadow-floating",
          )}
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-foreground">
              {displayName}
            </p>
            {email ? (
              <p className="truncate text-[12px] text-muted-foreground">
                {email}
              </p>
            ) : null}
          </div>

          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              "mt-1 flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px]",
              "text-muted-foreground transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
            )}
          >
            <UserCircle size={16} aria-hidden="true" />
            Profil Saya
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px]",
                "text-muted-foreground transition-colors duration-150",
                "hover:bg-destructive-soft hover:text-destructive",
              )}
            >
              <LogOut size={16} aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
