"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, SlidersHorizontal } from "lucide-react";
import {
  CalendarLessonCreateModal,
  type CalendarLessonCreateDraft,
  type CalendarOtherEventCreateDraft,
} from "@/components/calendar/calendar-lesson-create-modal";
import {
  CalendarLessonDetailsModal,
  type CalendarLessonEditDraft,
} from "@/components/calendar/calendar-lesson-details-modal";
import { CalendarOtherEventDetailsModal } from "@/components/calendar/calendar-other-event-details-modal";
import type { CalendarOtherEventDraft } from "@/components/calendar/calendar-other-event-form-fields";
import type {
  CalendarLesson,
  CalendarView,
  LessonColor,
  LessonStatusFilter,
} from "@/components/calendar/calendar-types";
import {
  addDays,
  addMonths,
  getDateRangeLabel,
  getWeekDays,
  startOfWeek,
  toDateKey,
} from "@/components/calendar/date-utils";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { WeekCalendar } from "@/components/calendar/week-calendar";
import type { Student } from "@/components/students/student-types";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/types/lesson";
import type { OtherEvent } from "@/types/other-event";
import {
  cancelLesson,
  createLesson,
  deleteLesson,
  getLessons,
  restoreLesson,
  updateLesson,
} from "../../../lib/supabase/lessons";
import { createOtherEvent, deleteOtherEvent, getOtherEvents, updateOtherEvent } from "../../../lib/supabase/other-events";
import { getStudents } from "../../../lib/supabase/students";

