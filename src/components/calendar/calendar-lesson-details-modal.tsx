"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, CalendarClock, CheckCircle2, RotateCcw, Trash2, X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import type { StudentGroup } from "@/components/groups/group-types";
import { Button } from "@/components/ui/button";
import type { CalendarLesson, LessonCancellationReason, LessonStatus } from "./calendar-types";
import { lessonStatusLabels, primaryLessonStatuses } from "./calendar-types";
import { formatLessonEnd, timeToMinutes } from "./date-utils";

export type CalendarLessonEditDraft = {
  targetType: "student" | "group";
  studentId: string | null;
  groupId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: LessonStatus;
  notes: string;
};

export type CalendarLessonCancelDraft = {
  reason: LessonCancellationReason | null;
  fee: number;
};

export type CalendarLessonRescheduleDraft = {
  date: string;
  startTime: string;
  endTime: string;
};

const editableLessonStatuses = [...primaryLessonStatuses, "rescheduled"] as const;

const cancellationReasonOptions: { value: LessonCancellationReason | ""; label: string }[] = [
  { value: "", label: "Не указывать" },
  { value: "tutor_cancelled", label: "Моя отмена" },
  { value: "illness", label: "Болел" },
  { value: "absence", label: "Пропуск" },
  { value: "holiday", label: "Праздник" },
];

