import type { CalendarEvent, EventStatus } from "./calendar-event";

export type CalendarOccurrence = CalendarEvent & {
  sourceEvent: CalendarEvent;
  occurrenceKey: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isMatchingDay(date: Date, event: CalendarEvent) {
  const frequency = event.recurrence?.frequency;
  const sourceDate = new Date(event.startAt);

  if (frequency === "daily") return true;
  if (frequency === "weekdays") return date.getDay() >= 1 && date.getDay() <= 5;
  if (frequency === "weekly") return date.getDay() === sourceDate.getDay();
  if (frequency === "monthly") return date.getDate() === sourceDate.getDate();
  return false;
}

function occurrenceStatus(event: CalendarEvent, key: string): EventStatus {
  if (!event.recurrence) return event.status;
  return event.occurrenceStatuses?.[key] ?? "planned";
}

export function expandEvents(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarOccurrence[] {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  return events.flatMap((event) => {
    const sourceStart = new Date(event.startAt);
    const sourceEnd = new Date(event.endAt);
    const duration = sourceEnd.getTime() - sourceStart.getTime();

    if (!event.recurrence) {
      const key = dateKey(sourceStart);
      return [{ ...event, id: `${event.id}:${key}`, sourceEvent: event, occurrenceKey: key }];
    }

    const until = event.recurrence.until ? startOfDay(new Date(`${event.recurrence.until}T00:00:00`)) : end;
    const finalDay = until < end ? until : end;
    const firstDay = start > startOfDay(sourceStart) ? start : startOfDay(sourceStart);
    const occurrences: CalendarOccurrence[] = [];

    for (let cursor = new Date(firstDay); cursor <= finalDay; cursor.setDate(cursor.getDate() + 1)) {
      if (!isMatchingDay(cursor, event)) continue;
      const occurrenceStart = new Date(cursor);
      occurrenceStart.setHours(sourceStart.getHours(), sourceStart.getMinutes(), 0, 0);
      const key = dateKey(occurrenceStart);
      occurrences.push({
        ...event,
        id: `${event.id}:${key}`,
        startAt: occurrenceStart.toISOString(),
        endAt: new Date(occurrenceStart.getTime() + duration).toISOString(),
        status: occurrenceStatus(event, key),
        sourceEvent: event,
        occurrenceKey: key,
      });
    }

    return occurrences;
  });
}
