function AppHeader() {
  return (
    <header className="app-header">
      <div>
        <p className="brand">MyDate</p>
        <p className="brand-subtitle">Tu semana, en movimiento</p>
      </div>

      <button type="button" className="primary-button">
        + Nuevo bloque
      </button>
    </header>
  );
}

export default AppHeader;