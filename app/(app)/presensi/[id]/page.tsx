import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ForbiddenState } from "@/components/feedback/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AttendanceRoster,
  SelfCheckInButton,
  SessionFormDialog,
} from "@/features/attendance/components/attendance-panels";
import { QrPanel } from "@/features/attendance/components/qr-panel";
import { exportAttendance } from "@/features/exports/actions/export-csv";
import { ExportButton } from "@/features/exports/components/export-button";
import { getAttendanceSession } from "@/features/attendance/queries/get-session";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sesi Presensi",
};

const SESSION_STATUS = {
  DRAFT: { label: "Draf", tone: "neutral" },
  OPEN: { label: "Dibuka", tone: "success" },
  CLOSED: { label: "Ditutup", tone: "neutral" },
} as const;

export default async function AttendanceSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAccessContext();

  if (!context.organizationId) return <ForbiddenState />;

  const canView = can(context, PERMISSIONS.attendance.view);
  const canViewOwn = can(context, PERMISSIONS.attendance.viewOwn);
  if (!canView && !canViewOwn) return <ForbiddenState />;

  const session = await getAttendanceSession(id, context.organizationId);
  if (!session) notFound();

  const status =
    SESSION_STATUS[session.status as keyof typeof SESSION_STATUS] ??
    SESSION_STATUS.DRAFT;

  const canManage = can(context, PERMISSIONS.attendance.manage);

  const ownRecord = context.memberId
    ? session.roster.find((row) => row.memberId === context.memberId)
    : undefined;

  const presentCount = session.roster.filter(
    (row) => row.status === "PRESENT",
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={session.name}
        description={session.eventName}
        actions={
          <>
            {context.memberId &&
            can(context, PERMISSIONS.attendance.checkIn) ? (
              <SelfCheckInButton
                organizationId={context.organizationId}
                sessionId={session.id}
                alreadyRecorded={Boolean(ownRecord?.status)}
                sessionOpen={session.isOpen}
              />
            ) : null}

            {can(context, PERMISSIONS.attendance.export) ? (
              <ExportButton
                label="Ekspor"
                action={exportAttendance.bind(
                  null,
                  context.organizationId,
                  session.id,
                )}
              />
            ) : null}

            {can(context, PERMISSIONS.attendance.editSession) ? (
              <SessionFormDialog
                organizationId={context.organizationId}
                events={[{ id: session.eventId, label: session.eventName }]}
                triggerVariant="secondary"
                session={{
                  id: session.id,
                  eventId: session.eventId,
                  name: session.name,
                  openAt: session.openAt,
                  closeAt: session.closeAt,
                  status: session.status,
                }}
              />
            ) : null}
          </>
        }
      />

      {canManage ? (
        <QrPanel
          organizationId={context.organizationId}
          sessionId={session.id}
          hasActiveToken={session.hasActiveQrToken}
          expiresAt={session.qrExpiresAt}
        />
      ) : null}

      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Daftar Hadir</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              {formatNumber(presentCount)} hadir dari{" "}
              {formatNumber(session.roster.length)} peserta
              {session.openAt
                ? ` · dibuka ${formatDateTime(session.openAt)}`
                : ""}
            </p>
          </div>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </CardHeader>

        {session.roster.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Belum ada peserta event"
            description="Daftar hadir mengikuti peserta event. Tambahkan peserta pada halaman event terlebih dahulu."
          />
        ) : canView ? (
          <AttendanceRoster
            organizationId={context.organizationId}
            sessionId={session.id}
            rows={session.roster}
            canManage={canManage}
          />
        ) : (
          <AttendanceRoster
            organizationId={context.organizationId}
            sessionId={session.id}
            rows={ownRecord ? [ownRecord] : []}
            canManage={false}
          />
        )}
      </Card>
    </div>
  );
}
