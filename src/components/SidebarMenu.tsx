export type AppSection = "calendar" | "tasks" | "finances" | "settings";

type SidebarMenuProps = {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
  onClose: () => void;
};

const items: { id: AppSection; label: string; icon: string }[] = [
  { id: "calendar", label: "Calendario", icon: "▦" },
  { id: "tasks", label: "Tareas", icon: "✓" },
  { id: "finances", label: "Finanzas", icon: "$" },
];

function SidebarMenu({ activeSection, onSelect, onClose }: SidebarMenuProps) {
  return (
    <div className="menu-backdrop" onClick={onClose} role="presentation">
      <aside className="sidebar-menu" onClick={(event) => event.stopPropagation()}>
        <div className="sidebar-heading">
          <div>
            <p className="sidebar-brand">MyDate</p>
            <p>Organiza y ejecuta</p>
          </div>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Cerrar menú">×</button>
        </div>

        <nav aria-label="Secciones principales">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? "menu-item active" : "menu-item"}
              onClick={() => onSelect(item.id)}
            >
              <span className="menu-item-icon">{item.icon}</span>
              {item.label}
              {item.id === "finances" && <small>Próximamente</small>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="menu-item"><span className="menu-item-icon">⚙</span>Preferencias</button>
        </div>
      </aside>
    </div>
  );
}

export default SidebarMenu;
