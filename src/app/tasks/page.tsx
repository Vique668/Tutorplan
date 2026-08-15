"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, CircleAlert, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { TaskDraft, TutorTask } from "@/types/task";
import { createTask, deleteTask, getTasks, setTaskCompleted, updateTask } from "../../../lib/supabase/tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TutorTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TutorTask | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => { setIsLoading(true); setError(null); try { setTasks(await getTasks()); } catch (loadError) { setError(getErrorMessage(loadError)); } finally { setIsLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(draft: TaskDraft) { setIsSubmitting(true); setSubmitError(null); try { const saved = selected ? await updateTask(selected.id, draft) : await createTask(draft); setTasks((current) => selected ? current.map((task) => task.id === saved.id ? saved : task) : [saved, ...current]); setSelected(undefined); } catch (saveError) { setSubmitError(getErrorMessage(saveError)); } finally { setIsSubmitting(false); } }
  async function toggle(task: TutorTask) { setError(null); try { const updated = await setTaskCompleted(task.id, !task.completed); setTasks((current) => current.map((item) => item.id === updated.id ? updated : item)); } catch (toggleError) { setError(getErrorMessage(toggleError)); } }
  async function remove(task: TutorTask) { if (!window.confirm(`Удалить задачу «${task.title}»?`)) return; setIsSubmitting(true); setSubmitError(null); try { await deleteTask(task.id); setTasks((current) => current.filter((item) => item.id !== task.id)); setSelected(undefined); } catch (deleteError) { setSubmitError(getErrorMessage(deleteError)); } finally { setIsSubmitting(false); } }

  const active = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);
  return <div className="page-stack"><PageHeader title="Задачи" description="Личные напоминания и подготовка к занятиям" actions={<Button icon={<Plus size={18} />} onClick={() => { setSubmitError(null); setSelected(null); }}>Новая задача</Button>} />
    {isLoading && <Card><div className="students-empty-state"><LoaderCircle className="spin" size={28} /><h2>Загружаем задачи</h2></div></Card>}
    {error && <Card><div className="students-empty-state" role="alert"><CircleAlert size={28} /><h2>Не удалось загрузить задачи</h2><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Повторить</Button></div></Card>}
    {!isLoading && !error && <Card className="tasks-card">{active.length === 0 && completed.length === 0 && <div className="students-empty-state"><CheckCircle2 size={30} /><h2>Задач пока нет</h2><p>Добавьте первую задачу или напоминание.</p></div>}{active.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void toggle(task)} onEdit={() => { setSubmitError(null); setSelected(task); }} />)}{completed.length > 0 && <div className="tasks-section-title">Выполнено · {completed.length}</div>}{completed.map((task) => <TaskRow key={task.id} task={task} onToggle={() => void toggle(task)} onEdit={() => { setSubmitError(null); setSelected(task); }} />)}</Card>}
    {selected !== undefined && <TaskModal task={selected} isSubmitting={isSubmitting} error={submitError} onClose={() => { if (!isSubmitting) setSelected(undefined); }} onSave={save} onDelete={selected ? () => void remove(selected) : undefined} />}
  </div>;
}

function TaskRow({ task, onToggle, onEdit }: { task: TutorTask; onToggle: () => void; onEdit: () => void }) { return <div className={`task-row ${task.completed ? "task-done" : ""}`}><button className="task-complete-button" onClick={onToggle} aria-label={task.completed ? "Вернуть задачу" : "Выполнить задачу"}>{task.completed ? <CheckCircle2 size={21} /> : <Circle size={21} />}</button><button className="task-content-button" onClick={onEdit}><strong>{task.title}</strong><small>{task.dueAt ? formatDeadline(task.dueAt) : "Без срока"}{task.priority === "high" ? " · Высокий приоритет" : ""}</small></button><button className="icon-button" onClick={onEdit} aria-label={`Редактировать ${task.title}`}><Pencil size={16} /></button></div>; }

function TaskModal({ task, isSubmitting, error, onClose, onSave, onDelete }: { task: TutorTask | null; isSubmitting: boolean; error: string | null; onClose: () => void; onSave: (draft: TaskDraft) => Promise<void>; onDelete?: () => void }) {
  const [draft, setDraft] = useState<TaskDraft>(() => ({ title: task?.title ?? "", description: task?.description ?? "", dueAt: task?.dueAt ? toLocalDateTime(task.dueAt) : "", priority: task?.priority ?? "normal" }));
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setValidationError(null); };
  function submit(event: FormEvent) { event.preventDefault(); if (!(draft.title?.trim() ?? "")) return setValidationError("Укажите название задачи."); void onSave(draft); }
  return <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title"><div className="lesson-modal-header"><div><span>ЛИЧНАЯ ЗАДАЧА</span><h2 id="task-modal-title">{task ? "Редактировать задачу" : "Новая задача"}</h2></div><button className="icon-button" onClick={onClose} disabled={isSubmitting} aria-label="Закрыть"><X size={20} /></button></div><form onSubmit={submit}><div className="lesson-form-grid"><label className="lesson-form-full"><span>Название</span><input value={draft.title} onChange={(event) => update("title", event.target.value)} autoFocus /></label><label><span>Срок</span><input type="datetime-local" value={draft.dueAt} onChange={(event) => update("dueAt", event.target.value)} /></label><label><span>Приоритет</span><select value={draft.priority} onChange={(event) => update("priority", event.target.value as TaskDraft["priority"])}><option value="low">Низкий</option><option value="normal">Обычный</option><option value="high">Высокий</option></select></label><label className="lesson-form-full"><span>Описание</span><textarea rows={4} value={draft.description} onChange={(event) => update("description", event.target.value)} /></label></div>{(validationError || error) && <p className="lesson-form-error">{validationError || error}</p>}<div className="lesson-modal-footer">{onDelete && <Button type="button" variant="ghost" icon={<Trash2 size={16} />} onClick={onDelete}>Удалить</Button>}<div><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Сохранение…" : "Сохранить"}</Button></div></div></form></section></div>;
}

function formatDeadline(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function toLocalDateTime(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function getErrorMessage(error: unknown) { if (error instanceof Error) return error.message; if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message; return "Неизвестная ошибка Supabase"; }
