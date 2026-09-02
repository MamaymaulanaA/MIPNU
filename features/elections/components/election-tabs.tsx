import { PageTabs } from "@/components/ui/tabs";

export const ELECTION_TABS = [
  "ringkasan",
  "kandidat",
  "dpt",
  "panitia",
  "partisipasi",
  "hasil",
  "audit",
] as const;

export type ElectionTab = (typeof ELECTION_TABS)[number];

const TAB_LABEL: Record<ElectionTab, string> = {
  ringkasan: "Ringkasan",
  kandidat: "Kandidat",
  dpt: "DPT",
  panitia: "Panitia",
  partisipasi: "Partisipasi",
  hasil: "Hasil",
  audit: "Audit",
};

export function parseTab(value: string | undefined): ElectionTab {
  return ELECTION_TABS.includes(value as ElectionTab)
    ? (value as ElectionTab)
    : "ringkasan";
}

export function ElectionTabs({
  electionId,
  active,
  visible,
}: {
  electionId: string;
  active: ElectionTab;
  visible: readonly ElectionTab[];
}) {
  return (
    <PageTabs
      label="Bagian pemilihan"
      items={visible.map((tab) => ({
        href: `/pemilihan/${electionId}${
          tab === "ringkasan" ? "" : `?tab=${tab}`
        }`,
        label: TAB_LABEL[tab],
        active: tab === active,
      }))}
    />
  );
}
