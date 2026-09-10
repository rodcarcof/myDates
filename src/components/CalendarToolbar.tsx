export type CalendarView = "day" | "three-days" | "five-days" | "week";

type CalendarToolbarProps = {
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
};

const views: { label: string; value: CalendarView }[] = [
  { label: "Día", value: "day" },
  { label: "3 días", value: "three-days" },
  { label: "5 días", value: "five-days" },
  { label: "Semana", value: "week" },
];

function CalendarToolbar({
  selectedView,
  onViewChange,
}: CalendarToolbarProps) {
  return (
    <section className="calendar-toolbar">
      <h1>14 – 20 septiembre</h1>

      <div className="view-selector">
        {views.map((view) => (
          <button
            key={view.value}
            type="button"
            className={selectedView === view.value ? "view-button active" : "view-button"}
            onClick={() => onViewChange(view.value)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default CalendarToolbar;