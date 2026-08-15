"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialStudents } from "@/components/students/student-data";
import type { GroupDraft, StudentGroup } from "./group-types";

type GroupModalProps = {
  group: StudentGroup | null;
  initialDraft: GroupDraft;
  onClose: () => void;
  onSave: (draft: GroupDraft) => void;
};

export function GroupModal({ group, initialDraft, onClose, onSave }: GroupModalProps) {
  const [draft, setDraft] = useState(initialDraft);

  useEffect(() => setDraft(initialDraft), [initialDraft]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function update<K extends keyof GroupDraft>(field: K, value: GroupDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleStudent(studentId: string) {
    update("studentIds", draft.studentIds.includes(studentId) ? draft.studentIds.filter((id) => id !== studentId) : [...draft.studentIds, studentId]);
  }

  return createPortal(
    <div className="group-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="group-modal" role="dialog" aria-modal="true" aria-labelledby="group-modal-title">
        <div className="group-modal-header">
          <div><span>{group ? "НАСТРОЙКИ ГРУППЫ" : "НОВАЯ ГРУППА"}</span><h2 id="group-modal-title">{group ? "Редактировать группу" : "Создать группу"}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
          <div className="group-form-grid">
            <label className="group-form-full"><span>Название группы</span><input value={draft.name} onChange={(event) => update("name", event.target.value)} required autoFocus /></label>
            <fieldset className="group-form-full">
              <legend>Ученики</legend>
              <div className="group-student-options">
                {initialStudents.filter((student) => student.status === "active").map((student) => {
                  const checked = draft.studentIds.includes(student.id);
                  return <button type="button" className={checked ? "selected" : ""} key={student.id} onClick={() => toggleStudent(student.id)}><span>{checked && <Check size={13} />}</span><strong>{student.firstName} {student.lastName}</strong></button>;
                })}
              </div>
              <small>Выбрано: {draft.studentIds.length}</small>
            </fieldset>
            <label><span>Стоимость занятия</span><div className="price-input-wrap"><input type="number" min="0" value={draft.lessonPrice} onChange={(event) => update("lessonPrice", Number(event.target.value))} required /><i>₽ / чел.</i></div></label>
            <label><span>Продолжительность</span><select value={draft.lessonDuration} onChange={(event) => update("lessonDuration", Number(event.target.value))}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
            <label className="group-form-full"><span>Заметки</span><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Цели группы, программа и важные детали" /></label>
          </div>
          <div className="group-modal-footer"><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit">{group ? "Сохранить" : "Создать"}</Button></div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
