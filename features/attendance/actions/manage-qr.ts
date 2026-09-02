"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";

import {
  requireAccessContext,
  requireOrganizationPermission,
} from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ForbiddenError, fail, ok, type ActionResult } from "@/lib/errors";
import { databaseFailure } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { recordAudit } from "@/services/audit/record";

export type IssuedQr = {
  checkInUrl: string;
  svg: string;
  expiresAt: string;
};

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function issueAttendanceQr(
  organizationId: string,
  sessionId: string,
  validMinutes = 720,
): Promise<ActionResult<IssuedQr>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.manage,
    );

    const token = randomBytes(32).toString("base64url");

    const supabase = await createClient();

    const { error } = await supabase.rpc("mipnu_issue_attendance_qr", {
      p_session_id: sessionId,
      p_token: token,
      p_valid_minutes: validMinutes,
    });

    if (error) return databaseFailure(error);

    const checkInUrl = `${siteUrl()}/presensi/hadir?t=${encodeURIComponent(token)}`;

    const svg = await QRCode.toString(checkInUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "attendance.qr_issued",
      resourceType: "attendance_session",
      resourceId: sessionId,
      metadata: { valid_minutes: validMinutes },
    });

    revalidatePath(`/presensi/${sessionId}`);

    return ok({
      checkInUrl,
      svg,
      expiresAt: new Date(Date.now() + validMinutes * 60_000).toISOString(),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function revokeAttendanceQr(
  organizationId: string,
  sessionId: string,
): Promise<ActionResult<void>> {
  try {
    const context = await requireOrganizationPermission(
      organizationId,
      PERMISSIONS.attendance.manage,
    );

    const supabase = await createClient();

    const { error } = await supabase.rpc("mipnu_revoke_attendance_qr", {
      p_session_id: sessionId,
    });

    if (error) return databaseFailure(error);

    await recordAudit({
      actorProfileId: context.profileId,
      organizationId,
      action: "attendance.qr_revoked",
      resourceType: "attendance_session",
      resourceId: sessionId,
    });

    revalidatePath(`/presensi/${sessionId}`);

    return ok();
  } catch (error) {
    return fail(error);
  }
}

export type CheckInOutcome = {
  ok: boolean;
  reason:
    | "OK"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "SESSION_CLOSED"
    | "NOT_ELIGIBLE"
    | "ALREADY_RECORDED";
  sessionName: string | null;
  sessionId: string | null;
};

/**
 * Menukar token QR menjadi catatan kehadiran.
 *
 * Seluruh validasi terjadi di dalam `mipnu_check_in_with_token()`: keaslian
 * token, masa berlaku, status sesi, keanggotaan organisasi, permission, dan
 * duplikasi. Server action ini hanya memastikan pemanggilnya sudah login dan
 * menerjemahkan hasilnya.
 */
export async function checkInWithToken(
  token: string,
): Promise<ActionResult<CheckInOutcome>> {
  try {
    const context = await requireAccessContext();
    if (!context) throw new ForbiddenError("unauthenticated");

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("mipnu_check_in_with_token", {
      p_token: token,
    });

    if (error) return databaseFailure(error);

    const payload = data as unknown as {
      ok: boolean;
      reason?: string;
      session_id?: string;
      session_name?: string;
    };

    const outcome: CheckInOutcome = {
      ok: payload.ok,
      reason: payload.ok
        ? "OK"
        : ((payload.reason ?? "INVALID_TOKEN") as CheckInOutcome["reason"]),
      sessionName: payload.session_name ?? null,
      sessionId: payload.session_id ?? null,
    };

    if (outcome.ok && outcome.sessionId) {
      revalidatePath(`/presensi/${outcome.sessionId}`);
    }

    return ok(outcome);
  } catch (error) {
    return fail(error);
  }
}
