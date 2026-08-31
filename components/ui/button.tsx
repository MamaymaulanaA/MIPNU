import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

/**
 * Tombol MIPNU.
 *
 * Tinggi default 40px = tinggi field. Tombol dan input pada satu baris
 * otomatis sejajar tanpa penyesuaian manual (docs/UI.md §41).
 *
 * Tanpa gradient, tanpa glow. Perbedaan state adalah warna, bukan bayangan.
 */
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
        // Hover dan active memakai warna tersendiri, bukan opacity: menipiskan
        // biru di atas latar terang justru MEMUDARKANNYA, sehingga tombol
        // terlihat nonaktif tepat ketika ditekan (docs/UI.md §21).
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
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-11 px-5 text-[15px]",
        icon: "size-10 p-0",
        iconSm: "size-8 p-0",
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
    /** Merender elemen anak (mis. `<Link>`) alih-alih `<button>`. */
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
      // Tanpa ini, tombol di dalam form diam-diam men-submit form.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
