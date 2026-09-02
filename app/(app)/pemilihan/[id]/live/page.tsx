import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParticipationView } from "@/features/elections/components/participation-view";
import { ResultView } from "@/features/elections/components/result-view";
import {
  getElection,
  getElectionResult,
  getParticipation,
} from "@/features/elections/queries/get-election";
import { requireAccessContext } from "@/lib/auth/context";
import { formatDateTime } from "@/lib/format";
import { electionStatus } from "@/lib/status";

export const metadata: Metadata = {
  title: "Partisipasi Langsung",
};

export default async function ElectionLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId) return <ForbiddenState />;

  const election = await getElection(id);
  if (!election) notFound();

  const participation = await getParticipation(id);
  if (!participation) return <ForbiddenState />;

  const { result } = await getElectionResult(id);
  const resmi = result?.official ?? false;

  const status = electionStatus(election.status);
  const live =
    election.status === "OPEN" &&
    new Date(election.startAt) <= new Date() &&
    new Date(election.endAt) >= new Date();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl flex-col justify-center gap-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/pemilihan/${id}` as Route}>
            <ArrowLeft size={15} aria-hidden="true" />
            Kembali
          </Link>
        </Button>

        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>

      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          {election.name}
        </h1>
        <p className="text-[13px] text-muted-foreground sm:text-base">
          {formatDateTime(election.startAt)} – {formatDateTime(election.endAt)}
        </p>
      </header>

      <ParticipationView
        electionId={id}
        participation={participation}
        live={live}
        fullscreen
      />

      {resmi ? (
        <section aria-label="Hasil resmi" className="text-left">
          <ResultView result={result} reason={null} />
        </section>
      ) : (
        <p className="text-center text-[13px] text-muted-foreground">
          Perolehan suara tiap kandidat tidak ditampilkan selama pemungutan
          suara berlangsung.
        </p>
      )}
    </div>
  );
}
