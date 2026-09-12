export type TaskPriority = "high" | "medium" | "low" | "none";

export type TaskSubtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  icon: string;
  priority: TaskPriority;
  completed: boolean;
  subtasks: TaskSubtask[];
  createdAt: string;
  reminderDate?: string;
  reminderTime?: string;
  reminderNotifiedAt?: string;
};
