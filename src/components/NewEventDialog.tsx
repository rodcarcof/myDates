import { useState, type FormEvent } from "react";
import type { CalendarEvent, EventCategory, RecurrenceFrequency, RecurrenceRule } from "../domain/calendar-event";
import type { Workspace } from "../domain/workspace";
import type { CalendarCategory } from "../domain/calendar-category";

export type NewEventInput = { title: string; category: EventCategory; categoryId?: string; categoryColor?: string; startAt: string; endAt: string; recurrence?: RecurrenceRule; workspaceId?: string; reminderEnabled?: boolean };
type Props = { event?: CalendarEvent; defaultDate?: Date; defaultWorkspaceId?: string; workspaces: Workspace[]; categories: CalendarCategory[]; onClose: () => void; onSave: (input: NewEventInput) => void; onDelete?: (eventId: string) => void };
type RepeatOption = "none" | RecurrenceFrequency;

function localDateValue(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function localTimeValue(date: Date) { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }

export default function NewEventDialog({ event, defaultDate, defaultWorkspaceId, workspaces, categories, onClose, onSave, onDelete }: Props) {
  const isEditing = Boolean(event);
  const [title, setTitle] = useState(event?.title ?? "");
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(event ? localDateValue(new Date(event.startAt)) : localDateValue(defaultDate));
  const [startTime, setStartTime] = useState(event ? localTimeValue(new Date(event.startAt)) : "09:00");
  const [endTime, setEndTime] = useState(event ? localTimeValue(new Date(event.endAt)) : "10:00");
  const [repeat, setRepeat] = useState<RepeatOption>(event?.recurrence?.frequency ?? "none");
  const [until, setUntil] = useState(event?.recurrence?.until ?? "");
  const [workspaceId, setWorkspaceId] = useState(event?.workspaceId ?? defaultWorkspaceId ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(event?.reminderEnabled ?? false);
  const [error, setError] = useState("");
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!title.trim()) { setError("Escribe un título para el bloque."); return; }
    const startAt = `${date}T${startTime}:00`; const endAt = `${date}T${endTime}:00`;
    if (new Date(endAt) <= new Date(startAt)) { setError("La hora de término debe ser posterior a la de inicio."); return; }
    const selectedCategory = categories.find((category) => category.id === categoryId) ?? categories[0];
    onSave({ title: title.trim(), category: selectedCategory?.name ?? "Personal", categoryId: selectedCategory?.id, categoryColor: selectedCategory?.color, startAt, endAt, recurrence: repeat === "none" ? undefined : { frequency: repeat, until: until || undefined }, workspaceId: workspaceId || undefined, reminderEnabled });
  }

  return <div className="dialog-backdrop" role="presentation"><section className="event-dialog" role="dialog" aria-modal="true" aria-labelledby="new-event-title">
    <div className="dialog-heading"><div><p className="dialog-eyebrow">{isEditing ? "Ajusta tu planificación" : "Planifica con intención"}</p><h2 id="new-event-title">{isEditing ? "Editar bloque" : "Nuevo bloque"}</h2></div><button type="button" className="dialog-close" aria-label="Cerrar formulario" onClick={onClose}>×</button></div>
    <form onSubmit={submit}>
      <label className="form-field"><span>Actividad</span><input autoFocus value={title} onChange={(changeEvent) => setTitle(changeEvent.target.value)} placeholder="Ej.: Estudiar algoritmos" /></label>
      <label className="form-field"><span>Categoría</span><select value={categoryId} onChange={(changeEvent) => setCategoryId(changeEvent.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.icon} {category.name}</option>)}</select></label>
      <label className="form-field"><span>Fecha</span><input type="date" value={date} onChange={(changeEvent) => setDate(changeEvent.target.value)} /></label>
      <div className="time-fields"><label className="form-field"><span>Inicio</span><input type="time" value={startTime} onChange={(changeEvent) => setStartTime(changeEvent.target.value)} /></label><label className="form-field"><span>Término</span><input type="time" value={endTime} onChange={(changeEvent) => setEndTime(changeEvent.target.value)} /></label></div>
      <label className="form-field"><span>Espacio</span><select value={workspaceId} onChange={(changeEvent) => setWorkspaceId(changeEvent.target.value)}><option value="">Sin espacio</option>{workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.icon} {workspace.name}</option>)}</select></label>
      <label className="form-field"><span>Repetir</span><select value={repeat} onChange={(changeEvent) => setRepeat(changeEvent.target.value as RepeatOption)}><option value="none">No repetir</option><option value="daily">Diariamente</option><option value="weekdays">Días hábiles</option><option value="weekly">Semanalmente</option><option value="monthly">Mensualmente</option></select></label>
      {repeat !== "none" && <label className="form-field"><span>Repetir hasta (opcional)</span><input type="date" min={date} value={until} onChange={(changeEvent) => setUntil(changeEvent.target.value)} /></label>}
      <div className="reminder-fields"><label className="reminder-toggle"><input type="checkbox" checked={reminderEnabled} onChange={(changeEvent) => setReminderEnabled(changeEvent.target.checked)} /> Avisarme al comenzar este bloque</label></div>
      {error && <p className="form-error">{error}</p>}
      <div className="dialog-actions">{isEditing && <button type="button" className="danger-button" onClick={() => setIsDeleteConfirmationOpen(true)}>Eliminar</button>}<div className="dialog-main-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">{isEditing ? "Guardar cambios" : "Crear bloque"}</button></div></div>
    </form>
    {isDeleteConfirmationOpen && event && <div className="delete-confirmation-backdrop" role="presentation"><section className="delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><p className="delete-icon" aria-hidden="true">!</p><h3 id="delete-title">¿Eliminar bloque?</h3><p>Eliminarás “{event.title}”. Esta acción no se puede deshacer.</p><div className="delete-confirmation-actions"><button type="button" className="secondary-button" onClick={() => setIsDeleteConfirmationOpen(false)}>Conservar bloque</button><button type="button" className="delete-confirm-button" onClick={() => onDelete?.(event.id)}>Sí, eliminar</button></div></section></div>}
  </section></div>;
}
