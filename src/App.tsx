import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AppHeader from "./components/AppHeader";
import CalendarGrid from "./components/CalendarGrid";
import CalendarSettings from "./components/CalendarSettings";
import CategorySettings from "./components/CategorySettings";
import NewWorkspaceDialog from "./components/NewWorkspaceDialog";
import WorkspacePanel from "./components/WorkspacePanel";
import TasksPanel from "./components/TasksPanel";
import NewEventDialog, {
  type NewEventInput,
} from "./components/NewEventDialog";
import SidebarRail from "./components/SidebarRail";
import type { AppSection } from "./components/SidebarMenu";
import { clearLocalMyDateData, loadCalendarCategories, loadCalendarSettings, loadEvents, loadTasks, loadWorkspaceNotes, loadWorkspaces, saveCalendarCategories, saveCalendarSettings, saveEvents, saveTasks, saveWorkspaceNotes, saveWorkspaces } from "./data/event-store";
import { clearCloudData, deleteCloudEvent, deleteCloudNote, deleteCloudTask, loadCloudState, syncCloudState, type CloudState } from "./data/supabase-store";
import type { CalendarEvent } from "./domain/calendar-event";
import type { Task } from "./domain/task";
import type { Workspace } from "./domain/workspace";
import type { WorkspaceNote } from "./domain/workspace-note";
import { defaultCalendarCategories } from "./domain/calendar-category";
import { expandEvents } from "./domain/recurrence";
import CalendarToolbar, {
  type CalendarView,
} from "./components/CalendarToolbar";

type Celebration = {
  x: number;
  y: number;
};
type DialogEvent = "new" | CalendarEvent | null;

const daysByView: Record<CalendarView, number> = { day: 1, "two-days": 2, "three-days": 3, "five-days": 5, week: 7 };

type AppProps = { user: User };

