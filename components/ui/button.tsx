import { cva, type VariantProps } from "class-variance-authority";

import { TINGGI_KONTROL, TINGGI_KONTROL_IKON } from "@/components/ui/control";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md border border-transparent font-medium",
    "transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        secondary:
          "border-border bg-card text-foreground hover:bg-muted hover:text-foreground active:bg-secondary",
        outline:
          "border-border bg-transparent text-foreground hover:bg-muted active:bg-secondary",
        ghost:
          "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-secondary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: cn(TINGGI_KONTROL, "px-4 text-sm"),
        // Ringkas, dan memang boleh ringkas: aksi kecil di dalam baris tabel,
        // kartu, dan keadaan kosong (docs/UI.md §10). BUKAN untuk aksi utama.
        //
        // Ringkasnya berhenti di ponsel, mengikuti aturan yang sudah dipegang
        // `icon` tepat di bawah ini: 36px nyaman untuk kursor, tetapi di bawah
        // ambang sasaran sentuh jari. Sebelumnya `sm` datar 36px di semua
        // ukuran — satu-satunya ukuran tombol yang melanggar aturan itu.
        sm: cn("h-11 min-[480px]:h-9", "px-3 text-[13px]"),
        lg: "h-12 px-5 text-[15px]",
        icon: cn(TINGGI_KONTROL_IKON, "p-0"),
        iconSm: "size-10 min-[480px]:size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
