export const INCOMING_STATUSES = ["RECEIVED", "PROCESSED", "ARCHIVED"] as const;
export const OUTGOING_STATUSES = [
  "DRAFT",
  "APPROVED",
  "SENT",
  "ARCHIVED",
] as const;

export type OutgoingStatus = (typeof OUTGOING_STATUSES)[number];
