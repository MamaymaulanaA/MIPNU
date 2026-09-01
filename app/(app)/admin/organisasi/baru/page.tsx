import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ForbiddenState } from "@/components/feedback/states";
import { CreateOrganizationForm } from "@/features/organizations/components/organization-form";
import { can, requireAccessContext } from "@/lib/auth/context";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Buat Organisasi",
};

export default async function NewOrganizationPage() {
  const context = await requireAccessContext(null);

  if (!can(context, PERMISSIONS.organization.create)) {
    return <ForbiddenState />;
  }

  const supabase = await createClient();

  const [types, levels, parents] = await Promise.all([
    supabase
      .from("organization_types")
      .select("id, code, name")
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("organization_levels")
      .select("id, code, name, hierarchy_rank")
      .eq("is_active", true)
      .order("hierarchy_rank"),
    supabase
      .from("organizations")
      .select("id, name")
      .is("deleted_at", null)
      .eq("status", "ACTIVE")
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Buat Organisasi"
        description="Setelah dibuat, tautkan seorang operator agar organisasi ini dapat mulai dikelola."
      />

      <CreateOrganizationForm
        types={(types.data ?? []).map((type) => ({
          id: type.id,
          label: `${type.code} — ${type.name}`,
        }))}
        levels={(levels.data ?? []).map((level) => ({
          id: level.id,
          label: `${level.code} — ${level.name}`,
        }))}
        parents={(parents.data ?? []).map((parent) => ({
          id: parent.id,
          label: parent.name,
        }))}
      />
    </div>
  );
}
