export type CalendarView = "day" | "three-days" | "five-days" | "week";

type Props = {
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  calendarStartDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onDateChange: (value: string) => void;
};

const views: { label: string; value: CalendarView; days: number }[] = [
  { label: "Día", value: "day", days: 1 },
  { label: "3 días", value: "three-days", days: 3 },
  { label: "5 días", value: "five-days", days: 5 },
  { label: "Semana", value: "week", days: 7 },
];

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function titleForRange(start: Date, length: number) {
  const end = new Date(start);
  end.setDate(start.getDate() + length - 1);
  const format = (date: Date) => date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  return length === 1 ? format(start) : `${format(start)} – ${format(end)}`;
}

function CalendarToolbar({ selectedView, onViewChange, calendarStartDate, onPrevious, onNext, onToday, onDateChange }: Props) {
  const selectedLength = views.find((view) => view.value === selectedView)?.days ?? 7;

  return <section className="calendar-toolbar">
    <div className="date-navigation">
      <button type="button" className="date-arrow" onClick={onPrevious} aria-label="Período anterior">‹</button>
      <button type="button" className="date-arrow" onClick={onNext} aria-label="Período siguiente">›</button>
      <button type="button" className="today-button" onClick={onToday}>Hoy</button>
      <h1>{titleForRange(calendarStartDate, selectedLength)}</h1>
      <input className="date-jump" type="date" value={localDateValue(calendarStartDate)} onChange={(event) => onDateChange(event.target.value)} aria-label="Ir a una fecha" />
    </div>

    <div className="view-selector">{views.map((view) => <button key={view.value} type="button" className={selectedView === view.value ? "view-button active" : "view-button"} onClick={() => onViewChange(view.value)}>{view.label}</button>)}</div>
  </section>;
}

export default CalendarToolbar;
