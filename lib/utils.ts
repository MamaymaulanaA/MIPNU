import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan className bersyarat sekaligus meredam konflik utility Tailwind
 * (kelas terakhir menang). Dipakai seluruh component UI.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
