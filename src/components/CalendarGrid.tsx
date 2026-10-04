import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { CalendarEvent } from "../domain/calendar-event";
import type { Workspace } from "../domain/workspace";
import type { CalendarCategory } from "../domain/calendar-category";
import { expandEvents, type CalendarOccurrence } from "../domain/recurrence";
import type { CalendarView } from "./CalendarToolbar";

type CalendarGridProps = {
  selectedView: CalendarView;
  events: CalendarEvent[];
  onToggleCompletion: (
    eventId: string,
    occurrenceKey: string,
    origin: { x: number; y: number },
  ) => void;
  onEditEvent: (event: CalendarEvent) => void;
  startHour: number;
  endHour: number;
  calendarStartDate: Date;
  onMoveEvent: (eventId: string, startAt: string) => void;
  onResizeEvent: (eventId: string, startAt: string, endAt: string) => void;
  workspaces: Workspace[];
  categories: CalendarCategory[];
  isWidget?: boolean;
  onToggleTimer?: (eventId: string, occurrenceKey: string) => void;
};

type DragState = { eventId: string; sourceEvent: CalendarEvent; durationHours: number; offsetY: number; originX: number; originY: number; moved: boolean };
type DragPreview = { dayIndex: number; startHour: number };
type ResizeEdge = "start" | "end";
type ResizeState = { eventId: string; edge: ResizeEdge; startDate: Date; endDate: Date };
type ResizePreview = { eventId: string; startHour: number; endHour: number; startAt: string; endAt: string };

const HEADER_HEIGHT = 52;

const daysByView: Record<CalendarView, number> = {
  day: 1,
  "three-days": 3,
  "five-days": 5,
  week: 7,
};

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function createUpcomingDays(startDate = new Date()) {
  const today = startOfDay(startDate);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    const weekday = date
      .toLocaleDateString("es-CL", { weekday: "short" })
      .replace(".", "");

    return {
      date,
      name: weekday.charAt(0).toUpperCase() + weekday.slice(1),
      dayOfMonth: date.getDate(),
    };
  });
}

function getDayIndex(eventDate: Date, calendarStartDate: Date) {
  const eventDay = startOfDay(eventDate);
  const startDay = startOfDay(calendarStartDate);

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (eventDay.getTime() - startDay.getTime()) / millisecondsPerDay,
  );
}

