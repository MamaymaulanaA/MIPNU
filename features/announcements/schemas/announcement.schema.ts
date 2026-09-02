export const ANNOUNCEMENT_AUDIENCES = ["ALL_MEMBERS", "PENGURUS"] as const;
export const ANNOUNCEMENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
