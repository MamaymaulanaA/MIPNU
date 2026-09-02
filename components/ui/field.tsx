import { TINGGI_KONTROL } from "@/components/ui/control";
import { cn } from "@/lib/utils";

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
    <input
      className={cn(controlBase, TINGGI_KONTROL, "px-3", className)}
      {...props}
    />
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
        TINGGI_KONTROL,
        "cursor-pointer appearance-none py-0 pr-8 pl-3",
        "select-chevron",
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
