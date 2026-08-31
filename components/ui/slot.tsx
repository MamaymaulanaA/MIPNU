import { Children, cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
};

type MergeableProps = React.HTMLAttributes<HTMLElement> & {
  className?: string;
};

/**
 * Meneruskan props ke satu-satunya element anak alih-alih membungkusnya
 * dengan element baru.
 *
 * Dipakai pola `asChild`, mis. tombol yang sebenarnya adalah `<Link>`:
 * markup tetap semantik (`<a>`, bukan `<button>` di dalam `<a>`) sementara
 * gaya tombol tetap ikut.
 *
 * Versi minimal — cukup untuk kebutuhan MIPNU sehingga tidak perlu menambah
 * dependency baru hanya untuk ini (SYSTEM.md §115).
 */
export function Slot({ children, className, ...slotProps }: SlotProps) {
  const child = Children.only(children);

  if (!isValidElement<MergeableProps>(child)) return null;

  return cloneElement(child, {
    ...slotProps,
    ...child.props,
    // className digabung, bukan ditimpa: gaya slot dan gaya anak keduanya
    // tetap berlaku, dengan milik anak menang saat bentrok.
    className: cn(className, child.props.className),
  });
}
