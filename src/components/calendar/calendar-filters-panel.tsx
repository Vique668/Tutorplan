"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import { Button } from "@/components/ui/button";
import type { LessonStatus } from "./calendar-types";

export type CalendarLessonTypeFilter = "individual" | "pair" | "group";
export type CalendarPeriodFilter = "today" | "week" | "month" | "custom";

export type CalendarFilterSelection = {
  studentIds: string[];
  statuses: Array<Extract<LessonStatus, "scheduled" | "completed" | "cancelled">>;
  lessonTypes: CalendarLessonTypeFilter[];
};

export type CalendarFilterDraft = CalendarFilterSelection & {
  period: CalendarPeriodFilter;
  customDate: string;
};

type CalendarFiltersPanelProps = {
  students: Student[];
  draft: CalendarFilterDraft;
  onChange: (draft: CalendarFilterDraft) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

const statusOptions: { value: CalendarFilterSelection["statuses"][number]; label: string }[] = [
  { value: "scheduled", label: "Запланировано" },
  { value: "completed", label: "Проведено" },
  { value: "cancelled", label: "Отменено" },
];

const typeOptions: { value: CalendarLessonTypeFilter; label: string }[] = [
  { value: "individual", label: "Индивидуальный" },
  { value: "pair", label: "Пара" },
  { value: "group", label: "Группа" },
];

const periodOptions: { value: CalendarPeriodFilter; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "custom", label: "Произвольная дата" },
];

export function CalendarFiltersPanel({ students, draft, onChange, onClose, onApply, onReset }: CalendarFiltersPanelProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  function toggleStudent(studentId: string) {
    onChange({
      ...draft,
      studentIds: draft.studentIds.includes(studentId)
        ? draft.studentIds.filter((id) => id !== studentId)
        : [...draft.studentIds, studentId],
    });
  }

  function toggleStatus(status: CalendarFilterSelection["statuses"][number]) {
    onChange({
      ...draft,
      statuses: draft.statuses.includes(status)
        ? draft.statuses.filter((value) => value !== status)
        : [...draft.statuses, status],
    });
  }

  function toggleLessonType(lessonType: CalendarLessonTypeFilter) {
    onChange({
      ...draft,
      lessonTypes: draft.lessonTypes.includes(lessonType)
        ? draft.lessonTypes.filter((value) => value !== lessonType)
        : [...draft.lessonTypes, lessonType],
    });
  }

  return createPortal(
    <div className="calendar-filter-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="calendar-filter-panel" role="dialog" aria-modal="true" aria-labelledby="calendar-filter-title">
        <div className="calendar-filter-header">
          <div><span><SlidersHorizontal size={16} /></span><div><small>КАЛЕНДАРЬ</small><h2 id="calendar-filter-title">Фильтры расписания</h2></div></div>
          <button type="button" className="icon-button" aria-label="Закрыть фильтры" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="calendar-filter-content">
          <fieldset className="calendar-filter-section">
            <legend>Ученики</legend>
            <label className="calendar-filter-option calendar-filter-option-all"><input type="checkbox" checked={draft.studentIds.length === 0} onChange={() => onChange({ ...draft, studentIds: [] })} /><span><strong>Все ученики</strong><small>Показывать всё расписание</small></span></label>
            <div className="calendar-filter-students">
              {students.map((student) => (
                <label className="calendar-filter-option" key={student.id}>
                  <input type="checkbox" checked={draft.studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                  <span><strong>{student.firstName} {student.lastName}</strong>{student.status === "archived" && <small>В архиве</small>}</span>
                </label>
              ))}
              {!students.length && <p>Ученики пока не добавлены.</p>}
            </div>
          </fieldset>

          <fieldset className="calendar-filter-section">
            <legend>Статус урока</legend>
            <div className="calendar-filter-option-grid">
              {statusOptions.map((option) => <label className={`calendar-filter-option filter-status-${option.value}`} key={option.value}><input type="checkbox" checked={draft.statuses.includes(option.value)} onChange={() => toggleStatus(option.value)} /><span><strong>{option.label}</strong></span></label>)}
            </div>
          </fieldset>

          <fieldset className="calendar-filter-section">
            <legend>Тип</legend>
            <div className="calendar-filter-option-grid">
              {typeOptions.map((option) => <label className="calendar-filter-option" key={option.value}><input type="checkbox" checked={draft.lessonTypes.includes(option.value)} onChange={() => toggleLessonType(option.value)} /><span><strong>{option.label}</strong></span></label>)}
            </div>
          </fieldset>

          <fieldset className="calendar-filter-section">
            <legend>Период</legend>
            <div className="calendar-period-options">
              {periodOptions.map((option) => <label className={draft.period === option.value ? "active" : ""} key={option.value}><input type="radio" name="calendar-period" checked={draft.period === option.value} onChange={() => onChange({ ...draft, period: option.value })} /><span>{option.label}</span></label>)}
            </div>
            {draft.period === "custom" && <label className="calendar-custom-date"><span>Дата</span><input type="date" value={draft.customDate} onChange={(event) => onChange({ ...draft, customDate: event.target.value })} required /></label>}
          </fieldset>
        </div>

        <div className="calendar-filter-actions">
          <Button type="button" variant="secondary" icon={<RotateCcw size={16} />} onClick={onReset}>Сбросить</Button>
          <Button type="button" onClick={onApply} disabled={draft.period === "custom" && !draft.customDate}>Применить</Button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
