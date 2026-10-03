import { useState } from "react";
import type { WorkspaceNote } from "../domain/workspace-note";

type Props = {
  notes: WorkspaceNote[];
  workspaceId: string;
  onCreate: (workspaceId: string, title: string, content: string) => void;
  onUpdate: (noteId: string, title: string, content: string) => void;
  onDelete: (noteId: string) => void;
};

function WorkspaceNotes({ notes, workspaceId, onCreate, onUpdate, onDelete }: Props) {
  const [editingNote, setEditingNote] = useState<WorkspaceNote | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  function openNewNote() { setTitle(""); setContent(""); setEditingNote("new"); }
  function openNote(note: WorkspaceNote) { setTitle(note.title); setContent(note.content); setEditingNote(note); }
  function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    if (editingNote === "new") onCreate(workspaceId, title.trim(), content.trim());
    else if (editingNote) onUpdate(editingNote.id, title.trim(), content.trim());
    setEditingNote(null);
  }

  return <section className="workspace-notes"><div className="workspace-section-heading"><div><p className="module-eyebrow">Conocimiento del espacio</p><h2>Notas</h2></div><button type="button" className="secondary-button" onClick={openNewNote}>+ Nueva nota</button></div>{editingNote && <form className="note-editor" onSubmit={saveNote}><label className="form-field">Título<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Ideas para el experimento" autoFocus /></label><label className="form-field">Contenido<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribe tus apuntes aquí…" rows={8} /></label><div className="dialog-main-actions"><button type="button" className="secondary-button" onClick={() => setEditingNote(null)}>Cancelar</button><button type="submit" className="primary-button">Guardar nota</button></div></form>}{notes.length === 0 && !editingNote ? <div className="notes-empty">✎ Aún no hay notas. Guarda aquí ideas, resúmenes o apuntes de este espacio.</div> : <div className="notes-list">{notes.map((note) => <article className="note-card" key={note.id}><button type="button" className="note-card-main" onClick={() => openNote(note)}><h3>{note.title}</h3><p>{note.content || "Nota sin contenido"}</p><small>Actualizada {new Date(note.updatedAt).toLocaleDateString("es-CL")}</small></button><button type="button" className="note-delete" onClick={() => onDelete(note.id)} aria-label={`Eliminar nota ${note.title}`}>×</button></article>)}</div>}</section>;
}

export default WorkspaceNotes;