type CalendarLessonDetailsModalProps = {
  lesson: CalendarLesson;
  students: Student[];
  groups: StudentGroup[];
  isMutating: boolean;
  error: string | null;
  onClose: () => void;
  onUpdate: (draft: CalendarLessonEditDraft) => Promise<void>;
  onCancelLesson: (draft: CalendarLessonCancelDraft) => Promise<void>;
  onReschedule: (draft: CalendarLessonRescheduleDraft) => Promise<void>;
  onStatusChange: (status: LessonStatus) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function CalendarLessonDetailsModal({ lesson, students, groups, isMutating, error, onClose, onUpdate, onCancelLesson, onReschedule, onStatusChange, onDelete }: CalendarLessonDetailsModalProps) {
  const [draft, setDraft] = useState<CalendarLessonEditDraft>(() => toEditDraft(lesson));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<LessonCancellationReason | "">(lesson.cancellationReason ?? "");
  const [cancelFee, setCancelFee] = useState(lesson.cancellationFee ?? 0);
  const [cancelValidationError, setCancelValidationError] = useState<string | null>(null);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDraft, setRescheduleDraft] = useState<CalendarLessonRescheduleDraft>(() => toRescheduleDraft(lesson));
  const [rescheduleValidationError, setRescheduleValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toEditDraft(lesson));
    setValidationError(null);
    setCancelReason(lesson.cancellationReason ?? "");
    setCancelFee(lesson.cancellationFee ?? 0);
    setRescheduleDraft(toRescheduleDraft(lesson));
    if (lesson.status === "cancelled") setCancelDialogOpen(false);
    if (lesson.status === "rescheduled") setRescheduleDialogOpen(false);
  }, [lesson]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isMutating) {
        if (cancelDialogOpen) setCancelDialogOpen(false);
        else if (rescheduleDialogOpen) setRescheduleDialogOpen(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelDialogOpen, isMutating, onClose, rescheduleDialogOpen]);

  function update<K extends keyof CalendarLessonEditDraft>(field: K, value: CalendarLessonEditDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  }

  function updateStartTime(startTime: string) {
    setDraft((current) => {
      const duration = Math.max(30, timeToMinutes(current.endTime) - timeToMinutes(current.startTime));
      return { ...current, startTime, endTime: formatLessonEnd(startTime, duration) };
    });
    setValidationError(null);
  }

  function selectStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    setDraft((current) => ({
      ...current,
      targetType: "student",
      studentId,
      groupId: null,
      endTime: formatLessonEnd(current.startTime, student?.lessonDuration ?? 60),
      price: student?.lessonPrice ?? current.price,
    }));
    setValidationError(null);
  }

  function selectGroup(groupId: string) {
    const group = groups.find((item) => item.id === groupId);
    setDraft((current) => ({
      ...current,
      targetType: "group",
      studentId: null,
      groupId,
      endTime: formatLessonEnd(current.startTime, group?.lessonDuration ?? 60),
      price: group?.lessonPrice ?? current.price,
    }));
    setValidationError(null);
  }

  function selectTargetType(targetType: "student" | "group") {
    if (targetType === "student") selectStudent(students[0]?.id ?? "");
    else selectGroup(groups[0]?.id ?? "");
  }

  async function submitEdit() {
    const nextError = validateDraft(draft, students, groups);
    if (nextError) {
      setValidationError(nextError);
      return;
    }
    await onUpdate(draft);
  }

  async function submitCancellation() {
    if (!Number.isInteger(cancelFee) || cancelFee < 0) {
      setCancelValidationError("Штраф должен быть целым неотрицательным числом.");
      return;
    }
    setCancelValidationError(null);
    await onCancelLesson({ reason: cancelReason || null, fee: cancelFee });
  }

  async function submitReschedule() {
    const nextError = validateRescheduleDraft(rescheduleDraft);
    if (nextError) {
      setRescheduleValidationError(nextError);
      return;
    }
    setRescheduleValidationError(null);
    await onReschedule(rescheduleDraft);
  }

  return createPortal(
    <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isMutating && onClose()}>
      <section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-lesson-details-title">
        <div className="lesson-modal-header">
          <div><span>РЕДАКТИРОВАНИЕ УРОКА</span><h2 id="calendar-lesson-details-title">{lesson.participant}</h2></div>
          <button type="button" className="icon-button" aria-label="Закрыть" onClick={onClose} disabled={isMutating}><X size={20} /></button>
        </div>

        <form aria-busy={isMutating} onSubmit={(event) => { event.preventDefault(); void submitEdit(); }}>
          <div className="lesson-form-grid">
            <div className="lesson-form-full calendar-create-tabs" role="group" aria-label="Тип урока">
              <button type="button" className={draft.targetType === "student" ? "active" : ""} onClick={() => selectTargetType("student")} disabled={isMutating || !students.length}>Ученик</button>
              <button type="button" className={draft.targetType === "group" ? "active" : ""} onClick={() => selectTargetType("group")} disabled={isMutating || !groups.length}>Группа</button>
            </div>
            {draft.targetType === "student" ? (
              <label className="lesson-form-full"><span>Ученик</span><select value={draft.studentId ?? ""} onChange={(event) => selectStudent(event.target.value)} required disabled={isMutating}>{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName}</option>)}</select></label>
            ) : (
              <label className="lesson-form-full"><span>Группа</span><select value={draft.groupId ?? ""} onChange={(event) => selectGroup(event.target.value)} required disabled={isMutating}>{groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select></label>
            )}
            <label><span>Дата</span><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required disabled={isMutating} /></label>
            <label><span>Время начала</span><input type="time" min="08:00" max="21:30" step="60" value={draft.startTime} onChange={(event) => updateStartTime(event.target.value)} required disabled={isMutating} /></label>
            <label><span>Время окончания</span><input type="time" min="08:01" max="22:00" step="60" value={draft.endTime} onChange={(event) => update("endTime", event.target.value)} required disabled={isMutating} /></label>
            <label><span>Стоимость</span><div className="price-input-wrap"><input type="number" min="0" step="1" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} required disabled={isMutating} /><i>₽</i></div></label>
            <label className="lesson-form-full"><span>Статус</span><select value={draft.status} onChange={(event) => update("status", event.target.value as LessonStatus)} disabled={isMutating}>{editableLessonStatuses.map((value) => <option value={value} key={value}>{lessonStatusLabels[value]}</option>)}</select></label>
            <label className="lesson-form-full"><span>Заметки</span><textarea rows={3} value={draft.notes} onChange={(event) => update("notes", event.target.value)} disabled={isMutating} /></label>
          </div>
          <div className="lesson-form-summary"><span>{draft.startTime}–{draft.endTime}</span><strong>{draft.price.toLocaleString("ru-RU")} ₽</strong></div>
          {normalizeStatus(lesson.status) === "cancelled" && <div className="lesson-cancellation-summary"><span>Причина: <strong>{cancellationReasonLabel(lesson.cancellationReason)}</strong></span><span>Штраф: <strong>{(lesson.cancellationFee ?? 0).toLocaleString("ru-RU")} ₽</strong></span></div>}
          {(validationError || error) && <p className="lesson-form-error" role="alert">{validationError || error}</p>}
          <div className="lesson-modal-footer lesson-editor-actions">
            <Button type="button" variant="ghost" className="delete-lesson-button" icon={<Trash2 size={16} />} onClick={() => { if (window.confirm("Удалить этот урок без возможности восстановления? Связанное начисление также будет удалено.")) void onDelete(); }} disabled={isMutating}>Удалить урок</Button>
            <div>
              <Button type="button" variant="secondary" icon={<CheckCircle2 size={16} />} onClick={() => void onStatusChange("completed")} disabled={isMutating || lesson.status === "completed"}>Провести урок</Button>
              {normalizeStatus(lesson.status) !== "cancelled" && lesson.status !== "completed" && <Button type="button" variant="secondary" icon={<CalendarClock size={16} />} onClick={() => { setRescheduleValidationError(null); setRescheduleDraft(toRescheduleDraft(lesson)); setRescheduleDialogOpen(true); }} disabled={isMutating}>Перенести урок</Button>}
              {normalizeStatus(lesson.status) === "cancelled" ? (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<RotateCcw size={16} />}
                  onClick={() => {
                    if (window.confirm("Вернуть это занятие в расписание?")) void onStatusChange("scheduled");
                  }}
                  disabled={isMutating}
                >
                  Вернуть урок
                </Button>
              ) : (
                <Button type="button" variant="secondary" icon={<Ban size={16} />} onClick={() => { setCancelValidationError(null); setCancelDialogOpen(true); }} disabled={isMutating}>Отменить урок</Button>
              )}
              <Button type="submit" disabled={isMutating}>{isMutating ? "Сохранение…" : "Сохранить изменения"}</Button>
            </div>
          </div>
        </form>
      </section>
      {cancelDialogOpen && (
        <div className="lesson-cancel-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isMutating && setCancelDialogOpen(false)}>
          <section className="lesson-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-cancel-title">
            <div className="lesson-cancel-header">
              <div><span>ОТМЕНА УРОКА</span><h2 id="lesson-cancel-title">Отменить занятие?</h2></div>
              <button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setCancelDialogOpen(false)} disabled={isMutating}><X size={20} /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void submitCancellation(); }}>
              <p className="lesson-cancel-copy">Вы действительно хотите отменить урок с <strong>{lesson.participant}</strong> {formatCancellationDate(lesson.date)} в <strong>{lesson.startTime}</strong>?</p>
              <div className="lesson-cancel-fields">
                <label><span>Причина</span><select value={cancelReason} onChange={(event) => setCancelReason(event.target.value as LessonCancellationReason | "")} disabled={isMutating}>{cancellationReasonOptions.map((option) => <option value={option.value} key={option.value || "empty"}>{option.label}</option>)}</select></label>
                <label><span>Штраф</span><div className="price-input-wrap"><input type="number" min="0" step="1" value={cancelFee} onChange={(event) => setCancelFee(Number(event.target.value))} disabled={isMutating} /><i>₽</i></div></label>
              </div>
              <div className="lesson-cancel-finance-note">{cancelFee > 0 ? `В баланс ученика будет начислено ${cancelFee.toLocaleString("ru-RU")} ₽.` : "Финансового начисления не будет."}</div>
              {(cancelValidationError || error) && <p className="lesson-form-error" role="alert">{cancelValidationError || error}</p>}
              <div className="lesson-cancel-actions"><Button type="button" variant="secondary" onClick={() => setCancelDialogOpen(false)} disabled={isMutating}>Не отменять</Button><Button type="submit" className="confirm-cancel-button" disabled={isMutating}>{isMutating ? "Отмена…" : "Отменить урок"}</Button></div>
            </form>
          </section>
        </div>
      )}
      {rescheduleDialogOpen && (
        <div className="lesson-reschedule-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isMutating && setRescheduleDialogOpen(false)}>
          <section className="lesson-reschedule-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-reschedule-title">
            <div className="lesson-reschedule-header">
              <div><span>ПЕРЕНОС УРОКА</span><h2 id="lesson-reschedule-title">Выберите новое время</h2></div>
              <button type="button" className="icon-button" aria-label="Закрыть" onClick={() => setRescheduleDialogOpen(false)} disabled={isMutating}><X size={20} /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void submitReschedule(); }}>
              <p className="lesson-reschedule-copy">Перенести урок с <strong>{lesson.participant}</strong> с {formatCancellationDate(lesson.date)}, <strong>{lesson.startTime}</strong>?</p>
              <div className="lesson-reschedule-fields">
                <label className="lesson-reschedule-date"><span>Новая дата</span><input type="date" value={rescheduleDraft.date} onChange={(event) => { setRescheduleDraft((current) => ({ ...current, date: event.target.value })); setRescheduleValidationError(null); }} required disabled={isMutating} /></label>
                <label><span>Начало</span><input type="time" min="08:00" max="21:59" step="60" value={rescheduleDraft.startTime} onChange={(event) => { setRescheduleDraft((current) => ({ ...current, startTime: event.target.value })); setRescheduleValidationError(null); }} required disabled={isMutating} /></label>
                <label><span>Окончание</span><input type="time" min="08:01" max="22:00" step="60" value={rescheduleDraft.endTime} onChange={(event) => { setRescheduleDraft((current) => ({ ...current, endTime: event.target.value })); setRescheduleValidationError(null); }} required disabled={isMutating} /></label>
              </div>
              <div className="lesson-reschedule-note">Изменится только этот урок. Шаблон недельного расписания останется прежним.</div>
              {(rescheduleValidationError || error) && <p className="lesson-form-error" role="alert">{rescheduleValidationError || error}</p>}
              <div className="lesson-reschedule-actions"><Button type="button" variant="secondary" onClick={() => setRescheduleDialogOpen(false)} disabled={isMutating}>Не переносить</Button><Button type="submit" disabled={isMutating}>{isMutating ? "Перенос…" : "Перенести урок"}</Button></div>
            </form>
          </section>
        </div>
      )}
    </div>,
    document.body,
  );
}

function formatCancellationDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

function cancellationReasonLabel(reason?: LessonCancellationReason | null): string {
  return cancellationReasonOptions.find((option) => option.value === (reason ?? ""))?.label ?? "Не указывать";
}

function toEditDraft(lesson: CalendarLesson): CalendarLessonEditDraft {
  return {
    targetType: lesson.groupId ? "group" : "student",
    studentId: lesson.studentId ?? "",
    groupId: lesson.groupId ?? null,
    date: lesson.date,
    startTime: lesson.startTime,
    endTime: formatLessonEnd(lesson.startTime, lesson.duration),
    price: lesson.price,
    status: normalizeStatus(lesson.status),
    notes: lesson.notes ?? "",
  };
}

function toRescheduleDraft(lesson: CalendarLesson): CalendarLessonRescheduleDraft {
  return {
    date: lesson.date,
    startTime: lesson.startTime,
    endTime: formatLessonEnd(lesson.startTime, lesson.duration),
  };
}

function normalizeStatus(status: LessonStatus): LessonStatus {
  if ((editableLessonStatuses as readonly string[]).includes(status)) return status;
  return status === "no_show" ? "cancelled" : "scheduled";
}

function validateRescheduleDraft(draft: CalendarLessonRescheduleDraft): string | null {
  if (!draft.date || !draft.startTime || !draft.endTime) return "Укажите новую дату, начало и окончание урока.";
  const startMinutes = timeToMinutes(draft.startTime);
  const endMinutes = timeToMinutes(draft.endTime);
  if (endMinutes <= startMinutes) return "Время окончания должно быть позже времени начала.";
  if (startMinutes < 8 * 60 || endMinutes > 22 * 60) return "Урок должен находиться в пределах календаря с 08:00 до 22:00.";
  return null;
}

function validateDraft(draft: CalendarLessonEditDraft, students: Student[], groups: StudentGroup[]): string | null {
  if (draft.targetType === "student" && !students.some((student) => student.id === draft.studentId)) return "Выберите ученика.";
  if (draft.targetType === "group" && !groups.some((group) => group.id === draft.groupId)) return "Выберите группу.";
  if (!draft.date || !draft.startTime || !draft.endTime) return "Укажите дату, начало и окончание урока.";
  const startMinutes = timeToMinutes(draft.startTime);
  const endMinutes = timeToMinutes(draft.endTime);
  if (endMinutes <= startMinutes) return "Время окончания должно быть позже времени начала.";
  if (startMinutes < 8 * 60 || endMinutes > 22 * 60) return "Урок должен находиться в пределах календаря с 08:00 до 22:00.";
  if (!Number.isFinite(draft.price) || draft.price < 0) return "Стоимость должна быть неотрицательным числом.";
  return null;
}
