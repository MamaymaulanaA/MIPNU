import { cn } from "@/lib/utils";

export function TableScroll({
  className,
  bounded = false,
  ...props
}: React.ComponentProps<"div"> & {
  bounded?: boolean;
}) {
  return (
    <div
      className={cn(
        "scroll-area w-full overflow-x-auto",
        bounded && "max-h-[calc(100dvh-20rem)]",
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead className={cn("sticky top-0 z-10 bg-muted", className)} {...props} />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors last:border-b-0 hover:bg-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap border-b border-border px-4 text-left",
        "text-[13px] font-medium text-muted-foreground",
        "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-foreground",
        "first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5",
        className,
      )}
      {...props}
    />
  );
}
