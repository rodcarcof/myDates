export type CalendarCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export const defaultCalendarCategories: CalendarCategory[] = [
  { id: "category-focus", name: "Enfoque", icon: "◎", color: "#d7e7ff" },
  { id: "category-work", name: "Trabajo", icon: "▣", color: "#ffe9ae" },
  { id: "category-health", name: "Salud", icon: "♥", color: "#f9d9d1" },
  { id: "category-personal", name: "Personal", icon: "●", color: "#eee1ff" },
];
