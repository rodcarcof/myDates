import type { CalendarEvent, EventCategory, EventStatus, RecurrenceRule } from "../domain/calendar-event";
import type { Task, TaskPriority, TaskSubtask } from "../domain/task";
import type { Workspace } from "../domain/workspace";
import type { WorkspaceNote } from "../domain/workspace-note";
import type { CalendarSettings } from "./event-store";
import { supabase } from "../lib/supabase";
import type { CalendarCategory } from "../domain/calendar-category";

export type CloudState = { events: CalendarEvent[]; tasks: Task[]; workspaces: Workspace[]; notes: WorkspaceNote[]; categories: CalendarCategory[]; settings: CalendarSettings };

const legacyEventIds: Record<string, string> = {
  "event-1": "0cc5d3fe-6af1-43bd-9c99-a1bf980db101", "event-2": "0cc5d3fe-6af1-43bd-9c99-a1bf980db102", "event-3": "0cc5d3fe-6af1-43bd-9c99-a1bf980db103", "event-4": "0cc5d3fe-6af1-43bd-9c99-a1bf980db104", "event-5": "0cc5d3fe-6af1-43bd-9c99-a1bf980db105",
};
const cloudEventId = (id: string) => legacyEventIds[id] ?? id;
function splitReminder(value?: string) { if (!value) return {}; const date = new Date(value); return { reminderDate: date.toISOString().slice(0, 10), reminderTime: date.toTimeString().slice(0, 5) }; }

