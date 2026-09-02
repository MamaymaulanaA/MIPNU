export const ATTENDANCE_STATUSES = ["PRESENT", "PERMITTED", "ABSENT"] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const SESSION_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;

export const SESSION_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draf" },
  { value: "OPEN", label: "Dibuka" },
  { value: "CLOSED", label: "Ditutup" },
] as const;
