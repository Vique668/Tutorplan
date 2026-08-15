import type { TaskDraft, TaskPriority, TutorTask } from "../../src/types/task";
import { createClient } from "./client";

const columns = "id,title,description,due_at,priority,completed,created_at,completed_at" as const;
type TaskRow = { id: string; title: string; description: string | null; due_at: string | null; priority: TaskPriority; completed: boolean; created_at: string; completed_at: string | null };

export async function getTasks(): Promise<TutorTask[]> { const { data, error } = await createClient().from("tasks").select(columns).order("completed", { ascending: true }).order("due_at", { ascending: true, nullsFirst: false }); if (error) throw error; return (data as TaskRow[]).map(toTask); }
export async function createTask(draft: TaskDraft): Promise<TutorTask> { const { data, error } = await createClient().from("tasks").insert(toPayload(draft)).select(columns).single(); if (error) throw error; return toTask(data as TaskRow); }
export async function updateTask(id: string, draft: TaskDraft): Promise<TutorTask> { const { data, error } = await createClient().from("tasks").update(toPayload(draft)).eq("id", id).select(columns).single(); if (error) throw error; return toTask(data as TaskRow); }
export async function setTaskCompleted(id: string, completed: boolean): Promise<TutorTask> { const { data, error } = await createClient().from("tasks").update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq("id", id).select(columns).single(); if (error) throw error; return toTask(data as TaskRow); }
export async function deleteTask(id: string): Promise<void> { const { data, error } = await createClient().from("tasks").delete().eq("id", id).select("id").single(); if (error) throw error; if (data.id !== id) throw new Error("Supabase did not delete the task"); }
function toPayload(draft: TaskDraft) { return { title: draft.title?.trim() ?? "", description: emptyToNull(draft.description), due_at: draft.dueAt ? new Date(draft.dueAt).toISOString() : null, priority: draft.priority }; }
function toTask(row: TaskRow): TutorTask { return { id: row.id, title: row.title, description: row.description, dueAt: row.due_at, priority: row.priority, completed: row.completed, createdAt: row.created_at, completedAt: row.completed_at }; }
function emptyToNull(value?: string | null) { const normalized = value?.trim() ?? ""; return normalized || null; }
