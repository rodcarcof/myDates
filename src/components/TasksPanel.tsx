import { useState } from "react";
import EmojiPicker, { EmojiStyle, type EmojiClickData } from "emoji-picker-react";
import type { Task, TaskPriority } from "../domain/task";

type TasksPanelProps = {
  tasks: Task[];
  notificationPermission: NotificationPermission | "unsupported";
  onRequestNotifications: () => void;
  onCreate: (input: Omit<Task, "id" | "completed" | "subtasks" | "createdAt">) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  workspaceId?: string;
  heading?: string;
  description?: string;
};

const priorityLabels: Record<TaskPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  none: "Sin prioridad",
};

function TasksPanel({
  tasks,
  notificationPermission,
  onRequestNotifications,
  onCreate,
  onToggleTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteTask,
  workspaceId,
  heading = "Tareas",
  description = "Organiza lo que debes hacer sin forzarlo aún a un horario.",
}: TasksPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("✓");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>({});

  function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    onCreate({
      title: trimmedTitle,
      icon: icon.trim() || "✓",
      priority,
      ...(workspaceId ? { workspaceId } : {}),
      ...(hasReminder && reminderDate ? { reminderDate, reminderTime: reminderTime || undefined } : {}),
    });
    setTitle("");
    setIcon("✓");
    setPriority("medium");
    setHasReminder(false);
    setReminderDate("");
    setReminderTime("");
    setIsCreating(false);
  }

  function submitSubtask(event: React.FormEvent<HTMLFormElement>, taskId: string) {
    event.preventDefault();
    const title = subtaskDrafts[taskId]?.trim();
    if (!title) return;

    onAddSubtask(taskId, title);
    setSubtaskDrafts((drafts) => ({ ...drafts, [taskId]: "" }));
  }

  function selectIcon(emojiData: EmojiClickData) {
    setIcon(emojiData.emoji);
    setIsIconPickerOpen(false);
  }

  return (
    <section className="tasks-module">
      <div className="tasks-heading">
        <div>
          <p className="module-eyebrow">Módulo independiente</p>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setIsCreating(true)}>
          + Nueva tarea
        </button>
      </div>

      {notificationPermission !== "granted" && <div className="notification-callout"><span>🔔</span><div><strong>Activa recordatorios en Windows</strong><p>MyDate te pedirá permiso para mostrar avisos de tareas.</p></div><button type="button" className="secondary-button" onClick={onRequestNotifications} disabled={notificationPermission === "unsupported"}>{notificationPermission === "unsupported" ? "No disponible" : "Activar avisos"}</button></div>}

      {isCreating && (
        <form className="task-create-form" onSubmit={submitTask}>
          <div className="task-name-field">
            <div className="form-field task-icon-picker">
              <span>Ícono</span>
              <div className="task-icon-options">
                <button type="button" className="task-icon-trigger" onClick={() => setIsIconPickerOpen((isOpen) => !isOpen)} aria-expanded={isIconPickerOpen} aria-haspopup="dialog">
                  <span>{icon}</span><span>Elegir ícono</span>
                </button>
                {isIconPickerOpen && <div className="emoji-picker-popover"><EmojiPicker onEmojiClick={selectIcon} emojiStyle={EmojiStyle.NATIVE} searchPlaceholder="Buscar iconos" width={340} height={390} previewConfig={{ showPreview: false }} /></div>}
              </div>
            </div>
            <label className="form-field">
              Nombre de la tarea
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Regar plantas" autoFocus />
            </label>
          </div>
          <div className="task-create-options">
            <label className="form-field">Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="reminder-fields">
            <label className="reminder-toggle"><input type="checkbox" checked={hasReminder} onChange={(event) => setHasReminder(event.target.checked)} /> Activar recordatorio</label>
            {hasReminder && <div className="reminder-inputs"><label className="form-field">Fecha<input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} required /></label><label className="form-field">Hora <small>Opcional</small><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label><p>Sin hora, MyDate avisará a las 09:00.</p></div>}
          </div>
          <div className="dialog-main-actions"><button type="button" className="secondary-button" onClick={() => setIsCreating(false)}>Cancelar</button><button type="submit" className="primary-button">Crear tarea</button></div>
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="tasks-empty"><span>✓</span><h2>Tu lista está despejada</h2><p>Crea una tarea para comenzar a organizarte.</p></div>
      ) : (
        <div className="tasks-list">
          {tasks.map((task) => {
            const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
            const isDone = task.completed || (task.subtasks.length > 0 && completedSubtasks === task.subtasks.length);

            return <article className={isDone ? "task-card completed" : "task-card"} key={task.id}>
              <div className="task-card-top">
                <button type="button" className="task-check" onClick={() => onToggleTask(task.id)} aria-label={isDone ? `Marcar pendiente: ${task.title}` : `Completar: ${task.title}`}>{isDone ? "✓" : ""}</button>
                <span className="task-icon">{task.icon}</span>
                <div className="task-title"><h2>{task.title}</h2><span className={`priority-badge priority-${task.priority}`}>{priorityLabels[task.priority]}</span></div>
                <button type="button" className="task-delete" onClick={() => onDeleteTask(task.id)} aria-label={`Eliminar ${task.title}`}>×</button>
              </div>
              <p className="task-progress">{task.subtasks.length === 0 ? (isDone ? "Completada" : "Sin subtareas") : `${completedSubtasks} de ${task.subtasks.length} subtareas completadas`}</p>
              {task.reminderDate && <p className="task-reminder">⏰ {new Date(`${task.reminderDate}T00:00:00`).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}{task.reminderTime ? ` · ${task.reminderTime}` : " · 09:00"}</p>}
              <div className="subtask-list">
                {task.subtasks.map((subtask) => <label className={subtask.completed ? "subtask completed" : "subtask"} key={subtask.id}><input type="checkbox" checked={subtask.completed} onChange={() => onToggleSubtask(task.id, subtask.id)} /><span>{subtask.title}</span></label>)}
              </div>
              <form className="subtask-form" onSubmit={(event) => submitSubtask(event, task.id)}><input value={subtaskDrafts[task.id] ?? ""} onChange={(event) => setSubtaskDrafts((drafts) => ({ ...drafts, [task.id]: event.target.value }))} placeholder="Añadir subtarea" /><button type="submit">Añadir</button></form>
            </article>;
          })}
        </div>
      )}
    </section>
  );
}

export default TasksPanel;
