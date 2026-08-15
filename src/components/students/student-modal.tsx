"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Student, StudentDraft } from "./student-types";

type StudentModalProps = {
  student: Student | null;
  initialDraft: StudentDraft;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (draft: StudentDraft) => Promise<void>;
};

export function StudentModal({
  student,
  initialDraft,
  isSubmitting,
  error,
  onClose,
  onSave,
}: StudentModalProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(initialDraft);
    setValidationError(null);
  }, [initialDraft]);

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

  function update<K extends keyof StudentDraft>(field: K, value: StudentDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  async function handleSubmit() {
    const nextValidationError = validateStudent(draft);
    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError(null);
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
      <section className="student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
        <div className="student-modal-header">
          <div>
            <span>{student ? "КАРТОЧКА УЧЕНИКА" : "НОВЫЙ УЧЕНИК"}</span>
            <h2 id="student-modal-title">{student ? "Редактировать ученика" : "Добавить ученика"}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <form
          aria-busy={isSubmitting}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="student-form-grid">
            <label><span>Имя</span><input value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} required autoFocus disabled={isSubmitting} /></label>
            <label><span>Фамилия</span><input value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} required disabled={isSubmitting} /></label>
            <label><span>Телефон</span><input type="tel" value={draft.phone ?? ""} onChange={(event) => update("phone", event.target.value)} placeholder="+7 900 000-00-00" disabled={isSubmitting} /></label>
            <label><span>Email</span><input type="email" value={draft.email ?? ""} onChange={(event) => update("email", event.target.value)} placeholder="name@example.ru" disabled={isSubmitting} /></label>
            <label><span>Дата рождения</span><input type="date" value={draft.dateOfBirth ?? ""} onChange={(event) => update("dateOfBirth", event.target.value)} disabled={isSubmitting} /></label>
            <label><span>Адрес</span><input value={draft.address ?? ""} onChange={(event) => update("address", event.target.value)} placeholder="Город, улица, дом" disabled={isSubmitting} /></label>
            <div className="student-form-section-title student-form-full">
              <strong>Родитель / контактное лицо</strong>
              <span>Необязательно</span>
            </div>
            <label><span>Имя родителя</span><input value={draft.parentFirstName ?? ""} onChange={(event) => update("parentFirstName", event.target.value)} disabled={isSubmitting} /></label>
            <label><span>Фамилия родителя</span><input value={draft.parentLastName ?? ""} onChange={(event) => update("parentLastName", event.target.value)} disabled={isSubmitting} /></label>
            <label><span>Телефон родителя</span><input type="tel" value={draft.parentPhone ?? ""} onChange={(event) => update("parentPhone", event.target.value)} placeholder="+7 900 000-00-00" disabled={isSubmitting} /></label>
            <label><span>Email родителя</span><input type="email" value={draft.parentEmail ?? ""} onChange={(event) => update("parentEmail", event.target.value)} placeholder="parent@example.ru" disabled={isSubmitting} /></label>
            <label><span>Стоимость занятия</span><div className="price-input-wrap"><input type="number" min="0" value={draft.lessonPrice} onChange={(event) => update("lessonPrice", Number(event.target.value))} required disabled={isSubmitting} /><i>₽</i></div></label>
            <label><span>Продолжительность занятия</span><select value={draft.lessonDuration} onChange={(event) => update("lessonDuration", Number(event.target.value))} required disabled={isSubmitting}><option value={30}>30 минут</option><option value={45}>45 минут</option><option value={60}>1 час</option><option value={90}>1 час 30 минут</option><option value={120}>2 часа</option></select></label>
            <label className="student-form-full"><span>Заметки</span><textarea rows={4} value={draft.notes ?? ""} onChange={(event) => update("notes", event.target.value)} placeholder="Цели, особенности занятий и важные детали" disabled={isSubmitting} /></label>
          </div>
          {(validationError || error) && <p className="student-form-error" role="alert">{validationError || error}</p>}
          <div className="student-modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение…" : student ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function validateStudent(draft: StudentDraft): string | null {
  if (!(draft.firstName?.trim() ?? "")) return "Укажите имя ученика.";
  if (!(draft.lastName?.trim() ?? "")) return "Укажите фамилию ученика.";
  if (draft.dateOfBirth && !isValidDate(draft.dateOfBirth)) {
    return "Укажите дату рождения в формате ДД.ММ.ГГГГ.";
  }
  const hasParentInformation = [
    draft.parentFirstName,
    draft.parentLastName,
    draft.parentPhone,
    draft.parentEmail,
  ].some((value) => (value?.trim() ?? "") !== "");
  if (hasParentInformation && !(draft.parentFirstName?.trim() ?? "")) {
    return "Укажите имя родителя или контактного лица.";
  }
  if (!Number.isFinite(draft.lessonPrice) || draft.lessonPrice < 0) {
    return "Стоимость занятия должна быть неотрицательным числом.";
  }
  if (!Number.isFinite(draft.lessonDuration) || draft.lessonDuration <= 0) {
    return "Укажите продолжительность занятия.";
  }
  return null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}
