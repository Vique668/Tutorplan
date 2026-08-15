export type TaskPriority = "low" | "normal" | "high";
export type TutorTask = { id: string; title: string; description: string | null; dueAt: string | null; priority: TaskPriority; completed: boolean; createdAt: string; completedAt: string | null };
export type TaskDraft = { title: string; description: string; dueAt: string; priority: TaskPriority };
