export const DOCUMENT_CATEGORIES = [
  "LETTER",
  "PROPOSAL",
  "LPJ",
  "SK",
  "CERTIFICATE",
  "REPORT",
  "EVENT_DOCUMENTATION",
  "OTHER",
] as const;
export const DOCUMENT_VISIBILITIES = [
  "PRIVATE",
  "ORGANIZATION",
  "PUBLIC",
] as const;

export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];
