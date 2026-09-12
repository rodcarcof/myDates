type CalendarSettingsProps = {
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
  onBack: () => void;
};

function CalendarSettings({ startHour, endHour, onStartHourChange, onEndHourChange, onBack }: CalendarSettingsProps) {
  const hours = Array.from({ length: 24 }, (_, hour) => hour);

  return <section className="settings-module">
    <button type="button" className="settings-back" onClick={onBack}>‹ Volver al calendario</button>
    <p className="module-eyebrow">Ajustes</p>
    <h1>Calendario</h1>
    <p className="settings-description">Define el rango horario que quieres ver al abrir tu calendario. No modifica la duración de tus bloques.</p>
    <div className="settings-card">
      <div><h2>Horario visible</h2><p>Desde qué hora comienza y hasta qué hora termina la grilla diaria.</p></div>
      <div className="settings-hour-range">
        <label className="form-field"><span>Desde</span><select value={startHour} onChange={(event) => onStartHourChange(Number(event.target.value))}>{hours.filter((hour) => hour < endHour).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        <span className="settings-separator">hasta</span>
        <label className="form-field"><span>Hasta</span><select value={endHour} onChange={(event) => onEndHourChange(Number(event.target.value))}>{hours.filter((hour) => hour > startHour).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
      </div>
      <p className="settings-save-note">Los cambios se guardan automáticamente en este dispositivo.</p>
    </div>
  </section>;
}

export default CalendarSettings;
