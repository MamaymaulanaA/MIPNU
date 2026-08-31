import { cn } from "@/lib/utils";

/**
 * Primitive form MIPNU.
 *
 * Field TIDAK PERNAH memakai bayangan. Pembeda state hanya border 1px —
 * hover, fokus, dan error dibedakan warna border, bukan glow (docs/UI.md §48-§52).
 *
 * Tinggi 40px, sama dengan tombol.
 */

const controlBase = cn(
  "w-full rounded-md border border-border bg-card text-sm text-foreground",
  "transition-colors duration-150",
  "placeholder:text-muted-foreground/70",
  "hover:border-muted-foreground/40",
  "focus:border-primary focus:outline-none",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
  "aria-[invalid=true]:border-destructive",
);

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input className={cn(controlBase, "h-10 px-3", className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        controlBase,
        "min-h-22 resize-y px-3 py-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlBase,
        "h-10 cursor-pointer appearance-none bg-no-repeat py-0 pr-8 pl-3",
        // Chevron sebagai data-URI: menghindari satu request aset untuk ikon
        // sekecil ini, dan mewarisi warna netral tema.
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        "bg-[position:right_0.75rem_center]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
          <span className="sr-only"> (wajib diisi)</span>
        </>
      ) : null}
    </label>
  );
}

export function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className={cn("text-[13px] text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * Pembungkus satu field: label, kontrol, hint, error.
 *
 * Label selalu terlihat — placeholder bukan pengganti label (SYSTEM.md §75).
 */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error ? <FieldHint>{hint}</FieldHint> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
