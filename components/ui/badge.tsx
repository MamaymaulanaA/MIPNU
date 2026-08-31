import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge status.
 *
 * Warna status HANYA dipakai untuk keadaan yang bermakna — bukan untuk
 * membuat tampilan "berwarna-warni". Nada default adalah netral
 * (docs/UI.md §68-§70).
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border",
    "px-2 py-0.5 text-xs font-medium",
  ),
  {
    variants: {
      tone: {
        neutral: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/20 bg-accent text-accent-foreground",
        success: "border-success/20 bg-success-soft text-success",
        warning: "border-warning/20 bg-warning-soft text-warning",
        destructive:
          "border-destructive/20 bg-destructive-soft text-destructive",
        info: "border-info/20 bg-info-soft text-info",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Menampilkan titik berwarna — sinyal kedua selain warna latar. */
    dot?: boolean;
  };

export function Badge({
  className,
  tone,
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      ) : null}
      {children}
    </span>
  );
}

export { badgeVariants };