function getHourValue(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timerForOccurrence(event: CalendarEvent, occurrenceKey: string) {
  if (event.recurrence) return event.occurrenceTimers?.[occurrenceKey] ?? { elapsedSeconds: 0 };
  return { elapsedSeconds: event.timerElapsedSeconds ?? 0, startedAt: event.timerStartedAt };
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

type OverlapPlacement = { column: number; columns: number };

function layoutOverlappingEvents(events: CalendarOccurrence[]) {
  const placements = new Map<string, OverlapPlacement>();
  const sortedEvents = [...events].sort((first, second) =>
    new Date(first.startAt).getTime() - new Date(second.startAt).getTime()
    || new Date(first.endAt).getTime() - new Date(second.endAt).getTime(),
  );
  let group: CalendarOccurrence[] = [];
  let groupEnd = -Infinity;

  function placeGroup() {
    const active: { event: CalendarOccurrence; column: number }[] = [];
    const provisional = new Map<string, number>();
    let columnCount = 0;

    for (const event of group) {
      const start = new Date(event.startAt).getTime();
      for (let index = active.length - 1; index >= 0; index -= 1) {
        if (new Date(active[index].event.endAt).getTime() <= start) active.splice(index, 1);
      }
      const usedColumns = new Set(active.map((item) => item.column));
      let column = 0;
      while (usedColumns.has(column)) column += 1;
      provisional.set(event.id, column);
      active.push({ event, column });
      columnCount = Math.max(columnCount, column + 1);
    }

    for (const event of group) placements.set(event.id, { column: provisional.get(event.id) ?? 0, columns: columnCount });
  }

  for (const event of sortedEvents) {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();
    if (group.length > 0 && start >= groupEnd) {
      placeGroup();
      group = [];
      groupEnd = -Infinity;
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length > 0) placeGroup();
  return placements;
}

function CalendarGrid({
  selectedView,
  events,
  onToggleCompletion,
  onEditEvent,
  startHour: visibleStartHour,
  endHour: visibleEndHour,
  calendarStartDate,
  onMoveEvent,
  onResizeEvent,
  categories,
  isWidget = false,
  onToggleTimer,
}: CalendarGridProps) {
  const upcomingDays = createUpcomingDays(calendarStartDate);
  const eventLayerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const suppressContentClickRef = useRef(false);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());

  const visibleDays = upcomingDays.slice(
    0,
    daysByView[selectedView],
  );

  const hours = Array.from(
    { length: visibleEndHour - visibleStartHour + 1 },
    (_, index) => visibleStartHour + index,
  );
  // El widget no debe encoger las horas para intentar mostrar el día entero:
  // mantiene bloques legibles y el contenedor permite desplazarse con la rueda.
  const hourHeight = isWidget ? 72 : 52;

  useEffect(() => {
    if (!isWidget || !events.some((event) => event.timerStartedAt || Object.values(event.occurrenceTimers ?? {}).some((timer) => timer.startedAt))) return;
    setTimerNow(Date.now());
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [events, isWidget]);

  const visibleEvents = expandEvents(
    events,
    upcomingDays[0].date,
    visibleDays[visibleDays.length - 1].date,
  ).filter((event) => {
    const eventDay = getDayIndex(
      new Date(event.startAt),
      upcomingDays[0].date,
    );

    const startHour = getHourValue(new Date(event.startAt));
    const endHour = getHourValue(new Date(event.endAt));

    return eventDay >= 0 && eventDay < visibleDays.length && startHour < visibleEndHour + 1 && endHour > visibleStartHour;
  });

  function getDropPosition(clientX: number, clientY: number, drag: DragState) {
    const layer = eventLayerRef.current;
    if (!layer) return null;
    const bounds = layer.getBoundingClientRect();
    const dayIndex = Math.max(0, Math.min(visibleDays.length - 1, Math.floor((clientX - bounds.left) / (bounds.width / visibleDays.length))));
    const maximumStartHour = Math.max(visibleStartHour, visibleEndHour + 1 - drag.durationHours);
    const rawStartHour = visibleStartHour + (clientY - bounds.top - drag.offsetY) / hourHeight;
    const startHour = Math.max(visibleStartHour, Math.min(maximumStartHour, Math.round(rawStartHour * 4) / 4));
    const startDate = new Date(visibleDays[dayIndex].date);
    startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    return { startAt: startDate.toISOString(), dayIndex, startHour };
  }

  function finishDrag(clientX: number, clientY: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const position = getDropPosition(clientX, clientY, drag);
    if (drag.moved && position) onMoveEvent(drag.eventId, position.startAt);
    if (!drag.moved) onEditEvent(drag.sourceEvent);
    suppressContentClickRef.current = true;
    dragRef.current = null;
    setDraggedEventId(null);
    setDragPreview(null);
  }

  function getResizePreview(clientY: number, resize: ResizeState): ResizePreview | null {
    const layer = eventLayerRef.current;
    if (!layer) return null;
    const bounds = layer.getBoundingClientRect();
    const requestedHour = Math.round((visibleStartHour + (clientY - bounds.top) / hourHeight) * 4) / 4;
    const originalStartHour = getHourValue(resize.startDate);
    const originalEndHour = getHourValue(resize.endDate);
    const minimumDuration = 0.25;
    const startHour = resize.edge === "start"
      ? Math.max(visibleStartHour, Math.min(originalEndHour - minimumDuration, requestedHour))
      : originalStartHour;
    const endHour = resize.edge === "end"
      ? Math.min(visibleEndHour + 1, Math.max(originalStartHour + minimumDuration, requestedHour))
      : originalEndHour;
    const startDate = new Date(resize.startDate);
    const endDate = new Date(resize.endDate);
    startDate.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);
    endDate.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
    return { eventId: resize.eventId, startHour, endHour, startAt: startDate.toISOString(), endAt: endDate.toISOString() };
  }

  function finishResize(clientY: number) {
    const resize = resizeRef.current;
    if (!resize) return;
    const preview = getResizePreview(clientY, resize);
    if (preview) onResizeEvent(resize.eventId, preview.startAt, preview.endAt);
    resizeRef.current = null;
    setResizePreview(null);
  }

  useEffect(() => {
    function moveDraggedEvent(event: PointerEvent) {
      const resize = resizeRef.current;
      if (resize) {
        const preview = getResizePreview(event.clientY, resize);
        if (preview) setResizePreview(preview);
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      if (Math.abs(event.clientX - drag.originX) > 5 || Math.abs(event.clientY - drag.originY) > 5) drag.moved = true;
      const position = getDropPosition(event.clientX, event.clientY, drag);
      if (position) setDragPreview(position);
    }

    function dropDraggedEvent(event: PointerEvent) {
      if (resizeRef.current) {
        finishResize(event.clientY);
        return;
      }
      finishDrag(event.clientX, event.clientY);
    }
    window.addEventListener("pointermove", moveDraggedEvent);
    window.addEventListener("pointerup", dropDraggedEvent);
    return () => {
      window.removeEventListener("pointermove", moveDraggedEvent);
      window.removeEventListener("pointerup", dropDraggedEvent);
    };
  }, [onMoveEvent, visibleDays, visibleEndHour, visibleStartHour]);

  function startDrag(event: ReactPointerEvent<HTMLElement>, sourceEvent: CalendarEvent, durationHours: number, isRecurring: boolean) {
    if (isRecurring || event.button !== 0 || (event.target as HTMLElement).closest(".event-complete-button, .event-resize-handle")) return;
    const block = event.currentTarget.getBoundingClientRect();
    dragRef.current = { eventId: sourceEvent.id, sourceEvent, durationHours, offsetY: event.clientY - block.top, originX: event.clientX, originY: event.clientY, moved: false };
    setDraggedEventId(sourceEvent.id);
    setDragPreview(null);
  }

  function startResize(event: ReactPointerEvent<HTMLElement>, eventId: string, edge: ResizeEdge, startDate: Date, endDate: Date, isRecurring: boolean) {
    if (isRecurring || event.button !== 0) return;
    resizeRef.current = { eventId, edge, startDate, endDate };
    setResizePreview({ eventId, startHour: getHourValue(startDate), endHour: getHourValue(endDate), startAt: startDate.toISOString(), endAt: endDate.toISOString() });
    event.preventDefault();
  }

  function startEventInteraction(event: ReactPointerEvent<HTMLElement>, sourceEvent: CalendarEvent, durationHours: number, startDate: Date, endDate: Date, isRecurring: boolean) {
    if (isRecurring || (event.target as HTMLElement).closest(".event-complete-button")) return;
    const block = event.currentTarget.getBoundingClientRect();
    const edgeThreshold = 14;
    const positionInBlock = event.clientY - block.top;
    if (positionInBlock <= edgeThreshold) {
      startResize(event, sourceEvent.id, "start", startDate, endDate, false);
      return;
    }
    if (positionInBlock >= block.height - edgeThreshold) {
      startResize(event, sourceEvent.id, "end", startDate, endDate, false);
      return;
    }
    startDrag(event, sourceEvent, durationHours, false);
  }

  return (
    <section className="calendar-wrapper">
      <div
        className="calendar-grid"
        style={
          {
            "--header-height": `${HEADER_HEIGHT}px`,
            "--hour-height": `${hourHeight}px`,
            gridTemplateColumns: `48px repeat(${visibleDays.length}, minmax(0, 1fr))`,
            gridTemplateRows: `${HEADER_HEIGHT}px repeat(${hours.length}, ${hourHeight}px)`,
          } as CSSProperties
        }
      >
        <div className="calendar-corner" />

        {visibleDays.map((day) => (
          <div key={day.date.toISOString()} className="day-header">
            <span>{day.name}</span>
            <strong>{day.dayOfMonth}</strong>
          </div>
        ))}

        {hours.map((hour) => (
          <Fragment key={hour}>
            <div className="time-label">
              {String(hour).padStart(2, "0")}:00
            </div>

            {visibleDays.map((day) => (
              <div
                key={`${day.date.toISOString()}-${hour}`}
                className="calendar-cell"
              />
            ))}
          </Fragment>
        ))}

        <div
          ref={eventLayerRef}
          className="event-layer"
          style={{
            gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleDays.map((day, dayIndex) => {
            const dayEvents = visibleEvents.filter(
              (event) => getDayIndex(new Date(event.startAt), upcomingDays[0].date) === dayIndex,
            );
            const overlapLayout = layoutOverlappingEvents(dayEvents);

            return <div className="event-day" key={day.date.toISOString()}>
              {dayEvents.map((event) => {
                  const startDate = new Date(event.startAt);
                  const endDate = new Date(event.endAt);
                  const activeResize = resizePreview?.eventId === event.sourceEvent.id ? resizePreview : null;
                  const startHour = Math.max(activeResize?.startHour ?? getHourValue(startDate), visibleStartHour);
                  const endHour = Math.min(activeResize?.endHour ?? getHourValue(endDate), visibleEndHour + 1);
                  const durationHours = endHour - startHour;
                  const placement = overlapLayout.get(event.id) ?? { column: 0, columns: 1 };
                  const columnWidth = 100 / placement.columns;
                  const category = categories.find((item) => item.id === event.sourceEvent.categoryId) ?? categories.find((item) => item.name === event.category);
                  const isShort = durationHours * hourHeight < 48;

                  return (
                    <article
                      key={event.id}
                      className={`calendar-event event-${event.category} event-${event.status}${isShort ? " is-short" : ""}${draggedEventId === event.sourceEvent.id ? " is-dragging" : ""}${event.sourceEvent.recurrence ? " is-recurring" : ""}`}
                      style={{
                        left: `calc(${placement.column * columnWidth}% + 4px)`,
                        right: "auto",
                        width: `calc(${columnWidth}% - 8px)`,
                        top: `${(startHour - visibleStartHour) * hourHeight + 4}px`,
                        height: `${isWidget ? Math.max(durationHours * hourHeight - 8, 64) : Math.max(durationHours * hourHeight - 8, 36)}px`,
                        ...((category?.color ?? event.categoryColor) && event.status !== "completed" ? { backgroundColor: category?.color ?? event.categoryColor } : {}),
                      }}
                      onPointerDown={(pointerEvent) => startEventInteraction(pointerEvent, event.sourceEvent, durationHours, startDate, endDate, Boolean(event.sourceEvent.recurrence))}
                      onPointerUp={(pointerEvent) => {
                        if (resizeRef.current) finishResize(pointerEvent.clientY);
                        else finishDrag(pointerEvent.clientX, pointerEvent.clientY);
                      }}
                      onClick={() => {
                        if (suppressContentClickRef.current) {
                          suppressContentClickRef.current = false;
                          return;
                        }
                        onEditEvent(event.sourceEvent);
                      }}
                      title={event.sourceEvent.recurrence ? "Las tareas repetitivas usarán excepciones de movimiento próximamente" : "Arrastra para reprogramar"}
                    >
                      <button
                        type="button"
                        className="event-content-button"
                        aria-label={`Editar: ${event.title}`}
                        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                        onPointerUp={(pointerEvent) => {
                          pointerEvent.stopPropagation();
                          onEditEvent(event.sourceEvent);
                        }}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onEditEvent(event.sourceEvent);
                        }}
                      >
                        <strong>{event.title}</strong>
                        <span>{formatTime(startDate)} – {formatTime(endDate)}</span>
                      </button>
                      {isWidget && event.status !== "completed" && onToggleTimer && (() => {
                        const timer = timerForOccurrence(event.sourceEvent, event.occurrenceKey);
                        const elapsed = timer.elapsedSeconds + (timer.startedAt ? Math.max(0, Math.floor((timerNow - new Date(timer.startedAt).getTime()) / 1000)) : 0);
                        const planned = Math.max(0, Math.round((new Date(event.sourceEvent.endAt).getTime() - new Date(event.sourceEvent.startAt).getTime()) / 1000));
                        const isRunning = Boolean(timer.startedAt);
                        return <div className="widget-timer-row" onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()} onPointerUp={(pointerEvent) => pointerEvent.stopPropagation()}>
                          <button type="button" className={`widget-timer-toggle${isRunning ? " is-running" : ""}`} aria-label={`${isRunning ? "Pausar" : "Iniciar"} cronómetro: ${event.title}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); onToggleTimer(event.sourceEvent.id, event.occurrenceKey); }}>
                            <span aria-hidden="true">{isRunning ? "Ⅱ" : "▶"}</span>{isRunning ? "Pausar" : elapsed > 0 ? "Seguir" : "Iniciar"}
                          </button>
                          <output className="widget-timer-readout">{formatDuration(elapsed)} / {formatDuration(planned)}</output>
                        </div>;
                      })()}
                      <button
                        type="button"
                        className="event-complete-button"
                        aria-label={
                          event.status === "completed"
                            ? `Marcar como pendiente: ${event.title}`
                            : `Completar: ${event.title}`
                        }
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          const rect = clickEvent.currentTarget.getBoundingClientRect();

                          onToggleCompletion(event.sourceEvent.id, event.occurrenceKey, {
                            x: rect.left + rect.width / 2,
                            y: rect.top + rect.height / 2,
                          });
                        }}
                      >
                        {event.status === "completed" ? "✓" : ""}
                      </button>
                    </article>
                  );
                })}
            </div>;
          })}
          {dragPreview && dragRef.current && (
            <article
              className="calendar-drag-ghost"
              style={{
                left: `calc(${dragPreview.dayIndex * (100 / visibleDays.length)}% + 5px)`,
                width: `calc(${100 / visibleDays.length}% - 10px)`,
                top: `${(dragPreview.startHour - visibleStartHour) * hourHeight + 4}px`,
                height: `${dragRef.current.durationHours * hourHeight - 8}px`,
              }}
            >
              Soltar para reprogramar
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

export default CalendarGrid;