export async function loadCloudState(userId: string): Promise<CloudState | null> {
  const [workspaceResult, eventResult, taskResult, subtaskResult, noteResult, categoryResult, settingsResult] = await Promise.all([supabase.from("workspaces").select("*").eq("user_id", userId).order("created_at"), supabase.from("calendar_events").select("*").eq("user_id", userId).order("start_at"), supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"), supabase.from("subtasks").select("*"), supabase.from("workspace_notes").select("*").eq("user_id", userId).order("updated_at", { ascending: false }), supabase.from("calendar_categories").select("*").eq("user_id", userId).order("created_at"), supabase.from("calendar_settings").select("*").eq("user_id", userId).maybeSingle()]);
  const failed = [workspaceResult, eventResult, taskResult, subtaskResult, noteResult, categoryResult, settingsResult].find((result) => result.error);
  if (failed?.error) throw failed.error;
  const workspaces = (workspaceResult.data ?? []).map((row) => ({ id: row.id, name: row.name, icon: row.icon, color: row.color, description: row.description ?? undefined }));
  const tasks = (taskResult.data ?? []).map((row) => ({ id: row.id, title: row.title, icon: row.icon, priority: row.priority as TaskPriority, completed: row.completed, subtasks: (subtaskResult.data ?? []).filter((subtask) => subtask.task_id === row.id).sort((a, b) => a.position - b.position).map((subtask) => ({ id: subtask.id, title: subtask.title, completed: subtask.completed } as TaskSubtask)), createdAt: row.created_at, workspaceId: row.workspace_id ?? undefined, ...splitReminder(row.reminder_at ?? undefined) } as Task));
  const events = (eventResult.data ?? []).map((row) => ({ id: row.id, title: row.title, category: row.category as EventCategory, categoryId: row.category_id ?? undefined, startAt: row.start_at, endAt: row.end_at, status: row.status as EventStatus, recurrence: row.recurrence as RecurrenceRule | undefined, occurrenceStatuses: row.occurrence_statuses as Record<string, EventStatus> | undefined, reminderEnabled: row.reminder_enabled ?? false, reminderNotifiedAt: row.reminder_notified_at as Record<string, string> | undefined, workspaceId: row.workspace_id ?? undefined }));
  const notes = (noteResult.data ?? []).map((row) => ({ id: row.id, workspaceId: row.workspace_id, title: row.title, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at }));
  const categories = (categoryResult.data ?? []).map((row) => ({ id: row.id, name: row.name, icon: row.icon, color: row.color }));
  const settings = settingsResult.data ? { startHour: settingsResult.data.start_hour, endHour: settingsResult.data.end_hour, selectedView: settingsResult.data.selected_view ?? "week" } : { startHour: 8, endHour: 23, selectedView: "week" };
  if (workspaces.length + events.length + tasks.length + notes.length === 0 && !settingsResult.data) return null;
  return { workspaces, events, tasks, notes, categories, settings };
}

export async function syncCloudState(userId: string, state: CloudState): Promise<void> {
  if (state.workspaces.length) { const { error } = await supabase.from("workspaces").upsert(state.workspaces.map((workspace) => ({ ...workspace, user_id: userId }))); if (error) throw error; }
  const cloudCategories = state.categories.filter((category) => /^[0-9a-f]{8}-/i.test(category.id));
  if (cloudCategories.length) { const { error } = await supabase.from("calendar_categories").upsert(cloudCategories.map((category) => ({ ...category, user_id: userId }))); if (error) throw error; }
  if (state.tasks.length) { const { error } = await supabase.from("tasks").upsert(state.tasks.map((task) => ({ id: task.id, user_id: userId, workspace_id: task.workspaceId ?? null, title: task.title, icon: task.icon, priority: task.priority, completed: task.completed, reminder_at: task.reminderDate ? `${task.reminderDate}T${task.reminderTime || "09:00"}:00` : null, created_at: task.createdAt }))); if (error) throw error; const subtasks = state.tasks.flatMap((task) => task.subtasks.map((subtask, position) => ({ id: subtask.id, task_id: task.id, title: subtask.title, completed: subtask.completed, position }))); if (subtasks.length) { const { error: subtaskError } = await supabase.from("subtasks").upsert(subtasks); if (subtaskError) throw subtaskError; } }
  if (state.events.length) { const { error } = await supabase.from("calendar_events").upsert(state.events.map((event) => ({ id: cloudEventId(event.id), user_id: userId, workspace_id: event.workspaceId ?? null, category_id: /^[0-9a-f]{8}-/i.test(event.categoryId ?? "") ? event.categoryId : null, title: event.title, category: event.category, status: event.status, start_at: event.startAt, end_at: event.endAt, recurrence: event.recurrence ?? null, occurrence_statuses: event.occurrenceStatuses ?? null, reminder_enabled: event.reminderEnabled ?? false, reminder_notified_at: event.reminderNotifiedAt ?? null }))); if (error) throw error; }
  if (state.notes.length) { const { error } = await supabase.from("workspace_notes").upsert(state.notes.map((note) => ({ id: note.id, user_id: userId, workspace_id: note.workspaceId, title: note.title, content: note.content, created_at: note.createdAt, updated_at: note.updatedAt }))); if (error) throw error; }
  const { error: settingsError } = await supabase.from("calendar_settings").upsert({ user_id: userId, start_hour: state.settings.startHour, end_hour: state.settings.endHour, selected_view: state.settings.selectedView ?? "week" });
  if (settingsError) throw settingsError;
}

export async function deleteCloudEvent(userId: string, eventId: string) { const { error } = await supabase.from("calendar_events").delete().eq("user_id", userId).eq("id", cloudEventId(eventId)); if (error) throw error; }
export async function deleteCloudTask(userId: string, taskId: string) { const { error } = await supabase.from("tasks").delete().eq("user_id", userId).eq("id", taskId); if (error) throw error; }
export async function deleteCloudNote(userId: string, noteId: string) { const { error } = await supabase.from("workspace_notes").delete().eq("user_id", userId).eq("id", noteId); if (error) throw error; }

export async function clearCloudData(userId: string) {
  const results = [];
  results.push(await supabase.from("calendar_events").delete().eq("user_id", userId));
  results.push(await supabase.from("workspace_notes").delete().eq("user_id", userId));
  results.push(await supabase.from("tasks").delete().eq("user_id", userId));
  results.push(await supabase.from("workspaces").delete().eq("user_id", userId));
  results.push(await supabase.from("calendar_settings").delete().eq("user_id", userId));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
