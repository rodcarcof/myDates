export type EventCategory =
  | "focus"
  | "work"
  | "health"
  | "personal";

export type EventStatus = "planned" | "completed";

export type RecurrenceFrequency = "daily" | "weekdays" | "weekly" | "monthly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  until?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  category: EventCategory;
  startAt: string;
  endAt: string;
  status: EventStatus;
  recurrence?: RecurrenceRule;
  occurrenceStatuses?: Record<string, EventStatus>;
};
