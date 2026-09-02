export const MEETING_STATUSES = [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

export const MEETING_ATTENDANCE = [
  "INVITED",
  "PRESENT",
  "PERMITTED",
  "ABSENT",
] as const;

export type MeetingAttendance = (typeof MEETING_ATTENDANCE)[number];
