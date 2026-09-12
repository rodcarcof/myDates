import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader";
import CalendarGrid from "./components/CalendarGrid";
import CalendarSettings from "./components/CalendarSettings";
import TasksPanel from "./components/TasksPanel";
import NewEventDialog, {
  type NewEventInput,
} from "./components/NewEventDialog";
import SidebarRail from "./components/SidebarRail";
import type { AppSection } from "./components/SidebarMenu";
import { demoEvents } from "./data/demo-events";
import { loadCalendarSettings, loadEvents, loadTasks, saveCalendarSettings, saveEvents, saveTasks } from "./data/event-store";
import type { CalendarEvent } from "./domain/calendar-event";
import type { Task } from "./domain/task";
import CalendarToolbar, {
  type CalendarView,
} from "./components/CalendarToolbar";

type Celebration = {
  x: number;
  y: number;
};
type DialogEvent = "new" | CalendarEvent | null;

const daysByView: Record<CalendarView, number> = { day: 1, "three-days": 3, "five-days": 5, week: 7 };

function App() {
  const [selectedView, setSelectedView] = useState<CalendarView>("week");
  const [calendarStartDate, setCalendarStartDate] = useState(() => new Date());
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(23);
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  const [areTasksLoaded, setAreTasksLoaded] = useState(false);
  const [areCalendarSettingsLoaded, setAreCalendarSettingsLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => "Notification" in window ? Notification.permission : "unsupported");
  const [dialogEvent, setDialogEvent] = useState<DialogEvent>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("calendar");
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const completedEvents = events.filter(
    (event) => event.status === "completed",
  ).length;

  useEffect(() => {
    loadEvents()
      .then((storedEvents) => {
        if (storedEvents) setEvents(storedEvents);
      })
      .catch(() => {
        // IndexedDB may be disabled; the app remains usable for this session.
      })
      .finally(() => setIsEventsLoaded(true));
  }, []);

  useEffect(() => {
    loadCalendarSettings().then((storedSettings) => {
      if (!storedSettings) return;
      setStartHour(storedSettings.startHour);
      setEndHour(storedSettings.endHour);
    }).catch(() => {
      // The default range remains available when persistence is unavailable.
    }).finally(() => setAreCalendarSettingsLoaded(true));
  }, []);

  useEffect(() => {
    loadTasks().then((storedTasks) => {
      if (storedTasks) setTasks(storedTasks);
    }).catch(() => {
      // The tasks module remains usable when IndexedDB is unavailable.
    }).finally(() => setAreTasksLoaded(true));
  }, []);

  useEffect(() => {
    if (!isEventsLoaded) return;
    saveEvents(events).catch(() => {
      // Persistence failures must not interrupt planning or completion.
    });
  }, [events, isEventsLoaded]);

  useEffect(() => {
    if (!areTasksLoaded) return;
    saveTasks(tasks).catch(() => {
      // Persistence is helpful but must not block the interface.
    });
  }, [tasks, areTasksLoaded]);

  useEffect(() => {
    if (!areCalendarSettingsLoaded) return;
    saveCalendarSettings({ startHour, endHour }).catch(() => {
      // Calendar remains usable if preferences cannot be stored.
    });
  }, [startHour, endHour, areCalendarSettingsLoaded]);

  useEffect(() => {
    if (!areTasksLoaded || notificationPermission !== "granted") return;

    const checkReminders = () => {
      const now = new Date();
      const currentMinute = now.toISOString().slice(0, 16);

      setTasks((currentTasks) => currentTasks.map((task) => {
        if (!task.reminderDate || task.completed || task.reminderNotifiedAt) return task;
        const dueAt = new Date(`${task.reminderDate}T${task.reminderTime || "09:00"}:00`);
        if (dueAt > now) return task;

        new Notification("MyDate · Recordatorio", {
          body: `${task.icon} ${task.title}`,
          tag: `mydate-task-${task.id}`,
        });
        return { ...task, reminderNotifiedAt: currentMinute };
      }));
    };

    checkReminders();
    const reminderTimer = window.setInterval(checkReminders, 30_000);
    return () => window.clearInterval(reminderTimer);
  }, [areTasksLoaded, notificationPermission]);

  function toggleCompletion(eventId: string, occurrenceKey: string, origin: Celebration) {
    const eventToToggle = events.find((event) => event.id === eventId);
    const isCompleting = eventToToggle?.recurrence
      ? eventToToggle.occurrenceStatuses?.[occurrenceKey] !== "completed"
      : eventToToggle?.status !== "completed";

    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id !== eventId ? event : event.recurrence ? {
          ...event,
          occurrenceStatuses: {
            ...event.occurrenceStatuses,
            [occurrenceKey]: event.occurrenceStatuses?.[occurrenceKey] === "completed" ? "planned" : "completed",
          },
        } : { ...event, status: event.status === "completed" ? "planned" : "completed" },
      ),
    );

    if (isCompleting) {
      setCelebration(origin);
      window.setTimeout(() => setCelebration(null), 950);
    }
  }

  function saveEvent(input: NewEventInput) {
    if (dialogEvent === "new") {
      setEvents((currentEvents) => [...currentEvents, { id: crypto.randomUUID(), ...input, status: "planned" }]);
    } else if (dialogEvent) {
      setEvents((currentEvents) => currentEvents.map((event) => event.id === dialogEvent.id ? { ...event, ...input } : event));
    }
    setDialogEvent(null);
  }

  function deleteEvent(eventId: string) {
    setEvents((currentEvents) => currentEvents.filter((event) => event.id !== eventId));
    setDialogEvent(null);
  }

  function moveEvent(eventId: string, startAt: string) {
    setEvents((currentEvents) => currentEvents.map((event) => {
      if (event.id !== eventId || event.recurrence) return event;
      const duration = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
      return { ...event, startAt, endAt: new Date(new Date(startAt).getTime() + duration).toISOString() };
    }));
  }

  function resizeEvent(eventId: string, startAt: string, endAt: string) {
    setEvents((currentEvents) => currentEvents.map((event) =>
      event.id === eventId && !event.recurrence ? { ...event, startAt, endAt } : event,
    ));
  }

  function changeStartHour(hour: number) {
    setStartHour(hour);
    if (hour >= endHour) setEndHour(hour + 1);
  }

  function changeEndHour(hour: number) {
    setEndHour(hour);
  }

  function selectSection(section: AppSection) {
    setActiveSection(section);
  }

  function createTask(input: Omit<Task, "id" | "completed" | "subtasks" | "createdAt">) {
    setTasks((currentTasks) => [...currentTasks, {
      id: crypto.randomUUID(),
      ...input,
      completed: false,
      subtasks: [],
      createdAt: new Date().toISOString(),
    }]);
  }

  function toggleTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.map((task) => task.id !== taskId ? task : {
      ...task,
      completed: !task.completed,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: !task.completed })),
    }));
  }

  function toggleSubtask(taskId: string, subtaskId: string) {
    setTasks((currentTasks) => currentTasks.map((task) => {
      if (task.id !== taskId) return task;
      const subtasks = task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask);
      return { ...task, completed: subtasks.length > 0 && subtasks.every((subtask) => subtask.completed), subtasks };
    }));
  }

  function addSubtask(taskId: string, title: string) {
    setTasks((currentTasks) => currentTasks.map((task) => task.id !== taskId ? task : {
      ...task,
      completed: false,
      subtasks: [...task.subtasks, { id: crypto.randomUUID(), title, completed: false }],
    }));
  }

  function deleteTask(taskId: string) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  function moveCalendar(direction: 1 | -1) {
    setCalendarStartDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + direction * daysByView[selectedView]);
      return nextDate;
    });
  }

  function goToDate(value: string) {
    setCalendarStartDate(new Date(`${value}T00:00:00`));
  }

  return (
    <main className="app-shell with-sidebar">
      <SidebarRail activeSection={activeSection} onSelect={selectSection} />
      <AppHeader
        onNewBlock={() => setDialogEvent("new")}
        showNewBlock={activeSection === "calendar"}
      />

      {activeSection === "calendar" && <><CalendarToolbar
        selectedView={selectedView}
        onViewChange={setSelectedView}
        calendarStartDate={calendarStartDate}
        onPrevious={() => moveCalendar(-1)}
        onNext={() => moveCalendar(1)}
        onToday={() => setCalendarStartDate(new Date())}
        onDateChange={goToDate}
      />

      <p className="completion-summary" aria-live="polite">
        <strong>{completedEvents}</strong> de {events.length} bloques completados
      </p>

      <CalendarGrid
        selectedView={selectedView}
        events={events}
        onToggleCompletion={toggleCompletion}
        onEditEvent={setDialogEvent}
        startHour={startHour}
        endHour={endHour}
        calendarStartDate={calendarStartDate}
        onMoveEvent={moveEvent}
        onResizeEvent={resizeEvent}
      /></>}

      {activeSection === "tasks" && <TasksPanel tasks={tasks} notificationPermission={notificationPermission} onRequestNotifications={requestNotificationPermission} onCreate={createTask} onToggleTask={toggleTask} onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteTask={deleteTask} />}

      {activeSection === "finances" && <section className="module-placeholder"><p className="module-eyebrow">Planificado para una próxima fase</p><h1>Finanzas</h1><p>Aquí podrás registrar movimientos, presupuestos y metas de ahorro con tus datos locales.</p><div className="placeholder-card"><span>₵</span><div><strong>Tu dinero, con claridad</strong><small>La primera versión incluirá cuentas, ingresos y gastos.</small></div></div></section>}

      {activeSection === "settings" && <CalendarSettings startHour={startHour} endHour={endHour} onStartHourChange={changeStartHour} onEndHourChange={changeEndHour} onBack={() => setActiveSection("calendar")} />}

      {celebration && (
        <div
          className="completion-overlay"
          aria-hidden="true"
          style={{ left: celebration.x, top: celebration.y }}
        >
          <i>✦</i>
          <i>✧</i>
          <i>✦</i>
          <i>✧</i>
          <i>✦</i>
          <i>✧</i>
        </div>
      )}

      {dialogEvent && (
        <NewEventDialog
          event={dialogEvent === "new" ? undefined : dialogEvent}
          defaultDate={calendarStartDate}
          onClose={() => setDialogEvent(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}

    </main>
  );
}

export default App;
