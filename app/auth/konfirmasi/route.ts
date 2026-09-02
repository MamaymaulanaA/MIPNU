import type { Route } from "next";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["recovery", "invite", "email"];

function safeNext(value: string | null): Route {
  const internal =
    value && value.startsWith("/") && !value.startsWith("//")
      ? value
      : "/atur-ulang-sandi";

  return internal as Route;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const next = safeNext(params.get("next"));

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    redirect("/login?alasan=tautan-tidak-valid" as Route);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/login?alasan=tautan-kedaluwarsa" as Route);
  }

  redirect(next);
}
