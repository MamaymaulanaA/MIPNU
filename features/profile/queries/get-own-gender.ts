import "server-only";

import { cache } from "react";

import {
  listAccessibleOrganizations,
  resolveOrganizationId,
} from "@/lib/auth/context";

export const getOwnGender = cache(async (): Promise<"L" | "P" | null> => {
  const [organizations, activeId] = await Promise.all([
    listAccessibleOrganizations(),
    resolveOrganizationId(),
  ]);

  if (!activeId) return null;

  const active = organizations.find(
    (organization) => organization.organizationId === activeId,
  );

  return active?.gender ?? null;
});
