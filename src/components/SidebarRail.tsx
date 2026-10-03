import type { AppSection } from "./SidebarMenu";
import type { Workspace } from "../domain/workspace";
import type { User } from "@supabase/supabase-js";

type SidebarRailProps = {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  user: User;
};

const items: { id: AppSection; label: string; icon: string; soon?: boolean }[] = [
  { id: "calendar", label: "Calendario", icon: "▦" },
  { id: "tasks", label: "Tareas", icon: "✓" },
  { id: "finances", label: "Finanzas", icon: "$", soon: true },
];

function SidebarRail({ activeSection, onSelect, workspaces, activeWorkspaceId, onSelectWorkspace, onCreateWorkspace, user }: SidebarRailProps) {
  const name = String(user.user_metadata.display_name || user.user_metadata.full_name || user.email?.split("@")[0] || "Usuario");
  const avatarUrl = typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : undefined;
  return (
    <aside className="sidebar-rail" aria-label="Navegación principal">
      <div className="rail-account" title={`${name} · ${user.email ?? ""}`}>
        {avatarUrl ? <img className="rail-avatar" src={avatarUrl} alt={`Foto de ${name}`} /> : <span className="rail-avatar rail-avatar-fallback">{name.charAt(0).toUpperCase()}</span>}
        <div className="rail-account-details"><strong>{name}</strong><small>{user.email}</small></div>
      </div>

      <nav className="rail-navigation">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activeSection === item.id ? "rail-item active" : "rail-item"}
            onClick={() => onSelect(item.id)}
            aria-label={item.label}
          >
            <span className="rail-icon">{item.icon}</span>
            <span className="rail-label">{item.label}</span>
            {item.soon && <small className="rail-soon">Próximamente</small>}
          </button>
        ))}
      </nav>

      <div className="rail-workspaces"><div className="rail-workspaces-heading"><span>Espacios</span><button type="button" onClick={onCreateWorkspace} aria-label="Crear espacio">+</button></div>{workspaces.map((workspace) => <button key={workspace.id} type="button" className={activeWorkspaceId === workspace.id ? "rail-item workspace active" : "rail-item workspace"} onClick={() => onSelectWorkspace(workspace.id)}><span className="rail-icon" style={{ color: workspace.color }}>{workspace.icon}</span><span className="rail-label">{workspace.name}</span></button>)}</div>

      <button type="button" className={activeSection === "settings" ? "rail-item rail-settings active" : "rail-item rail-settings"} aria-label="Preferencias" onClick={() => onSelect("settings")}>
        <span className="rail-icon">⚙</span>
        <span className="rail-label">Preferencias</span>
      </button>
    </aside>
  );
}

export default SidebarRail;
