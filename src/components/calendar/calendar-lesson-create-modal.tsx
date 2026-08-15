"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import { Button } from "@/components/ui/button";
import type { LessonStatus } from "@/types/lesson";
import {
  CalendarOtherEventFormFields,
  type CalendarOtherEventDraft,
  validateOtherEventDraft,
} from "./calendar-other-event-form-fields";
import { lessonStatusLabels } from "./calendar-types";
import { formatLessonEnd, timeToMinutes } from "./date-utils";

export type CalendarLessonCreateDraft = {
  studentId: string;
  date: string;
  startTime: string;
  duration: number;
  price: number;
  status: LessonStatus;
  notes: string;
};

export type CalendarOtherEventCreateDraft = CalendarOtherEventDraft;

type CreateTab = "lesson" | "other";

type CalendarLessonCreateModalProps = {
  students: Student[];
  initialDate: string;
  initialStartTime: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: CalendarLessonCreateDraft) => Promise<void>;
  onSaveOtherEvent: (draft: CalendarOtherEventCreateDraft) => Promise<void>;
};

export function CalendarLessonCreateModal({
  students,
  initialDate,
  initialStartTime,
  isSubmitting,
  error,
  onClose,
  onSave,
  onSaveOtherEvent,
}: CalendarLessonCreateModalProps) {
  const [activeTab, setActiveTab] = useState<CreateTab>("lesson");
  const [lessonDraft, setLessonDraft] = useState<CalendarLessonCreateDraft>(() => createInitialLessonDraft(students[0], initialDate, initialStartTime));
  const [otherDraft, setOtherDraft] = useState<CalendarOtherEventCreateDraft>(() => createInitialOtherDraft(initialDate, initialStartTime));
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

  function updateLesson<K extends keyof CalendarLessonCreateDraft>(field: K, value: CalendarLessonCreateDraft[K]) {
    setLessonDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function updateOther<K extends keyof CalendarOtherEventCreateDraft>(field: K, value: CalendarOtherEventCreateDraft[K]) {
    setOtherDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function selectStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    setLessonDraft((current) => ({
      ...current,
      studentId,
      duration: student?.lessonDuration ?? current.duration,
      price: student?.lessonPrice ?? current.price,
    }));
    setValidationError(null);
  }

  async function handleSubmit() {
    if (activeTab === "lesson") {
      const nextError = validateLessonDraft(lessonDraft, students);
      if (nextError) {
        setValidationError(nextError);
        return;
      }
      await onSave(lessonDraft);
      return;
    }

    const nextError = validateOtherEventDraft(otherDraft);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    await onSaveOtherEvent(otherDraft);
  }

  function selectTab(tab: CreateTab) {
    if (isSubmitting) return;
    setActiveTab(tab);
    setValidationError(null);
  }

  return createPortal(
    <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-create-event-title">
        <div className="lesson-modal-header">
          <div><span>НОВОЕ СОБЫТИЕ</span><h2 id="calendar-create-event-title">Добавить в календарь</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>

        <div className="calendar-create-tabs" role="tablist" aria-label="Тип события">
          <button type="button" role="tab" aria-selected={activeTab === "lesson"} className={activeTab === "lesson" ? "active" : ""} onClick={() => selectTab("lesson")}>Урок</button>
          <button type="button" role="tab" aria-selected={activeTab === "other"} className={activeTab === "other" ? "active" : ""} onClick={() => selectTab("other")}>Другое</button>
        </div>

        <form aria-busy={isSubmitting} onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          {activeTab === "lesson" ? (
            <>
              <div className="lesson-form-grid">
                <label className="lesson-form-full">
                  <span>Ученик</span>
                  <select value={lessonDraft.studentId} onChange={(event) => selectStudent(event.target.value)} required autoFocus disabled={isSubmitting || !students.length}>
                    {!students.length && <option value="">Нет активных учеников</option>}
                    {students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName}</option>)}
                  </select>
                </label>
                <label><span>Дата</span><input type="date" value={lessonDraft.date} onChange={(event) => updateLesson("date", event.target.value)} required disabled={isSubmitting} /></label>
                <label><span>Время начала</span><input type="time" min="08:00" max="21:30" step="1800" value={lessonDraft.startTime} onChange={(event) => updateLesson("startTime", event.target.value)} required disabled={isSubmitting} /></label>
                <label><span>Продолжительность</span><select value={lessonDraft.duration} onChange={(event) => updateLesson("duration", Number(event.target.value))} required disabled={isSubmitting}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
                <label><span>Стоимость</span><div className="price-input-wrap"><input type="number" min="0" value={lessonDraft.price} onChange={(event) => updateLesson("price", Number(event.target.value))} required disabled={isSubmitting} /><i>₽</i></div></label>
                <label className="lesson-form-full"><span>Статус</span><select value={lessonDraft.status} onChange={(event) => updateLesson("status", event.target.value as LessonStatus)} disabled={isSubmitting}>{(Object.entries(lessonStatusLabels) as [LessonStatus, string][]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                <label className="lesson-form-full"><span>Заметки</span><textarea rows={3} value={lessonDraft.notes} onChange={(event) => updateLesson("notes", event.target.value)} placeholder="Необязательно" disabled={isSubmitting} /></label>
              </div>
              <div className="lesson-form-summary"><span>{lessonDraft.startTime}–{formatLessonEnd(lessonDraft.startTime, lessonDraft.duration)}</span><strong>{lessonDraft.price.toLocaleString("ru-RU")} ₽</strong></div>
            </>
          ) : <CalendarOtherEventFormFields draft={otherDraft} disabled={isSubmitting} onChange={updateOther} />}

          {(validationError || error) && <p className="lesson-form-error" role="alert">{validationError || error}</p>}
          <div className="lesson-modal-footer"><div><Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Отмена</Button><Button type="submit" disabled={isSubmitting || (activeTab === "lesson" && !students.length)}>{isSubmitting ? "Создание…" : "Создать"}</Button></div></div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function createInitialLessonDraft(student: Student | undefined, date: string, startTime: string): CalendarLessonCreateDraft {
  return {
    studentId: student?.id ?? "",
    date,
    startTime,
    duration: student?.lessonDuration ?? 60,
    price: student?.lessonPrice ?? 0,
    status: "scheduled",
    notes: "",
  };
}

function createInitialOtherDraft(date: string, startTime: string): CalendarOtherEventCreateDraft {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59);
  return {
    title: "",
    date,
    startTime,
    endTime: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
    notes: "",
  };
}

function validateLessonDraft(draft: CalendarLessonCreateDraft, students: Student[]): string | null {
  if (!students.some((student) => student.id === draft.studentId)) return "Выберите ученика.";
  if (!draft.date) return "Укажите дату урока.";
  if (!draft.startTime) return "Укажите время начала.";
  if (!Number.isFinite(draft.duration) || draft.duration <= 0) return "Укажите продолжительность урока.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Стоимость должна быть неотрицательным числом.";
  const startMinutes = timeToMinutes(draft.startTime);
  if (startMinutes < 8 * 60 || startMinutes + draft.duration > 22 * 60) return "Урок должен находиться в пределах календаря с 08:00 до 22:00.";
  return null;
}
