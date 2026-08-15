"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Student } from "@/components/students/student-types";
import type { GroupDraft, StudentGroup } from "./group-types";

type GroupModalProps = {
  group: StudentGroup | null;
  initialDraft: GroupDraft;
  students: Student[];
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: GroupDraft) => Promise<void>;
};

export function GroupModal({ group, initialDraft, students, isSubmitting, error, onClose, onSave }: GroupModalProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => setDraft(initialDraft), [initialDraft]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && !isSubmitting && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose]);

  function update<K extends keyof GroupDraft>(field: K, value: GroupDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function toggleStudent(studentId: string) {
    update("studentIds", draft.studentIds.includes(studentId) ? draft.studentIds.filter((id) => id !== studentId) : [...draft.studentIds, studentId]);
  }

  return createPortal(
    <div className="group-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}>
      <section className="group-modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title">
        <div className="group-modal-header">
          <div><span>{group ? "НАСТРОЙКИ ГРУППЫ" : "НОВАЯ ГРУППА"}</span><h2 id="group-modal-title">{group ? "Редактировать группу" : "Создать группу"}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}><X size={20} /></button>
        </div>
        <form aria-busy={isSubmitting} onSubmit={(event) => { event.preventDefault(); const nextError = validateGroup(draft); if (nextError) setValidationError(nextError); else void onSave(draft); }}>
          <div className="group-form-grid">
            <label className="group-form-full"><span>Название группы</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} required autoFocus disabled={isSubmitting} /></label>
            <label className="group-form-full"><span>Предмет</span><input value={draft.subject ?? ""} onChange={(event) => update("subject", event.target.value)} placeholder="Необязательно" disabled={isSubmitting} /></label>
            <fieldset className="group-form-full">
              <legend>Ученики</legend>
              <div className="group-student-options">
                {students.filter((student) => student.status === "active" || draft.studentIds.includes(student.id)).map((student) => {
                  const checked = draft.studentIds.includes(student.id);
                  return <button type="button" disabled={isSubmitting} className={checked ? "selected" : ""} key={student.id} onClick={() => toggleStudent(student.id)}><span>{checked && <Check size={13} />}</span><strong>{student.firstName} {student.lastName}</strong></button>;
                })}
              </div>
              <small>Выбрано: {draft.studentIds.length}</small>
            </fieldset>
            <label><span>Стоимость занятия</span><div className="price-input-wrap"><input type="number" min="0" step="1" value={draft.lessonPrice} onChange={(event) => update("lessonPrice", Number(event.target.value))} required disabled={isSubmitting} /><i>₽ / чел.</i></div></label>
            <label><span>Продолжительность</span><select value={draft.lessonDuration} onChange={(event) => update("lessonDuration", Number(event.target.value))} disabled={isSubmitting}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
            <label className="group-form-full"><span>Заметки</span><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Цели группы, программа и важные детали" disabled={isSubmitting} /></label>
          </div>
          {(validationError || error) && <p className="student-form-error" role="alert">{validationError || error}</p>}
          <div className="group-modal-footer"><Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Отмена</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Сохранение…" : group ? "Сохранить" : "Создать"}</Button></div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function validateGroup(draft: GroupDraft): string | null {
  if (!(draft.name?.trim() ?? "")) return "Укажите название группы.";
  if (!Number.isInteger(draft.lessonPrice) || draft.lessonPrice < 0) return "Стоимость должна быть целым неотрицательным числом.";
  if (!Number.isFinite(draft.lessonDuration) || draft.lessonDuration <= 0) return "Укажите продолжительность занятия.";
  return null;
}
