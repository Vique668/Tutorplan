"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Power, Trash2, X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import { Button } from "@/components/ui/button";
import type {
  CreateLessonSeriesInput,
  LessonSeries,
  LessonSeriesUpdateOptions,
  LessonSeriesUpdateScope,
} from "@/types/lesson-series";
import { formatLessonEnd, timeToMinutes } from "@/components/calendar/date-utils";

type ScheduleFormModalProps = {
  students: Student[];
  initialStartDate: string;
  initialWeekday: number;
  isSubmitting: boolean;
  error: string | null;
  series?: LessonSeries;
  onClose: () => void;
  onSave: (draft: CreateLessonSeriesInput, options?: LessonSeriesUpdateOptions) => Promise<void>;
  onDelete?: () => Promise<void>;
  onToggle?: () => Promise<void>;
};

export function ScheduleFormModal({
  students,
  initialStartDate,
  initialWeekday,
  isSubmitting,
  error,
  series,
  onClose,
  onSave,
  onDelete,
  onToggle,
}: ScheduleFormModalProps) {
  const [draft, setDraft] = useState<CreateLessonSeriesInput>(() => series ? toDraft(series) : createInitialDraft(students[0], initialStartDate, initialWeekday));
  const [editing, setEditing] = useState(!series);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [updateScope, setUpdateScope] = useState<LessonSeriesUpdateScope>("template");
  const [futureFromDate, setFutureFromDate] = useState(initialStartDate);

  useEffect(() => {
    if (series) setDraft(toDraft(series));
    setEditing(!series);
    setConfirmingDelete(false);
    setValidationError(null);
    setUpdateScope("template");
    setFutureFromDate(initialStartDate);
  }, [initialStartDate, series]);

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

  function update<K extends keyof CreateLessonSeriesInput>(field: K, value: CreateLessonSeriesInput[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "startTime" || field === "endTime") {
        next.duration = Math.max(0, timeToMinutes(next.endTime) - timeToMinutes(next.startTime));
      }
      return next;
    });
    setValidationError(null);
  }

  function selectStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    setDraft((current) => ({
      ...current,
      studentId,
      price: student?.lessonPrice ?? current.price,
    }));
    setValidationError(null);
  }

  async function submit() {
    const nextError = validateDraft(draft, students);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    if (series && updateScope === "from_date" && !futureFromDate) {
      setValidationError("Укажите дату, начиная с которой нужно изменить уроки.");
      return;
    }
    await onSave(draft, series ? {
      scope: updateScope,
      fromDate: updateScope === "from_date" ? futureFromDate : null,
    } : undefined);
  }

  const student = students.find((item) => item.id === draft.studentId);
  const title = series ? (editing ? "Редактировать расписание" : "Расписание") : "Добавить в расписание";

  return createPortal(
    <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose();
    }}>
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-form-title">
        <div className="lesson-modal-header">
          <div><span>ШАБЛОН НЕДЕЛИ</span><h2 id="schedule-form-title">{title}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>

        {series && !editing ? (
          <div className="lesson-details-content" aria-busy={isSubmitting}>
            <div className="lesson-details-grid">
              <div className="lesson-details-full"><span>Ученик</span><strong>{student ? `${student.firstName} ${student.lastName}` : "Ученик не найден"}</strong></div>
              <div><span>День недели</span><strong>{weekdays[draft.weekday - 1]?.label}</strong></div>
              <div><span>Начало</span><strong>{draft.startTime}</strong></div>
              <div><span>Продолжительность</span><strong>{formatDuration(draft.duration)}</strong></div>
              <div><span>Окончание</span><strong>{draft.endTime}</strong></div>
              <div><span>Стоимость</span><strong>{draft.price.toLocaleString("ru-RU")} ₽</strong></div>
              <div><span>Дата начала</span><strong>{formatDate(draft.startDate)}</strong></div>
              <div><span>Дата окончания</span><strong>{draft.endDate ? formatDate(draft.endDate) : "Без ограничения"}</strong></div>
              <div className="lesson-details-full"><span>Состояние</span><strong>{draft.isActive ? "Активно" : "Отключено"}</strong></div>
            </div>

            {error && <p className="lesson-form-error" role="alert">{error}</p>}
            {confirmingDelete && <div className="lesson-delete-confirmation"><strong>Удалить это правило расписания?</strong><div><Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={isSubmitting}>Не удалять</Button><Button type="button" className="confirm-delete-button" onClick={() => void onDelete?.()} disabled={isSubmitting}>{isSubmitting ? "Удаление…" : "Удалить"}</Button></div></div>}

            {!confirmingDelete && <div className="lesson-details-actions">
              <Button type="button" variant="ghost" className="delete-lesson-button" icon={<Trash2 size={16} />} onClick={() => setConfirmingDelete(true)} disabled={isSubmitting}>Удалить</Button>
              <div>
                <Button type="button" variant="secondary" icon={<Power size={16} />} onClick={() => void onToggle?.()} disabled={isSubmitting}>{isSubmitting ? "Сохранение…" : draft.isActive ? "Отключить" : "Включить"}</Button>
                <Button type="button" icon={<Pencil size={16} />} onClick={() => setEditing(true)} disabled={isSubmitting}>Редактировать</Button>
              </div>
            </div>}
          </div>
        ) : (
          <form aria-busy={isSubmitting} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <div className="lesson-form-grid">
              <label className="lesson-form-full">
                <span>Ученик</span>
                <select value={draft.studentId} onChange={(event) => selectStudent(event.target.value)} required disabled={isSubmitting || !students.length} autoFocus>
                  {!students.length && <option value="">Нет активных учеников</option>}
                  {students.map((item) => <option value={item.id} key={item.id}>{item.firstName} {item.lastName}</option>)}
                </select>
              </label>
              <label><span>День недели</span><select value={draft.weekday} onChange={(event) => update("weekday", Number(event.target.value))} disabled={isSubmitting}>{weekdays.map((day) => <option value={day.value} key={day.value}>{day.label}</option>)}</select></label>
              <label><span>Время начала</span><input type="time" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} required disabled={isSubmitting} /></label>
              <label><span>Стоимость</span><div className="price-input-wrap"><input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} required disabled={isSubmitting} /><i>₽</i></div></label>
              <label><span>Время окончания</span><input type="time" value={draft.endTime} onChange={(event) => update("endTime", event.target.value)} required disabled={isSubmitting} /></label>
              <div className="schedule-duration-preview"><span>Продолжительность</span><strong>{draft.duration > 0 ? formatDuration(draft.duration) : "Укажите корректное время"}</strong></div>
              <label><span>Дата начала</span><input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} required disabled={isSubmitting} /></label>
              <label><span>Дата окончания</span><input type="date" min={draft.startDate} value={draft.endDate ?? ""} onChange={(event) => update("endDate", event.target.value || null)} disabled={isSubmitting} /><small className="lesson-field-hint">Необязательно</small></label>
              <label className="lesson-form-full schedule-active-field"><input type="checkbox" checked={draft.isActive} onChange={(event) => update("isActive", event.target.checked)} disabled={isSubmitting} /><span><strong>Расписание активно</strong><small>Отключённое правило не занимает время в недельном шаблоне</small></span></label>
            </div>

            {series && <fieldset className="series-scope-fieldset schedule-update-scope">
              <legend>Изменить:</legend>
              <label><input type="radio" name="schedule-update-scope" checked={updateScope === "template"} onChange={() => setUpdateScope("template")} disabled={isSubmitting} /><span><strong>Только шаблон</strong><small>Существующие уроки останутся без изменений</small></span></label>
              <label><input type="radio" name="schedule-update-scope" checked={updateScope === "all_future"} onChange={() => setUpdateScope("all_future")} disabled={isSubmitting} /><span><strong>Все будущие уроки</strong><small>Завершённые уроки не изменятся</small></span></label>
              <label><input type="radio" name="schedule-update-scope" checked={updateScope === "from_date"} onChange={() => setUpdateScope("from_date")} disabled={isSubmitting} /><span><strong>Будущие уроки начиная с даты</strong><small>Изменения применятся с выбранной даты</small></span></label>
              {updateScope === "from_date" && <label className="schedule-scope-date"><span>Дата начала изменений</span><input type="date" value={futureFromDate} onChange={(event) => setFutureFromDate(event.target.value)} required disabled={isSubmitting} /></label>}
            </fieldset>}

            {(validationError || error) && <p className="lesson-form-error" role="alert">{validationError || error}</p>}
            <div className="lesson-modal-footer"><div><Button type="button" variant="secondary" onClick={() => series ? setEditing(false) : onClose()} disabled={isSubmitting}>Отмена</Button><Button type="submit" disabled={isSubmitting || !students.length}>{isSubmitting ? "Сохранение…" : series ? "Сохранить" : "Создать"}</Button></div></div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}

