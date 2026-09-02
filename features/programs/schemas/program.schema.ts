export const PROGRAM_STATUSES = [
  "DRAFT",
  "PLANNED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];