const views: { value: CalendarView; label: string }[] = [
  { value: "day", label: "День" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
];

const lessonColors: LessonColor[] = ["apricot", "sage", "sky", "rose", "lavender"];

type CreateModalState = {
  date: string;
  startTime: string;
};

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<CalendarLesson[]>([]);
  const [otherEvents, setOtherEvents] = useState<OtherEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LessonStatusFilter>("all");
  const [createModal, setCreateModal] = useState<CreateModalState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CalendarLesson | null>(null);
  const [isLessonMutating, setIsLessonMutating] = useState(false);
  const [lessonActionError, setLessonActionError] = useState<string | null>(null);
  const [selectedOtherEvent, setSelectedOtherEvent] = useState<OtherEvent | null>(null);
  const [isOtherEventMutating, setIsOtherEventMutating] = useState(false);
  const [otherEventActionError, setOtherEventActionError] = useState<string | null>(null);

  const loadCalendar = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setLoadError(null);

    try {
      const [loadedStudents, loadedLessons, loadedOtherEvents] = await Promise.all([
        getStudents(),
        getLessons(),
        getOtherEvents(),
      ]);
      setStudents(loadedStudents.filter((student) => student.status === "active"));
      setLessons(loadedLessons.map((lesson) => toCalendarLesson(lesson, loadedStudents)));
      setOtherEvents(loadedOtherEvents);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  const visibleDates = useMemo(() => (
    view === "day" ? [anchorDate] : getWeekDays(anchorDate)
  ), [anchorDate, view]);
  const calendarItems = useMemo(() => [...lessons, ...otherEvents.map(toCalendarOtherEvent)], [lessons, otherEvents]);
  const rangeLabel = getDateRangeLabel(anchorDate, view);
  const visibleLessons = useMemo(() => {
    if (view === "month") {
      return calendarItems.filter((lesson) => {
        const [year, month] = lesson.date.split("-").map(Number);
        return year === anchorDate.getFullYear() && month === anchorDate.getMonth() + 1;
      });
    }
    const keys = new Set(visibleDates.map(toDateKey));
    return calendarItems.filter((lesson) => keys.has(lesson.date));
  }, [anchorDate, calendarItems, view, visibleDates]);
  const displayedLessons = view === "week" && statusFilter !== "all"
    ? visibleLessons.filter((lesson) => lesson.kind === "other" || lesson.status === statusFilter)
    : visibleLessons;

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) => {
      if (view === "day") return addDays(current, direction);
      if (view === "week") return addDays(current, direction * 7);
      return addMonths(current, direction);
    });
  }

  function getDefaultDate() {
    const today = new Date();
    if (view === "day" || view === "month") return anchorDate;
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = addDays(weekStart, 6);
    return today >= weekStart && today <= new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59)
      ? today
      : weekStart;
  }

  function openCreate(date = getDefaultDate(), startTime = "10:00") {
    setCreateError(null);
    setCreateModal({ date: toDateKey(date), startTime });
  }

  async function saveLesson(draft: CalendarLessonCreateDraft) {
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const startAt = new Date(`${draft.date}T${draft.startTime}:00`);
      const endAt = new Date(startAt.getTime() + draft.duration * 60_000);
      const createdLesson = await createLesson({
        studentId: draft.studentId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: draft.price,
        status: draft.status,
        notes: draft.notes,
      });

      setLessons((current) => [...current, toCalendarLesson(createdLesson, students)]);
      setCreateModal(null);
      await loadCalendar(false);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveOtherEvent(draft: CalendarOtherEventCreateDraft) {
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const createdEvent = await createOtherEvent({
        title: draft.title,
        eventDate: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        notes: draft.notes,
      });
      setOtherEvents((current) => [...current, createdEvent]);
      setCreateModal(null);
      await loadCalendar(false);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openLessonDetails(lesson: CalendarLesson) {
    setLessonActionError(null);
    setSelectedLesson(lesson);
  }

  function openOtherEventDetails(calendarEvent: CalendarLesson) {
    const event = otherEvents.find((item) => item.id === calendarEvent.id);
    if (!event) return;
    setOtherEventActionError(null);
    setSelectedOtherEvent(event);
  }

  async function saveSelectedOtherEvent(draft: CalendarOtherEventDraft) {
    if (!selectedOtherEvent) return;
    setIsOtherEventMutating(true);
    setOtherEventActionError(null);
    try {
      const updatedEvent = await updateOtherEvent(selectedOtherEvent.id, {
        title: draft.title,
        eventDate: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        notes: draft.notes,
      });
      setOtherEvents((current) => current.map((item) => item.id === updatedEvent.id ? updatedEvent : item));
      setSelectedOtherEvent(updatedEvent);
      await loadCalendar(false);
    } catch (error) {
      setOtherEventActionError(getErrorMessage(error));
    } finally {
      setIsOtherEventMutating(false);
    }
  }

  async function deleteSelectedOtherEvent() {
    if (!selectedOtherEvent) return;
    setIsOtherEventMutating(true);
    setOtherEventActionError(null);
    try {
      await deleteOtherEvent(selectedOtherEvent.id);
      setOtherEvents((current) => current.filter((item) => item.id !== selectedOtherEvent.id));
      setSelectedOtherEvent(null);
      await loadCalendar(false);
    } catch (error) {
      setOtherEventActionError(getErrorMessage(error));
    } finally {
      setIsOtherEventMutating(false);
    }
  }

  async function saveSelectedLesson(draft: CalendarLessonEditDraft) {
    if (!selectedLesson) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const startAt = new Date(`${draft.date}T${draft.startTime}:00`);
      const endAt = new Date(startAt.getTime() + draft.duration * 60_000);
      const updatedLesson = await updateLesson(selectedLesson.id, {
        studentId: draft.studentId,
        groupId: null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: draft.price,
        status: draft.status,
        notes: draft.notes,
      });
      const calendarLesson = toCalendarLesson(updatedLesson, students);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function cancelSelectedLesson() {
    if (!selectedLesson) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const cancelledLesson = await cancelLesson(selectedLesson.id);
      const calendarLesson = toCalendarLesson(cancelledLesson, students);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function restoreSelectedLesson() {
    if (!selectedLesson) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const restoredLesson = await restoreLesson(selectedLesson.id);
      const calendarLesson = toCalendarLesson(restoredLesson, students);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function deleteSelectedLesson() {
    if (!selectedLesson) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      await deleteLesson(selectedLesson.id);
      setLessons((current) => current.filter((lesson) => lesson.id !== selectedLesson.id));
      setSelectedLesson(null);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  return (
    <div className="calendar-page">
      <div className="calendar-page-header">
        <div><p className="page-eyebrow">МОЁ РАСПИСАНИЕ</p><h1>Календарь</h1></div>
        <div className="calendar-header-actions">
          <Button variant="secondary" icon={<SlidersHorizontal size={17} />}>Фильтры</Button>
          <Button icon={<CalendarPlus size={18} />} onClick={() => openCreate()}>Добавить урок</Button>
        </div>
      </div>

      <section className="weekly-calendar-card">
        <div className="week-toolbar">
          <div className="week-navigation">
            <button className="calendar-nav-button" aria-label="Предыдущий период" onClick={() => movePeriod(-1)}><ChevronLeft size={18} /></button>
            <button className="today-button" onClick={() => setAnchorDate(new Date())}>Сегодня</button>
            <button className="calendar-nav-button" aria-label="Следующий период" onClick={() => movePeriod(1)}><ChevronRight size={18} /></button>
            <div className="date-range" aria-live="polite"><strong>{rangeLabel.main}</strong><span>{rangeLabel.year}</span></div>
          </div>
          <div className="calendar-view-selector" aria-label="Вид календаря">
            {views.map((item) => <button key={item.value} className={view === item.value ? "active" : ""} onClick={() => setView(item.value)}>{item.label}</button>)}
          </div>
        </div>

        <div className="calendar-legend">
          {view === "week" && (
            <div className="calendar-status-filter" aria-label="Фильтр по статусу">
              <span>Статус:</span>
              {([
                { value: "all", label: "Все" },
                { value: "scheduled", label: "Запланировано" },
                { value: "completed", label: "Проведено" },
                { value: "cancelled", label: "Отменено" },
              ] as const).map((item) => <button key={item.value} className={statusFilter === item.value ? `active status-${item.value}` : ""} onClick={() => setStatusFilter(item.value)}>{item.label}</button>)}
            </div>
          )}
          <span className="week-load">{displayedLessons.length} {eventWord(displayedLessons.length)} · {formatHours(displayedLessons.reduce((sum, lesson) => sum + lesson.duration / 60, 0))}</span>
        </div>

        {isLoading && <div className="calendar-data-state" aria-live="polite"><LoaderCircle size={18} /><span>Загружаем события из Supabase…</span></div>}
        {loadError && <div className="calendar-data-state calendar-data-error" role="alert"><CircleAlert size={18} /><span>{loadError}</span><button type="button" onClick={() => void loadCalendar()}>Повторить</button></div>}
        {!isLoading && !loadError && displayedLessons.length === 0 && <div className="calendar-data-state calendar-data-empty"><CalendarPlus size={18} /><span>В выбранном периоде событий пока нет. Нажмите «Добавить урок» или выберите свободное время.</span></div>}

        {view === "month" ? (
          <MonthCalendar anchorDate={anchorDate} lessons={calendarItems} onEmptyDateClick={(date) => openCreate(date)} onLessonClick={openLessonDetails} onOtherEventClick={openOtherEventDetails} />
        ) : (
          <WeekCalendar dates={visibleDates} lessons={view === "week" ? displayedLessons : visibleLessons} onEmptySlotClick={openCreate} onLessonClick={openLessonDetails} onOtherEventClick={openOtherEventDetails} />
        )}
      </section>

      {createModal && (
        <CalendarLessonCreateModal
          students={students}
          initialDate={createModal.date}
          initialStartTime={createModal.startTime}
          isSubmitting={isSubmitting}
          error={createError}
          onClose={() => { if (!isSubmitting) setCreateModal(null); }}
          onSave={saveLesson}
          onSaveOtherEvent={saveOtherEvent}
        />
      )}
      {selectedLesson && (
        <CalendarLessonDetailsModal
          lesson={selectedLesson}
          students={students}
          isMutating={isLessonMutating}
          error={lessonActionError}
          onClose={() => { if (!isLessonMutating) setSelectedLesson(null); }}
          onUpdate={saveSelectedLesson}
          onCancelLesson={cancelSelectedLesson}
          onRestoreLesson={restoreSelectedLesson}
          onDelete={deleteSelectedLesson}
        />
      )}
      {selectedOtherEvent && (
        <CalendarOtherEventDetailsModal
          event={selectedOtherEvent}
          isMutating={isOtherEventMutating}
          error={otherEventActionError}
          onClose={() => { if (!isOtherEventMutating) setSelectedOtherEvent(null); }}
          onUpdate={saveSelectedOtherEvent}
          onDelete={deleteSelectedOtherEvent}
        />
      )}
    </div>
  );
}

function toCalendarLesson(lesson: Lesson, students: Student[]): CalendarLesson {
  const student = students.find((item) => item.id === lesson.studentId);
  const start = new Date(lesson.startAt);
  const end = new Date(lesson.endAt);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  const studentKey = student?.id ?? lesson.studentId ?? lesson.id;

  return {
    id: lesson.id,
    kind: "lesson",
    studentId: lesson.studentId ?? undefined,
    participant: student ? `${student.firstName} ${student.lastName}` : "Ученик",
    date: toDateKey(start),
    startTime: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
    duration,
    price: lesson.price,
    status: lesson.status,
    notes: lesson.notes,
    startAt: lesson.startAt,
    endAt: lesson.endAt,
    subject: "Индивидуальное занятие",
    color: lessonColors[hashString(studentKey) % lessonColors.length],
    seriesId: lesson.lessonSeriesId ?? undefined,
  };
}

function toCalendarOtherEvent(event: OtherEvent): CalendarLesson {
  const duration = Math.max(1, timeToMinutes(event.endTime) - timeToMinutes(event.startTime));
  return {
    id: event.id,
    kind: "other",
    participant: event.title,
    date: event.eventDate,
    startTime: event.startTime,
    duration,
    price: 0,
    status: "scheduled",
    notes: event.notes,
    subject: event.notes || "Другое событие",
    color: "lavender",
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
}

function eventWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "событий";
  if (last === 1) return "событие";
  if (last >= 2 && last <= 4) return "события";
  return "событий";
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatHours(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} ч`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "Неизвестная ошибка Supabase";
}
