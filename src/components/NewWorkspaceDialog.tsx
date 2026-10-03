import { useState, type FormEvent } from "react";
import type { Workspace } from "../domain/workspace";

type Props = { onClose: () => void; onSave: (workspace: Omit<Workspace, "id">) => void };
const colors = ["#38a75b", "#3a85d6", "#9457d6", "#dc7e2f", "#d95d7a", "#168a88"];

function NewWorkspaceDialog({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧪");
  const [color, setColor] = useState(colors[0]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), icon: icon.trim() || "•", color });
  }

  return <div className="dialog-backdrop"><section className="event-dialog workspace-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-title"><div className="dialog-heading"><div><p className="dialog-eyebrow">Tu propio espacio</p><h2 id="workspace-title">Crear sección</h2></div><button type="button" className="dialog-close" onClick={onClose} aria-label="Cerrar">×</button></div><form onSubmit={submit}><label className="form-field">Nombre<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Investigaciones" /></label><label className="form-field">Ícono<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={2} /></label><div className="form-field"><span>Color de los bloques</span><div className="workspace-colors">{colors.map((candidate) => <button key={candidate} type="button" className={color === candidate ? "workspace-color selected" : "workspace-color"} style={{ background: candidate }} onClick={() => setColor(candidate)} aria-label={`Usar color ${candidate}`} />)}</div></div><div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Crear espacio</button></div></form></section></div>;
}

export default NewWorkspaceDialog;
