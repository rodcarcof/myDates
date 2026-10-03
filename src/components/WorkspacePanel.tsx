import type { Task } from "../domain/task";
import type { Workspace } from "../domain/workspace";
import type { WorkspaceNote } from "../domain/workspace-note";
import TasksPanel from "./TasksPanel";
import WorkspaceNotes from "./WorkspaceNotes";

type Props = {
  workspace: Workspace;
  tasks: Task[];
  onCreateBlock: () => void;
  notificationPermission: NotificationPermission | "unsupported";
  onRequestNotifications: () => void;
  onCreateTask: (input: Omit<Task, "id" | "completed" | "subtasks" | "createdAt">) => void;
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
  notes: WorkspaceNote[];
  onCreateNote: (workspaceId: string, title: string, content: string) => void;
  onUpdateNote: (noteId: string, title: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
};

function WorkspacePanel({ workspace, tasks, onCreateBlock, notificationPermission, onRequestNotifications, onCreateTask, onToggleTask, onToggleSubtask, onAddSubtask, onDeleteTask, notes, onCreateNote, onUpdateNote, onDeleteNote }: Props) {
  return <section className="workspace-module"><div className="workspace-hero" style={{ "--workspace-color": workspace.color } as React.CSSProperties}><span>{workspace.icon}</span><div><p className="module-eyebrow">Espacio personalizado</p><h1>{workspace.name}</h1><p>{workspace.description || "Organiza aquí tareas, bloques y recursos de esta área."}</p></div><button type="button" className="primary-button" onClick={onCreateBlock}>+ Bloque al calendario</button></div><WorkspaceNotes notes={notes} workspaceId={workspace.id} onCreate={onCreateNote} onUpdate={onUpdateNote} onDelete={onDeleteNote} /><TasksPanel tasks={tasks} workspaceId={workspace.id} heading={`Tareas de ${workspace.name}`} description="Crea tareas y subtareas que pertenezcan solo a este espacio." notificationPermission={notificationPermission} onRequestNotifications={onRequestNotifications} onCreate={onCreateTask} onToggleTask={onToggleTask} onToggleSubtask={onToggleSubtask} onAddSubtask={onAddSubtask} onDeleteTask={onDeleteTask} /></section>;
}

export default WorkspacePanel;
