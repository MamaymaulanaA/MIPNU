export type Aksen = "blue" | "cyan" | "purple" | "amber" | "rose" | "slate";

export const AKSEN: Record<Aksen, string> = {
  blue: "hsl(var(--primary))",
  cyan: "hsl(var(--accent-cyan))",
  purple: "hsl(var(--accent-purple))",
  amber: "hsl(var(--accent-amber))",
  rose: "hsl(var(--accent-rose))",
  slate: "hsl(var(--accent-slate))",
};

export const WADAH: Record<Aksen, string> = {
  blue: "bg-primary-soft text-primary",
  cyan: "bg-accent-cyan-soft text-accent-cyan",
  purple: "bg-accent-purple-soft text-accent-purple",
  amber: "bg-accent-amber-soft text-accent-amber",
  rose: "bg-accent-rose-soft text-accent-rose",
  slate: "bg-accent-slate-soft text-accent-slate",
};

export const URUTAN_AKSEN: Aksen[] = [
  "blue",
  "cyan",
  "purple",
  "amber",
  "rose",
  "slate",
];
