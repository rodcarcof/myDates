import type { CalendarEvent } from "../domain/calendar-event";

export const demoEvents: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Planificar semana",
    category: "personal",
    startAt: "2026-09-14T08:30:00",
    endAt: "2026-09-14T09:30:00",
    status: "completed",
  },
  {
    id: "event-2",
    title: "Trabajo profundo",
    category: "focus",
    startAt: "2026-09-14T10:00:00",
    endAt: "2026-09-14T12:00:00",
    status: "planned",
  },
  {
    id: "event-3",
    title: "Entrenamiento",
    category: "health",
    startAt: "2026-09-14T18:00:00",
    endAt: "2026-09-14T19:00:00",
    status: "planned",
  },
  {
    id: "event-4",
    title: "Proyecto MyDate",
    category: "work",
    startAt: "2026-09-15T09:00:00",
    endAt: "2026-09-15T11:30:00",
    status: "planned",
  },
  {
    id: "event-5",
    title: "Leer 30 min",
    category: "focus",
    startAt: "2026-09-15T19:00:00",
    endAt: "2026-09-15T19:30:00",
    status: "planned",
  },
];