import { redirect } from "next/navigation";

/**
 * MIPNU belum memiliki halaman publik. Pintu masuknya adalah dashboard;
 * middleware yang mengalihkan pengunjung anonim ke /login.
 *
 * Public Portal adalah Phase 5 dan akan mendapat route grup sendiri.
 */
export default function RootPage() {
  redirect("/dashboard");
}
