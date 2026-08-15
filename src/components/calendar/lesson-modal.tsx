"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calendarParticipants } from "./calendar-data";
import { lessonStatusLabels, type CalendarLesson, type LessonDraft, type LessonStatus, type SeriesActionScope } from "./calendar-types";
import { formatLessonEnd, timeToMinutes } from "./date-utils";

type LessonModalProps = {
  lesson: CalendarLesson | null;
  initialDraft: LessonDraft;
  onClose: () => void;
  onSave: (draft: LessonDraft, scope: SeriesActionScope) => void;
  onDelete?: (scope: SeriesActionScope) => void;
};

export function LessonModal({ lesson, initialDraft, onClose, onSave, onDelete }: LessonModalProps) {
  const [draft, setDraft] = useState<LessonDraft>(initialDraft);
  const [error, setError] = useState("");
  const [editScope, setEditScope] = useState<SeriesActionScope>("single");
  const [deleteScope, setDeleteScope] = useState<SeriesActionScope>("single");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const recurringLesson = Boolean(lesson?.seriesId);

  useEffect(() => {
    setDraft(initialDraft);
    setEditScope("single");
    setDeleteScope("single");
    setConfirmingDelete(false);
  }, [initialDraft]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function update<K extends keyof LessonDraft>(field: K, value: LessonDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function handleParticipantChange(name: string) {
    const participant = calendarParticipants.find((item) => item.name === name);
    setDraft((current) => ({ ...current, participant: name, price: participant?.price ?? current.price }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const endMinutes = timeToMinutes(draft.startTime) + draft.duration;
    if (timeToMinutes(draft.startTime) < 8 * 60 || endMinutes > 22 * 60) {
      setError("Занятие должно находиться в пределах календаря с 08:00 до 22:00.");
      return;
    }
    if (draft.recurrence === "weekly" && !(recurringLesson && editScope === "single") && draft.recurrenceEndDate < draft.date) {
      setError("Дата окончания повторов не может быть раньше даты начала.");
      return;
    }
    onSave(draft, recurringLesson ? editScope : "single");
  }

  return createPortal(
    <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-modal-title">
        <div className="lesson-modal-header">
          <div>
            <span>{lesson ? "РЕДАКТИРОВАНИЕ" : "НОВОЕ СОБЫТИЕ"}</span>
            <h2 id="lesson-modal-title">{lesson ? "Изменить занятие" : "Новое занятие"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lesson-form-grid">
            <label className="lesson-form-full">
              <span>Ученик / группа</span>
              <select value={draft.participant} onChange={(event) => handleParticipantChange(event.target.value)} autoFocus>
                <optgroup label="Ученики">
                  {calendarParticipants.filter((participant) => participant.kind === "student").map((participant) => <option key={participant.name}>{participant.name}</option>)}
                </optgroup>
                <optgroup label="Группы">
                  {calendarParticipants.filter((participant) => participant.kind === "group").map((participant) => <option key={participant.name}>{participant.name}</option>)}
                </optgroup>
              </select>
            </label>
            <label>
              <span>{draft.recurrence === "weekly" && !(recurringLesson && editScope === "single") ? "Дата начала" : "Дата"}</span>
              <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required />
            </label>
            <label>
              <span>Время начала</span>
              <input type="time" min="08:00" max="21:30" step="1800" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} required />
            </label>
            <label>
              <span>Продолжительность</span>
              <select value={draft.duration} onChange={(event) => update("duration", Number(event.target.value))}>
                <option value={30}>30 минут</option>
                <option value={45}>45 минут</option>
                <option value={60}>1 час</option>
                <option value={90}>1 час 30 минут</option>
                <option value={120}>2 часа</option>
              </select>
            </label>
            <label>
              <span>Стоимость</span>
              <div className="price-input-wrap"><input type="number" min="0" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} required /><i>₽</i></div>
            </label>
            <label className="lesson-form-full">
              <span>Повторять</span>
              <select value={draft.recurrence} disabled={recurringLesson && editScope === "single"} onChange={(event) => update("recurrence", event.target.value as LessonDraft["recurrence"])}>
                <option value="none">Не повторять</option>
                <option value="weekly">Каждую неделю</option>
              </select>
            </label>
            {draft.recurrence === "weekly" && <label className="lesson-form-full">
              <span>Дата окончания повторов</span>
              <input type="date" min={draft.date} value={draft.recurrenceEndDate} disabled={recurringLesson && editScope === "single"} onChange={(event) => update("recurrenceEndDate", event.target.value)} required />
              {recurringLesson && editScope === "single" && <small className="lesson-field-hint">Диапазон серии не изменится для отдельного занятия.</small>}
            </label>}
            {lesson && <label className="lesson-form-full">
              <span>Статус занятия</span>
              <select value={draft.status} onChange={(event) => update("status", event.target.value as LessonStatus)}>
                {(Object.entries(lessonStatusLabels) as [LessonStatus, string][]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>}
          </div>

          {recurringLesson && !confirmingDelete && <fieldset className="series-scope-fieldset">
            <legend>Изменить:</legend>
            <label><input type="radio" name="edit-scope" checked={editScope === "single"} onChange={() => setEditScope("single")} /><span><strong>Только это занятие</strong><small>Остальные занятия серии не изменятся</small></span></label>
            <label><input type="radio" name="edit-scope" checked={editScope === "following"} onChange={() => setEditScope("following")} /><span><strong>Это и следующие занятия</strong><small>Прошлые занятия останутся без изменений</small></span></label>
          </fieldset>}

          <div className="lesson-form-summary">
            <span>{draft.startTime}–{formatLessonEnd(draft.startTime, draft.duration)}</span>
            <strong>{draft.price.toLocaleString("ru-RU")} ₽</strong>
          </div>
          {error && <p className="lesson-form-error" role="alert">{error}</p>}

          {confirmingDelete && <div className="series-delete-confirmation">
            <strong>Удалить:</strong>
            <label><input type="radio" name="delete-scope" checked={deleteScope === "single"} onChange={() => setDeleteScope("single")} /><span>Только это занятие</span></label>
            <label><input type="radio" name="delete-scope" checked={deleteScope === "following"} onChange={() => setDeleteScope("following")} /><span>Это и следующие занятия</span></label>
          </div>}

          <div className="lesson-modal-footer">
            {confirmingDelete ? <div className="delete-confirm-actions"><Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>Не удалять</Button><Button type="button" className="confirm-delete-button" onClick={() => onDelete?.(deleteScope)}>Удалить</Button></div> : <>
              {lesson && onDelete && <Button type="button" variant="ghost" className="delete-lesson-button" icon={<Trash2 size={17} />} onClick={() => recurringLesson ? setConfirmingDelete(true) : onDelete("single")}>Удалить</Button>}
              <div><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit">{lesson ? "Сохранить" : "Создать"}</Button></div>
            </>}
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