function App({ user }: AppProps) {
  const [selectedView, setSelectedView] = useState<CalendarView>("week");
  const [calendarStartDate, setCalendarStartDate] = useState(() => new Date());
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(23);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceNotes, setWorkspaceNotes] = useState<WorkspaceNote[]>([]);
  const [categories, setCategories] = useState(defaultCalendarCategories);
  const [areCategoriesLoaded, setAreCategoriesLoaded] = useState(false);
  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  const [areTasksLoaded, setAreTasksLoaded] = useState(false);
  const [areCalendarSettingsLoaded, setAreCalendarSettingsLoaded] = useState(false);
  const [areWorkspacesLoaded, setAreWorkspacesLoaded] = useState(false);
  const [areWorkspaceNotesLoaded, setAreWorkspaceNotesLoaded] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => "Notification" in window ? Notification.permission : "unsupported");
  const [dialogEvent, setDialogEvent] = useState<DialogEvent>(null);
  const [activeSection, setActiveSection] = useState<AppSection>("calendar");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
  const [isCloudReady, setIsCloudReady] = useState(false);
  const [isDataResetConfirmationOpen, setIsDataResetConfirmationOpen] = useState(false);
  const [isResettingData, setIsResettingData] = useState(false);
  const [isWidgetWindow, setIsWidgetWindow] = useState(false);
  const cloudSyncTimer = useRef<number | null>(null);
  const skipNextCloudSync = useRef(false);
  const hasPersistedLocalData = useRef(false);

  useEffect(() => {
    loadEvents()
      .then((storedEvents) => {
        if (storedEvents) {
          setEvents(storedEvents);
          if (storedEvents.length > 0) hasPersistedLocalData.current = true;
        }
      })
      .catch(() => {
        // IndexedDB may be disabled; the app remains usable for this session.
      })
      .finally(() => setIsEventsLoaded(true));
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => setIsWidgetWindow(getCurrentWindow().label === "widget"))
      .catch(() => setIsWidgetWindow(false));
  }, []);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let removeListener: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(async ({ listen }) => {
        removeListener = await listen<CloudState>("mydate:data-synchronized", ({ payload }) => {
          // La otra ventana ya confirmó la escritura. Aplicamos sus datos aquí
          // directamente: no se recarga la WebView ni se produce parpadeo.
          skipNextCloudSync.current = true;
          setEvents(payload.events);
          setTasks(payload.tasks);
          setWorkspaces(payload.workspaces);
          setWorkspaceNotes(payload.notes);
          setCategories(payload.categories.length ? payload.categories : defaultCalendarCategories);
          setStartHour(payload.settings.startHour);
          setEndHour(payload.settings.endHour);
          setSelectedView(payload.settings.selectedView ?? "week");
        });
      })
      .catch((error) => console.error("No fue posible escuchar la sincronización del widget.", error));

    return () => removeListener?.();
  }, []);

  useEffect(() => {
    if (!isEventsLoaded || !areTasksLoaded || !areWorkspacesLoaded || !areWorkspaceNotesLoaded || !areCalendarSettingsLoaded || !areCategoriesLoaded) return;
    loadCloudState(user.id).then((cloud) => {
      // Los datos locales son la fuente de verdad en este prototipo. Supabase
      // solo hidrata una instalación nueva para evitar que una copia antigua
      // borre bloques que ya existen en el dispositivo.
      if (!cloud || hasPersistedLocalData.current) return;
      setEvents(cloud.events);
      setTasks(cloud.tasks);
      setWorkspaces(cloud.workspaces);
      setWorkspaceNotes(cloud.notes);
      if (cloud.categories.length) setCategories(cloud.categories);
      setStartHour(cloud.settings.startHour);
      setEndHour(cloud.settings.endHour);
      setSelectedView(cloud.settings.selectedView ?? "week");
    }).catch((error) => {
      console.error("No fue posible cargar los datos de Supabase.", error);
    }).finally(() => setIsCloudReady(true));
  }, [user.id, isEventsLoaded, areTasksLoaded, areWorkspacesLoaded, areWorkspaceNotesLoaded, areCalendarSettingsLoaded, areCategoriesLoaded]);

  useEffect(() => {
    if (!isCloudReady) return;
    if (skipNextCloudSync.current) {
      skipNextCloudSync.current = false;
      return;
    }
    if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = window.setTimeout(() => {
      syncCloudState(user.id, { events, tasks, workspaces, notes: workspaceNotes, categories, settings: { startHour, endHour, selectedView } })
        .then(async () => {
          if (!("__TAURI_INTERNALS__" in window)) return;
          const { emitTo } = await import("@tauri-apps/api/event");
          await emitTo(isWidgetWindow ? "main" : "widget", "mydate:data-synchronized", {
            events,
            tasks,
            workspaces,
            notes: workspaceNotes,
            categories,
            settings: { startHour, endHour, selectedView },
          } satisfies CloudState);
        })
        .catch((error) => {
          console.error("No fue posible guardar los datos en Supabase.", error);
        });
    }, 700);
    return () => { if (cloudSyncTimer.current) window.clearTimeout(cloudSyncTimer.current); };
  }, [user.id, events, tasks, workspaces, workspaceNotes, categories, startHour, endHour, selectedView, isCloudReady, isWidgetWindow]);

  useEffect(() => {
    loadWorkspaceNotes().then((storedNotes) => {
      if (storedNotes) {
        setWorkspaceNotes(storedNotes);
        if (storedNotes.length > 0) hasPersistedLocalData.current = true;
      }
    }).catch(() => {}).finally(() => setAreWorkspaceNotesLoaded(true));
  }, []);

  useEffect(() => {
    loadCalendarCategories().then((storedCategories) => {
      if (storedCategories?.length) {
        setCategories(storedCategories);
      }
    }).catch(() => {}).finally(() => setAreCategoriesLoaded(true));
  }, []);

  useEffect(() => {
    if (!areCategoriesLoaded) return;
    saveCalendarCategories(categories).catch(() => {});
  }, [categories, areCategoriesLoaded]);

  useEffect(() => {
    loadWorkspaces().then((storedWorkspaces) => {
      if (storedWorkspaces) {
        setWorkspaces(storedWorkspaces);
        if (storedWorkspaces.length > 0) hasPersistedLocalData.current = true;
      }
    }).finally(() => setAreWorkspacesLoaded(true));
  }, []);

  useEffect(() => {
    loadCalendarSettings().then((storedSettings) => {
      if (!storedSettings) return;
      setStartHour(storedSettings.startHour);
      setEndHour(storedSettings.endHour);
      if (storedSettings.selectedView) setSelectedView(storedSettings.selectedView);
    }).catch(() => {
      // The default range remains available when persistence is unavailable.
    }).finally(() => setAreCalendarSettingsLoaded(true));
  }, []);

  useEffect(() => {
    loadTasks().then((storedTasks) => {
      if (storedTasks) {
        setTasks(storedTasks);
        if (storedTasks.length > 0) hasPersistedLocalData.current = true;
      }
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
    saveCalendarSettings({ startHour, endHour, selectedView }).catch(() => {
      // Calendar remains usable if preferences cannot be stored.
    });
  }, [startHour, endHour, selectedView, areCalendarSettingsLoaded]);

  useEffect(() => {
    if (!areWorkspacesLoaded) return;
    saveWorkspaces(workspaces).catch(() => {});
  }, [workspaces, areWorkspacesLoaded]);

  useEffect(() => {
    if (!areWorkspaceNotesLoaded) return;
    saveWorkspaceNotes(workspaceNotes).catch(() => {});
  }, [workspaceNotes, areWorkspaceNotesLoaded]);

  useEffect(() => {
    if (!areTasksLoaded || notificationPermission !== "granted" || isWidgetWindow) return;

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
  }, [areTasksLoaded, notificationPermission, isWidgetWindow]);

  useEffect(() => {
    if (!isEventsLoaded || notificationPermission !== "granted" || isWidgetWindow) return;

    const checkBlockReminders = () => {
      const now = new Date();
      setEvents((currentEvents) => {
        const today = expandEvents(currentEvents, now, now);
        const reminders = today.filter((occurrence) =>
          occurrence.sourceEvent.reminderEnabled
          && occurrence.status !== "completed"
          && new Date(occurrence.startAt) <= now
          && !occurrence.sourceEvent.reminderNotifiedAt?.[occurrence.occurrenceKey],
        );
        if (reminders.length === 0) return currentEvents;

        reminders.forEach((occurrence) => new Notification("MyDate · Bloque por comenzar", {
          body: occurrence.title,
          tag: `mydate-block-${occurrence.sourceEvent.id}-${occurrence.occurrenceKey}`,
        }));
        return currentEvents.map((event) => {
          const eventReminders = reminders.filter((occurrence) => occurrence.sourceEvent.id === event.id);
          if (eventReminders.length === 0) return event;
          return { ...event, reminderNotifiedAt: { ...event.reminderNotifiedAt, ...Object.fromEntries(eventReminders.map((occurrence) => [occurrence.occurrenceKey, now.toISOString()])) } };
        });
      });
    };

    checkBlockReminders();
    const reminderTimer = window.setInterval(checkBlockReminders, 30_000);
    return () => window.clearInterval(reminderTimer);
  }, [isEventsLoaded, notificationPermission, isWidgetWindow]);

  function toggleCompletion(eventId: string, occurrenceKey: string, origin: Celebration) {
    const eventToToggle = events.find((event) => event.id === eventId);
    const isCompleting = eventToToggle?.recurrence
      ? eventToToggle.occurrenceStatuses?.[occurrenceKey] !== "completed"
      : eventToToggle?.status !== "completed";

    const now = Date.now();
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id !== eventId ? event : event.recurrence ? {
          ...event,
          occurrenceStatuses: {
            ...event.occurrenceStatuses,
            [occurrenceKey]: event.occurrenceStatuses?.[occurrenceKey] === "completed" ? "planned" : "completed",
          },
          occurrenceTimers: {
            ...event.occurrenceTimers,
            [occurrenceKey]: (() => {
              const timer = event.occurrenceTimers?.[occurrenceKey] ?? { elapsedSeconds: 0 };
              return {
                elapsedSeconds: timer.elapsedSeconds + (timer.startedAt ? Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000)) : 0),
              startedAt: undefined,
              };
            })(),
          },
        } : {
          ...event,
          status: event.status === "completed" ? "planned" : "completed",
          // Una finalización manual también detiene el cronómetro; así no
          // vuelve a completar ni sigue contando en segundo plano.
          timerElapsedSeconds: event.timerStartedAt ? eventElapsedSeconds(event, now) : event.timerElapsedSeconds,
          timerStartedAt: undefined,
        },
      ),
    );

    if (isCompleting) {
      setCelebration(origin);
      window.setTimeout(() => setCelebration(null), 950);
    }
  }

  function eventElapsedSeconds(event: CalendarEvent, now: number) {
    const saved = event.timerElapsedSeconds ?? 0;
    if (!event.timerStartedAt) return saved;
    return saved + Math.max(0, Math.floor((now - new Date(event.timerStartedAt).getTime()) / 1000));
  }

  function toggleEventTimer(eventId: string, occurrenceKey: string) {
    const now = Date.now();
    setEvents((currentEvents) => currentEvents.map((event) => {
      if (event.id === eventId) {
        if (event.recurrence) {
          if (event.occurrenceStatuses?.[occurrenceKey] === "completed") return event;
          const timer = event.occurrenceTimers?.[occurrenceKey] ?? { elapsedSeconds: 0 };
          const elapsedSeconds = timer.elapsedSeconds + (timer.startedAt ? Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000)) : 0);
          return {
            ...event,
            occurrenceTimers: {
              ...event.occurrenceTimers,
              [occurrenceKey]: timer.startedAt
                ? { elapsedSeconds }
                : { elapsedSeconds, startedAt: new Date(now).toISOString() },
            },
          };
        }
        if (event.status === "completed") return event;
        if (event.timerStartedAt) return { ...event, timerElapsedSeconds: eventElapsedSeconds(event, now), timerStartedAt: undefined };
        return { ...event, timerStartedAt: new Date(now).toISOString() };
      }
      if (event.recurrence && event.occurrenceTimers) {
        const occurrenceTimers = Object.fromEntries(Object.entries(event.occurrenceTimers).map(([key, timer]) => [key, timer.startedAt ? { elapsedSeconds: timer.elapsedSeconds + Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000)) } : timer]));
        return { ...event, occurrenceTimers };
      }
      return event.timerStartedAt
        ? { ...event, timerElapsedSeconds: eventElapsedSeconds(event, now), timerStartedAt: undefined }
        : event;
    }));
  }

  useEffect(() => {
    const completeFinishedTimers = () => {
      setEvents((currentEvents) => {
        const now = Date.now();
        let didComplete = false;
        const nextEvents = currentEvents.map((event) => {
          if (event.recurrence && event.occurrenceTimers) {
            let changed = false;
            const occurrenceTimers = { ...event.occurrenceTimers };
            const occurrenceStatuses = { ...event.occurrenceStatuses };
            for (const [key, timer] of Object.entries(occurrenceTimers)) {
              if (!timer.startedAt || occurrenceStatuses[key] === "completed") continue;
              const plannedSeconds = Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 1000));
              const elapsedSeconds = timer.elapsedSeconds + Math.max(0, Math.floor((now - new Date(timer.startedAt).getTime()) / 1000));
              if (elapsedSeconds >= plannedSeconds) { occurrenceTimers[key] = { elapsedSeconds: plannedSeconds }; occurrenceStatuses[key] = "completed"; changed = true; }
            }
            if (changed) { didComplete = true; return { ...event, occurrenceTimers, occurrenceStatuses }; }
            return event;
          }
          if (!event.timerStartedAt || event.status === "completed") return event;
          const plannedSeconds = Math.max(0, Math.round((new Date(event.endAt).getTime() - new Date(event.startAt).getTime()) / 1000));
          const elapsed = eventElapsedSeconds(event, now);
          if (elapsed < plannedSeconds) return event;
          didComplete = true;
          return { ...event, status: "completed" as const, timerElapsedSeconds: plannedSeconds, timerStartedAt: undefined };
        });
        return didComplete ? nextEvents : currentEvents;
      });
    };
    const timer = window.setInterval(completeFinishedTimers, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    deleteCloudEvent(user.id, eventId).catch((error) => console.error("No fue posible eliminar el bloque remoto.", error));
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
    setActiveWorkspaceId(null);
  }

  function createWorkspace(workspace: Omit<Workspace, "id">) {
    const createdWorkspace = { id: crypto.randomUUID(), ...workspace };
    setWorkspaces((currentWorkspaces) => [...currentWorkspaces, createdWorkspace]);
    setActiveWorkspaceId(createdWorkspace.id);
    setIsWorkspaceDialogOpen(false);
  }
  function createCategory(category: Omit<import("./domain/calendar-category").CalendarCategory, "id">) { setCategories((current) => [...current, { id: crypto.randomUUID(), ...category }]); }
  function deleteCategory(categoryId: string) { if (categories.length > 1) setCategories((current) => current.filter((category) => category.id !== categoryId)); }

  function createTask(input: Omit<Task, "id" | "completed" | "subtasks" | "createdAt">) {
    setTasks((currentTasks) => [...currentTasks, {
      id: crypto.randomUUID(),
      ...input,
      completed: false,
      subtasks: [],
      createdAt: new Date().toISOString(),
    }]);
  }

  function createWorkspaceNote(workspaceId: string, title: string, content: string) {
    const now = new Date().toISOString();
    setWorkspaceNotes((notes) => [...notes, { id: crypto.randomUUID(), workspaceId, title, content, createdAt: now, updatedAt: now }]);
  }

  function updateWorkspaceNote(noteId: string, title: string, content: string) {
    setWorkspaceNotes((notes) => notes.map((note) => note.id === noteId ? { ...note, title, content, updatedAt: new Date().toISOString() } : note));
  }

  function deleteWorkspaceNote(noteId: string) {
    setWorkspaceNotes((notes) => notes.filter((note) => note.id !== noteId));
    deleteCloudNote(user.id, noteId).catch((error) => console.error("No fue posible eliminar la nota remota.", error));
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
    deleteCloudTask(user.id, taskId).catch((error) => console.error("No fue posible eliminar la tarea remota.", error));
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

  async function resetAllData() {
    setIsResettingData(true);
    try {
      await clearCloudData(user.id);
      await clearLocalMyDateData();
      window.location.reload();
    } catch (error) {
      console.error("No fue posible reiniciar los datos.", error);
      setIsResettingData(false);
      setIsDataResetConfirmationOpen(false);
    }
  }

  async function openWidget() {
    if (!("__TAURI_INTERNALS__" in window)) {
      window.alert("El widget está disponible al abrir MyDate como aplicación de escritorio.");
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_widget");
      const { emitTo } = await import("@tauri-apps/api/event");
      await emitTo("widget", "mydate:data-synchronized", {
        events,
        tasks,
        workspaces,
        notes: workspaceNotes,
        categories,
        settings: { startHour, endHour, selectedView },
      } satisfies CloudState);
    } catch (error) {
      console.error("No fue posible abrir el widget.", error);
    }
  }

  const isDesktopWidget = "__TAURI_INTERNALS__" in window && isWidgetWindow;

  function dragWidgetWindow() {
    if (!isDesktopWidget) return;
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
      .catch((error) => console.error("No fue posible arrastrar el widget.", error));
  }

  function hideWidget() {
    import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) => getCurrentWindow().hide())
      .catch((error) => console.error("No fue posible ocultar el widget.", error));
  }

  if (isDesktopWidget) {
    return <main className="widget-shell"><div className="widget-drag-handle" data-tauri-drag-region onPointerDown={dragWidgetWindow} title="Arrastra para mover MyDate"><button type="button" className="widget-close-button" aria-label="Ocultar widget" title="Ocultar widget" onPointerDown={(event) => event.stopPropagation()} onClick={hideWidget}>×</button></div><CalendarGrid selectedView={selectedView} events={events} onToggleCompletion={toggleCompletion} onToggleTimer={toggleEventTimer} onEditEvent={() => {}} startHour={startHour} endHour={endHour} calendarStartDate={calendarStartDate} onMoveEvent={() => {}} onResizeEvent={() => {}} workspaces={workspaces} categories={categories} isWidget /></main>;
  }

  return (
    <main className="app-shell with-sidebar">
      <SidebarRail activeSection={activeSection} onSelect={selectSection} workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} onSelectWorkspace={(workspaceId) => { setActiveWorkspaceId(workspaceId); setActiveSection("tasks"); }} onCreateWorkspace={() => setIsWorkspaceDialogOpen(true)} user={user} />
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
        onOpenWidget={openWidget}
      />

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
        workspaces={workspaces}
        categories={categories}
      /></>}

      {activeSection === "tasks" && (activeWorkspaceId ? <WorkspacePanel workspace={workspaces.find((workspace) => workspace.id === activeWorkspaceId)!} tasks={tasks.filter((task) => task.workspaceId === activeWorkspaceId)} notes={workspaceNotes.filter((note) => note.workspaceId === activeWorkspaceId)} onCreateBlock={() => setDialogEvent("new")} notificationPermission={notificationPermission} onRequestNotifications={requestNotificationPermission} onCreateTask={createTask} onToggleTask={toggleTask} onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteTask={deleteTask} onCreateNote={createWorkspaceNote} onUpdateNote={updateWorkspaceNote} onDeleteNote={deleteWorkspaceNote} /> : <TasksPanel tasks={tasks} notificationPermission={notificationPermission} onRequestNotifications={requestNotificationPermission} onCreate={createTask} onToggleTask={toggleTask} onToggleSubtask={toggleSubtask} onAddSubtask={addSubtask} onDeleteTask={deleteTask} />)}

      {activeSection === "finances" && <section className="module-placeholder"><p className="module-eyebrow">Planificado para una próxima fase</p><h1>Finanzas</h1><p>Aquí podrás registrar movimientos, presupuestos y metas de ahorro con tus datos locales.</p><div className="placeholder-card"><span>₵</span><div><strong>Tu dinero, con claridad</strong><small>La primera versión incluirá cuentas, ingresos y gastos.</small></div></div></section>}

      {activeSection === "settings" && <CalendarSettings startHour={startHour} endHour={endHour} onStartHourChange={changeStartHour} onEndHourChange={changeEndHour} onBack={() => setActiveSection("calendar")} onRequestDataReset={() => setIsDataResetConfirmationOpen(true)}><CategorySettings categories={categories} onCreate={createCategory} onDelete={deleteCategory} /></CalendarSettings>}

      {isDataResetConfirmationOpen && <div className="delete-confirmation-backdrop"><section className="delete-confirmation" role="dialog" aria-modal="true"><p className="delete-icon">!</p><h3>¿Reiniciar todos los datos?</h3><p>Se eliminarán permanentemente los datos de prueba de esta cuenta en Supabase y de este dispositivo.</p><div className="delete-confirmation-actions"><button type="button" className="secondary-button" disabled={isResettingData} onClick={() => setIsDataResetConfirmationOpen(false)}>Cancelar</button><button type="button" className="delete-confirm-button" disabled={isResettingData} onClick={resetAllData}>{isResettingData ? "Reiniciando…" : "Sí, reiniciar"}</button></div></section></div>}

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
          defaultWorkspaceId={activeWorkspaceId ?? undefined}
          workspaces={workspaces}
          categories={categories}
          onClose={() => setDialogEvent(null)}
          onSave={saveEvent}
          onDelete={deleteEvent}
        />
      )}

      {isWorkspaceDialogOpen && <NewWorkspaceDialog onClose={() => setIsWorkspaceDialogOpen(false)} onSave={createWorkspace} />}

    </main>
  );
}

export default App;
