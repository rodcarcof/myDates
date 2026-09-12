type AppHeaderProps = {
  onNewBlock: () => void;
  showNewBlock: boolean;
};

function AppHeader({ onNewBlock, showNewBlock }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="header-identity">
        <div>
          <p className="brand">MyDate</p>
          <p className="brand-subtitle">Tu semana, en movimiento</p>
        </div>
      </div>

      {showNewBlock && <button type="button" className="primary-button" onClick={onNewBlock}>+ Nuevo bloque</button>}
    </header>
  );
}

export default AppHeader;
