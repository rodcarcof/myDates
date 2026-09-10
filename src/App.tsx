import { useState } from "react";
import AppHeader from "./components/AppHeader";
import CalendarToolbar, {
  type CalendarView,
} from "./components/CalendarToolbar";

function App() {
  const [selectedView, setSelectedView] = useState<CalendarView>("week");

  return (
    <main className="app-shell">
      <AppHeader />

      <CalendarToolbar
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />

      <section className="empty-calendar">
        <p>Vista seleccionada: {selectedView}</p>
      </section>
    </main>
  );
}

export default App;