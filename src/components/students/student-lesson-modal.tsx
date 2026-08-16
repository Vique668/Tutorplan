"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { LessonStatus } from "@/types/lesson";
import { Button } from "@/components/ui/button";
import type { Student } from "./student-types";

export type StudentLessonDraft = {
  date: string;
  startTime: string;
  duration: number;
  price: number;
  status: LessonStatus;
  notes: string;
};

type StudentLessonModalProps = {
  student: Student;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: StudentLessonDraft) => Promise<void>;
};

const lessonStatuses: { value: LessonStatus; label: string }[] = [
  { value: "scheduled", label: "Запланировано" },
  { value: "completed", label: "Проведено" },
  { value: "cancelled", label: "Отменено" },
];

export function StudentLessonModal({
  student,
  isSubmitting,
  error,
  onClose,
  onSave,
}: StudentLessonModalProps) {
  const [draft, setDraft] = useState<StudentLessonDraft>(() => createInitialDraft(student));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose]);

  function update<K extends keyof StudentLessonDraft>(field: K, value: StudentLessonDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  async function handleSubmit() {
    const nextError = validateLesson(draft);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    await onSave(draft);
  }

  return createPortal(
    <div
      className="student-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-lesson-modal-title">
        <div className="student-modal-header">
          <div><span>НОВОЕ ЗАНЯТИЕ</span><h2 id="student-lesson-modal-title">Добавить занятие</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>
        <form
          aria-busy={isSubmitting}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="student-form-grid">
            <label className="student-form-full"><span>Ученик</span><input value={`${student.firstName} ${student.lastName}`} disabled /></label>
            <label><span>Дата</span><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required disabled={isSubmitting} /></label>
            <label><span>Время начала</span><input type="time" step="300" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} required disabled={isSubmitting} /></label>
            <label><span>Продолжительность</span><select value={draft.duration} onChange={(event) => update("duration", Number(event.target.value))} required disabled={isSubmitting}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
            <label><span>Стоимость</span><div className="price-input-wrap"><input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} required disabled={isSubmitting} /><i>₽</i></div></label>
            <label className="student-form-full"><span>Статус</span><select value={draft.status} onChange={(event) => update("status", event.target.value as LessonStatus)} disabled={isSubmitting}>{lessonStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
            <label className="student-form-full"><span>Заметки</span><textarea rows={4} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Тема занятия и важные детали" disabled={isSubmitting} /></label>
          </div>
          {(validationError || error) && <p className="student-form-error" role="alert">{validationError || error}</p>}
          <div className="student-modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Создание…" : "Создать"}</Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function createInitialDraft(student: Student): StudentLessonDraft {
  const now = new Date();
  return {
    date: toLocalDateInput(now),
    startTime: "10:00",
    duration: student.lessonDuration,
    price: student.lessonPrice,
    status: "scheduled",
    notes: "",
  };
}

function validateLesson(draft: StudentLessonDraft): string | null {
  if (!draft.date) return "Укажите дату занятия.";
  if (!draft.startTime) return "Укажите время начала.";
  if (!Number.isFinite(draft.duration) || draft.duration <= 0) return "Укажите продолжительность занятия.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Стоимость должна быть неотрицательным числом.";
  return null;
}

function toLocalDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
