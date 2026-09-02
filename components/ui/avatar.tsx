import { getAvatarPresentation, type StoredGender } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
  xl: "size-16",
  "2xl": "size-24",
} as const;

export type AvatarSize = keyof typeof SIZES;

export function Avatar({
  customUrl,
  gender,
  identity,
  size = "md",
  label,
  className,
}: {
  customUrl?: string | null;
  gender?: StoredGender;
  identity?: string | null;
  size?: AvatarSize;
  label?: string;
  className?: string;
}) {
  const { src } = getAvatarPresentation({ customUrl, gender, identity });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      className={cn(
        "shrink-0 rounded-full border border-border bg-primary-soft object-cover",
        SIZES[size],
        className,
      )}
    />
  );
}
