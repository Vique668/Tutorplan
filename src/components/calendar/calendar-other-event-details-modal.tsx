"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OtherEvent } from "@/types/other-event";
import {
  CalendarOtherEventFormFields,
  type CalendarOtherEventDraft,
  validateOtherEventDraft,
} from "./calendar-other-event-form-fields";

type CalendarOtherEventDetailsModalProps = {
  event: OtherEvent;
  isMutating: boolean;
  error: string | null;
  onClose: () => void;
  onUpdate: (draft: CalendarOtherEventDraft) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function CalendarOtherEventDetailsModal({ event, isMutating, error, onClose, onUpdate, onDelete }: CalendarOtherEventDetailsModalProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState<CalendarOtherEventDraft>(() => toDraft(event));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(event));
    setEditing(false);
    setConfirmingDelete(false);
    setValidationError(null);
  }, [event]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape" && !isMutating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMutating, onClose]);

  function update<K extends keyof CalendarOtherEventDraft>(field: K, value: CalendarOtherEventDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  async function submitEdit() {
    const nextError = validateOtherEventDraft(draft);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    await onUpdate(draft);
  }

  return createPortal(
    <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(mouseEvent) => {
      if (mouseEvent.target === mouseEvent.currentTarget && !isMutating) onClose();
    }}>
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="other-event-details-title">
        <div className="lesson-modal-header">
          <div><span>{editing ? "РЕДАКТИРОВАНИЕ" : "ДРУГОЕ СОБЫТИЕ"}</span><h2 id="other-event-details-title">{editing ? "Изменить событие" : event.title}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isMutating}><X size={20} /></button>
        </div>

        {editing ? (
          <form aria-busy={isMutating} onSubmit={(submitEvent) => { submitEvent.preventDefault(); void submitEdit(); }}>
            <CalendarOtherEventFormFields draft={draft} disabled={isMutating} onChange={update} />
            {(validationError || error) && <p className="lesson-form-error" role="alert">{validationError || error}</p>}
            <div className="lesson-modal-footer"><div><Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={isMutating}>Отмена</Button><Button type="submit" disabled={isMutating}>{isMutating ? "Сохранение…" : "Сохранить"}</Button></div></div>
          </form>
        ) : (
          <div className="lesson-details-content" aria-busy={isMutating}>
            <div className="lesson-details-grid">
              <div className="lesson-details-full"><span>Название события</span><strong>{event.title}</strong></div>
              <div><span>Тип события</span><strong>Другое</strong></div>
              <div><span>Дата</span><strong>{formatDate(event.eventDate)}</strong></div>
              <div><span>Время начала</span><strong>{event.startTime}</strong></div>
              <div><span>Время окончания</span><strong>{event.endTime}</strong></div>
              <div className="lesson-details-full"><span>Заметки</span><strong>{event.notes || "Заметок нет"}</strong></div>
            </div>

            {error && <p className="lesson-form-error" role="alert">{error}</p>}
            {confirmingDelete && <div className="lesson-delete-confirmation"><strong>Удалить это событие без возможности восстановления?</strong><div><Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={isMutating}>Не удалять</Button><Button type="button" className="confirm-delete-button" onClick={() => void onDelete()} disabled={isMutating}>{isMutating ? "Удаление…" : "Удалить"}</Button></div></div>}

            {!confirmingDelete && <div className="lesson-details-actions"><Button type="button" variant="ghost" className="delete-lesson-button" icon={<Trash2 size={16} />} onClick={() => setConfirmingDelete(true)} disabled={isMutating}>Удалить событие</Button><div><Button type="button" icon={<Pencil size={16} />} onClick={() => setEditing(true)} disabled={isMutating}>Редактировать</Button></div></div>}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

function toDraft(event: OtherEvent): CalendarOtherEventDraft {
  return {
    title: event.title,
    date: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    notes: event.notes ?? "",
  };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
}
