export type EventCategory = string;

export type EventStatus = "planned" | "completed";

export type RecurrenceFrequency = "daily" | "weekdays" | "weekly" | "monthly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  until?: string;
};

export type EventTimer = {
  elapsedSeconds: number;
  startedAt?: string;
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
  workspaceId?: string;
  categoryId?: string;
  categoryColor?: string;
  reminderEnabled?: boolean;
  reminderNotifiedAt?: Record<string, string>;
  /** Segundos acumulados cuando el cronómetro está pausado. */
  timerElapsedSeconds?: number;
  /** Fecha de inicio del tramo que está corriendo; ausente significa pausado. */
  timerStartedAt?: string;
  /** Cronómetros separados para cada ocurrencia de un bloque repetitivo. */
  occurrenceTimers?: Record<string, EventTimer>;
};
