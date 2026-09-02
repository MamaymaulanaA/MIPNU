export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 animate-pulse rounded-xs bg-muted" />
          <div className="h-3.5 w-72 animate-pulse rounded-xs bg-muted" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="h-10 w-full max-w-xs animate-pulse rounded-md bg-muted" />
        </div>

        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 px-4 py-3.5 sm:px-5"
            >
              <div className="h-3.5 w-40 animate-pulse rounded-xs bg-muted" />
              <div className="h-3.5 w-24 animate-pulse rounded-xs bg-muted" />
              <div className="ml-auto h-3.5 w-20 animate-pulse rounded-xs bg-muted" />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">Memuat halaman…</span>
    </div>
  );
}
