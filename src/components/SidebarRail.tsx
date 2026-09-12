import type { AppSection } from "./SidebarMenu";

type SidebarRailProps = {
  activeSection: AppSection;
  onSelect: (section: AppSection) => void;
};

const items: { id: AppSection; label: string; icon: string; soon?: boolean }[] = [
  { id: "calendar", label: "Calendario", icon: "▦" },
  { id: "tasks", label: "Tareas", icon: "✓" },
  { id: "finances", label: "Finanzas", icon: "$", soon: true },
];

function SidebarRail({ activeSection, onSelect }: SidebarRailProps) {
  return (
    <aside className="sidebar-rail" aria-label="Navegación principal">
      <div className="rail-logo" aria-label="MyDate">M</div>

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

      <button type="button" className={activeSection === "settings" ? "rail-item rail-settings active" : "rail-item rail-settings"} aria-label="Preferencias" onClick={() => onSelect("settings")}>
        <span className="rail-icon">⚙</span>
        <span className="rail-label">Preferencias</span>
      </button>
    </aside>
  );
}

export default SidebarRail;
