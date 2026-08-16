import { timeToMinutes } from "./date-utils";

export type CalendarOtherEventDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
};

type CalendarOtherEventFormFieldsProps = {
  draft: CalendarOtherEventDraft;
  disabled: boolean;
  onChange: <K extends keyof CalendarOtherEventDraft>(field: K, value: CalendarOtherEventDraft[K]) => void;
};

export function CalendarOtherEventFormFields({ draft, disabled, onChange }: CalendarOtherEventFormFieldsProps) {
  return (
    <div className="lesson-form-grid">
      <label className="lesson-form-full"><span>Название события</span><input type="text" value={draft.title} onChange={(event) => onChange("title", event.target.value)} placeholder="Например, личная встреча" required autoFocus disabled={disabled} /></label>
      <label className="lesson-form-full"><span>Дата</span><input type="date" value={draft.date} onChange={(event) => onChange("date", event.target.value)} required disabled={disabled} /></label>
      <label><span>Время начала</span><input type="time" step="300" value={draft.startTime} onChange={(event) => onChange("startTime", event.target.value)} required disabled={disabled} /></label>
      <label><span>Время окончания</span><input type="time" step="300" value={draft.endTime} onChange={(event) => onChange("endTime", event.target.value)} required disabled={disabled} /></label>
      <label className="lesson-form-full"><span>Заметки</span><textarea rows={4} value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} placeholder="Необязательно" disabled={disabled} /></label>
    </div>
  );
}

export function validateOtherEventDraft(draft: CalendarOtherEventDraft): string | null {
  if (!draft.title.trim()) return "Укажите название события.";
  if (!draft.date) return "Укажите дату события.";
  if (!draft.startTime) return "Укажите время начала.";
  if (!draft.endTime) return "Укажите время окончания.";
  if (timeToMinutes(draft.endTime) <= timeToMinutes(draft.startTime)) return "Время окончания должно быть позже времени начала.";
  return null;
}
