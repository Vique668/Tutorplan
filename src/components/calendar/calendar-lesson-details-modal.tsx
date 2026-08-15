"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import { Button } from "@/components/ui/button";
import type { CalendarLesson, LessonStatus } from "./calendar-types";
import { lessonStatusLabels } from "./calendar-types";
import { formatLessonEnd, timeToMinutes } from "./date-utils";

export type CalendarLessonEditDraft = {
  studentId: string;
  date: string;
  startTime: string;
  duration: number;
  price: number;
  status: LessonStatus;
  notes: string;
};

type CalendarLessonDetailsModalProps = {
  lesson: CalendarLesson;
  students: Student[];
  isMutating: boolean;
  error: string | null;
  onClose: () => void;
  onUpdate: (draft: CalendarLessonEditDraft) => Promise<void>;
  onCancelLesson: () => Promise<void>;
  onRestoreLesson: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function CalendarLessonDetailsModal({
  lesson,
  students,
  isMutating,
  error,
  onClose,
  onUpdate,
  onCancelLesson,
  onRestoreLesson,
  onDelete,
}: CalendarLessonDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [draft, setDraft] = useState<CalendarLessonEditDraft>(() => toEditDraft(lesson));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toEditDraft(lesson));
    setEditing(false);
    setConfirmingDelete(false);
    setConfirmingRestore(false);
    setValidationError(null);
  }, [lesson]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isMutating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMutating, onClose]);

  function update<K extends keyof CalendarLessonEditDraft>(field: K, value: CalendarLessonEditDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function selectStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    setDraft((current) => ({
      ...current,
      studentId,
      duration: student?.lessonDuration ?? current.duration,
      price: student?.lessonPrice ?? current.price,
    }));
    setValidationError(null);
  }

  async function submitEdit() {
    const nextError = validateDraft(draft, students);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    await onUpdate(draft);
  }

  return createPortal(
    <div
      className="lesson-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isMutating) onClose();
      }}
    >
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-lesson-details-title">
        <div className="lesson-modal-header">
          <div><span>{editing ? "РЕДАКТИРОВАНИЕ" : "ИНФОРМАЦИЯ ОБ УРОКЕ"}</span><h2 id="calendar-lesson-details-title">{editing ? "Изменить урок" : lesson.participant}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isMutating}><X size={20} /></button>
        </div>

        {editing ? (
          <form
            aria-busy={isMutating}
            onSubmit={(event) => {
              event.preventDefault();
              void submitEdit();
            }}
          >
            <div className="lesson-form-grid">
              <label className="lesson-form-full"><span>Ученик</span><select value={draft.studentId} onChange={(event) => selectStudent(event.target.value)} required disabled={isMutating}>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName}</option>)}</select></label>
              <label><span>Дата</span><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required disabled={isMutating} /></label>
              <label><span>Время начала</span><input type="time" min="08:00" max="21:30" step="1800" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} required disabled={isMutating} /></label>
              <label><span>Продолжительность</span><select value={draft.duration} onChange={(event) => update("duration", Number(event.target.value))} disabled={isMutating}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
              <label><span>Стоимость</span><div className="price-input-wrap"><input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} required disabled={isMutating} /><i>₽</i></div></label>
              <label className="lesson-form-full"><span>Статус</span><select value={draft.status} onChange={(event) => update("status", event.target.value as LessonStatus)} disabled={isMutating}>{(Object.entries(lessonStatusLabels) as [LessonStatus, string][]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="lesson-form-full"><span>Заметки</span><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} disabled={isMutating} /></label>
            </div>
            <div className="lesson-form-summary"><span>{draft.startTime}–{formatLessonEnd(draft.startTime, draft.duration)}</span><strong>{draft.price.toLocaleString("ru-RU")} ₽</strong></div>
            {(validationError || error) && <p className="lesson-form-error" role="alert">{validationError || error}</p>}
            <div className="lesson-modal-footer"><div><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={isMutating}>Отмена</Button><Button type="submit" disabled={isMutating}>{isMutating ? "Сохранение…" : "Сохранить"}</Button></div></div>
          </form>
        ) : (
          <div className="lesson-details-content" aria-busy={isMutating}>
            <div className="lesson-details-grid">
              <div className="lesson-details-full"><span>Ученик</span><strong>{lesson.participant}</strong></div>
              <div><span>Дата</span><strong>{formatDate(lesson.date)}</strong></div>
              <div><span>Время</span><strong>{lesson.startTime}–{formatLessonEnd(lesson.startTime, lesson.duration)}</strong></div>
              <div><span>Стоимость</span><strong>{lesson.price.toLocaleString("ru-RU")} ₽</strong></div>
              <div><span>Статус</span><strong>{lessonStatusLabels[lesson.status]}</strong></div>
              <div className="lesson-details-full"><span>Заметки</span><strong>{lesson.notes || "Заметок нет"}</strong></div>
            </div>

            {error && <p className="lesson-form-error" role="alert">{error}</p>}
            {confirmingDelete && <div className="lesson-delete-confirmation"><strong>Удалить этот урок без возможности восстановления?</strong><div><Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={isMutating}>Не удалять</Button><Button type="button" className="confirm-delete-button" onClick={() => void onDelete()} disabled={isMutating}>{isMutating ? "Удаление…" : "Удалить"}</Button></div></div>}
            {confirmingRestore && <div className="lesson-restore-confirmation"><strong>Вернуть это занятие в расписание?</strong><div><Button type="button" variant="secondary" onClick={() => setConfirmingRestore(false)} disabled={isMutating}>Не возвращать</Button><Button type="button" onClick={() => void onRestoreLesson()} disabled={isMutating}>{isMutating ? "Возвращение…" : "Вернуть урок"}</Button></div></div>}

            {!confirmingDelete && !confirmingRestore && (
              <div className="lesson-details-actions">
                <Button type="button" variant="ghost" className="delete-lesson-button" icon={<Trash2 size={16} />} onClick={() => setConfirmingDelete(true)} disabled={isMutating}>Удалить</Button>
                <div>
                  {lesson.status === "cancelled" ? (
                    <Button type="button" variant="secondary" icon={<RotateCcw size={16} />} onClick={() => setConfirmingRestore(true)} disabled={isMutating}>Вернуть урок</Button>
                  ) : (
                    <Button type="button" variant="secondary" icon={<Ban size={16} />} onClick={() => void onCancelLesson()} disabled={isMutating}>{isMutating ? "Сохранение…" : "Отменить урок"}</Button>
                  )}
                  <Button type="button" icon={<Pencil size={16} />} onClick={() => setEditing(true)} disabled={isMutating}>Редактировать</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

function toEditDraft(lesson: CalendarLesson): CalendarLessonEditDraft {
  return {
    studentId: lesson.studentId ?? "",
    date: lesson.date,
    startTime: lesson.startTime,
    duration: lesson.duration,
    price: lesson.price,
    status: lesson.status,
    notes: lesson.notes ?? "",
  };
}

function validateDraft(draft: CalendarLessonEditDraft, students: Student[]): string | null {
  if (!students.some((student) => student.id === draft.studentId)) return "Выберите ученика.";
  if (!draft.date || !draft.startTime) return "Укажите дату и время урока.";
  if (!Number.isFinite(draft.duration) || draft.duration <= 0) return "Укажите продолжительность урока.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Стоимость должна быть неотрицательным числом.";
  const startMinutes = timeToMinutes(draft.startTime);
  if (startMinutes < 8 * 60 || startMinutes + draft.duration > 22 * 60) return "Урок должен находиться в пределах календаря с 08:00 до 22:00.";
  return null;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}