const weekdays = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

function createInitialDraft(student: Student | undefined, startDate: string, weekday: number): CreateLessonSeriesInput {
  const duration = student?.lessonDuration ?? 60;
  return {
    studentId: student?.id ?? "",
    weekday,
    startTime: "10:00",
    endTime: formatLessonEnd("10:00", duration),
    duration,
    price: student?.lessonPrice ?? 0,
    startDate,
    endDate: null,
    isActive: true,
  };
}

function toDraft(series: LessonSeries): CreateLessonSeriesInput {
  const endTime = series.endTime ?? formatLessonEnd(series.startTime, series.duration);
  return {
    studentId: series.studentId,
    weekday: series.weekday,
    startTime: series.startTime,
    endTime,
    duration: timeToMinutes(endTime) - timeToMinutes(series.startTime),
    price: series.price,
    startDate: series.startDate,
    endDate: series.endDate,
    isActive: series.isActive,
  };
}

function validateDraft(draft: CreateLessonSeriesInput, students: Student[]): string | null {
  if (!students.some((student) => student.id === draft.studentId)) return "Выберите ученика.";
  if (draft.weekday < 1 || draft.weekday > 7) return "Выберите день недели.";
  if (!draft.startTime) return "Укажите время начала.";
  if (!draft.endTime) return "Укажите время окончания.";
  if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) return "Время окончания должно быть позже времени начала.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Стоимость должна быть неотрицательным числом.";
  if (!draft.startDate) return "Укажите дату начала расписания.";
  if (draft.endDate && draft.endDate < draft.startDate) return "Дата окончания не может быть раньше даты начала.";
  return null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}
