import "server-only";

export type ParamDaftar<K extends string = never> = {
  cari: string;
  halaman: number;
  dari: number;
  sampai: number;
  saring: Record<K, string>;
};

function satuNilai(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export function bacaParamDaftar<const K extends string = never>(
  params: Record<string, string | string[] | undefined>,
  {
    ukuranHalaman,
    kunciSaring = [] as unknown as readonly K[],
  }: { ukuranHalaman: number; kunciSaring?: readonly K[] },
): ParamDaftar<K> {
  const halaman = Math.max(1, Math.floor(Number(satuNilai(params.page)) || 1));
  const dari = (halaman - 1) * ukuranHalaman;

  return {
    cari: satuNilai(params.search).trim(),
    halaman,
    dari,
    sampai: dari + ukuranHalaman - 1,
    saring: Object.fromEntries(
      kunciSaring.map((kunci) => [kunci, satuNilai(params[kunci])]),
    ) as Record<K, string>,
  };
}

export function polaCari(cari: string): string {
  return `%${cari.replace(/[%_\\]/g, "\\$&")}%`;
}

export function polaCariOr(cari: string): string {
  return cari.replace(/[%_\\(),]/g, "");
}
