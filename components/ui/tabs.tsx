import Link from "next/link";
import type { Route } from "next";

import { TINGGI_KONTROL } from "@/components/ui/control";
import { cn } from "@/lib/utils";

export type PageTabItem = {
  href: string;
  label: string;
  active: boolean;
};

export function PageTabs({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly PageTabItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "scroll-none border-b border-border px-4 sm:px-5",
        className,
      )}
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                TINGGI_KONTROL,
                "-mb-px inline-flex items-center border-b-2 px-3 text-[13px] font-medium transition-colors",
                item.active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
