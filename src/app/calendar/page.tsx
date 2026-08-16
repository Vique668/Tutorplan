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
  type CalendarLessonCancelDraft,
  type CalendarLessonEditDraft,
  type CalendarLessonRescheduleDraft,
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
import type { StudentGroup } from "@/components/groups/group-types";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/types/lesson";
import type { OtherEvent } from "@/types/other-event";
import { getZonedParts, zonedDateKey, zonedLocalToIso } from "@/lib/date-time";
import {
  cancelLesson,
  createLesson,
  deleteLesson,
  getLessons,
  updateLesson,
} from "../../../lib/supabase/lessons";
import { createOtherEvent, deleteOtherEvent, getOtherEvents, updateOtherEvent } from "../../../lib/supabase/other-events";
import { getStudents } from "../../../lib/supabase/students";
import { getGroups } from "../../../lib/supabase/groups";
import { getTutorTimezone } from "../../../lib/supabase/settings";

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
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [timezone, setTimezone] = useState("Europe/Moscow");
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
      const range = getQueryRange(anchorDate, view);
      const loadedTimezone = await getTutorTimezone();
      const [loadedStudents, loadedGroups, loadedLessons, loadedOtherEvents] = await Promise.all([
        getStudents(),
        getGroups(),
        getLessons(zonedLocalToIso(range.from, "00:00", loadedTimezone), zonedLocalToIso(range.to, "00:00", loadedTimezone)),
        getOtherEvents(range.from, range.to),
      ]);
      setStudents(loadedStudents);
      setGroups(loadedGroups);
      setTimezone(loadedTimezone);
      setLessons(loadedLessons.map((lesson) => toCalendarLesson(lesson, loadedStudents, loadedGroups, loadedTimezone)));
      setOtherEvents(loadedOtherEvents);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [anchorDate, view]);

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
    const endTime = minutesToTime(timeToMinutes(draft.startTime) + draft.duration);
    if (!confirmCalendarCollision(draft.date, draft.startTime, endTime)) return;
    setIsSubmitting(true);
    setCreateError(null);

    try {
      const startAt = new Date(zonedLocalToIso(draft.date, draft.startTime, timezone));
      const endAt = new Date(startAt.getTime() + draft.duration * 60_000);
      const target = draft.targetType === "group"
        ? { groupId: draft.groupId ?? "", studentId: null as null }
        : { studentId: draft.studentId ?? "", groupId: null as null };
      const createdLesson = await createLesson({
        ...target,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: draft.price,
        status: draft.status,
        notes: draft.notes,
      });

      setLessons((current) => [...current, toCalendarLesson(createdLesson, students, groups, timezone)]);
      setCreateModal(null);
      await loadCalendar(false);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveOtherEvent(draft: CalendarOtherEventCreateDraft) {
    if (!confirmCalendarCollision(draft.date, draft.startTime, draft.endTime)) return;
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
    if (!confirmCalendarCollision(draft.date, draft.startTime, draft.endTime, selectedOtherEvent.id, "other")) return;
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
    if (!confirmCalendarCollision(draft.date, draft.startTime, draft.endTime, selectedLesson.id, "lesson")) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const startAt = new Date(zonedLocalToIso(draft.date, draft.startTime, timezone));
      const endAt = new Date(zonedLocalToIso(draft.date, draft.endTime, timezone));
      const updatedLesson = await updateLesson(selectedLesson.id, {
        studentId: draft.targetType === "student" ? draft.studentId : null,
        groupId: draft.targetType === "group" ? draft.groupId : null,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: draft.price,
        status: draft.status,
        notes: draft.notes,
      });
      const calendarLesson = toCalendarLesson(updatedLesson, students, groups, timezone);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function cancelSelectedLesson(draft: CalendarLessonCancelDraft) {
    if (!selectedLesson) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const cancelledLesson = await cancelLesson(selectedLesson.id, draft);
      const calendarLesson = toCalendarLesson(cancelledLesson, students, groups, timezone);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function rescheduleSelectedLesson(draft: CalendarLessonRescheduleDraft) {
    if (!selectedLesson) return;
    if (!confirmCalendarCollision(draft.date, draft.startTime, draft.endTime, selectedLesson.id, "lesson")) return;

    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const updated = await updateLesson(selectedLesson.id, {
        startAt: zonedLocalToIso(draft.date, draft.startTime, timezone),
        endAt: zonedLocalToIso(draft.date, draft.endTime, timezone),
        status: "rescheduled",
      });
      const calendarLesson = toCalendarLesson(updated, students, groups, timezone);
      setLessons((current) => current.map((lesson) => lesson.id === calendarLesson.id ? calendarLesson : lesson));
      setSelectedLesson(calendarLesson);
      setAnchorDate(dateKeyToDate(draft.date));
      await loadCalendar(false);
    } catch (error) {
      setLessonActionError(getErrorMessage(error));
    } finally {
      setIsLessonMutating(false);
    }
  }

  async function changeSelectedLessonStatus(status: Lesson["status"]) {
    if (!selectedLesson) return;
    setIsLessonMutating(true);
    setLessonActionError(null);
    try {
      const updated = await updateLesson(selectedLesson.id, { status });
      const calendarLesson = toCalendarLesson(updated, students, groups, timezone);
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

  function confirmCalendarCollision(date: string, startTime: string, endTime: string, excludedId?: string, excludedKind?: "lesson" | "other") {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    const lessonConflict = lessons.find((lesson) => lesson.id !== (excludedKind === "lesson" ? excludedId : undefined)
      && lesson.date === date && lesson.status !== "cancelled"
      && start < timeToMinutes(lesson.startTime) + lesson.duration
      && end > timeToMinutes(lesson.startTime));
    const otherConflict = otherEvents.find((event) => event.id !== (excludedKind === "other" ? excludedId : undefined)
      && event.eventDate === date
      && start < timeToMinutes(event.endTime)
      && end > timeToMinutes(event.startTime));
    const conflictName = lessonConflict?.participant ?? otherConflict?.title;
    if (!conflictName) return true;
    return window.confirm(`В это время уже есть событие «${conflictName}». Всё равно сохранить?`);
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
            <button className="today-button" onClick={() => setAnchorDate(dateKeyToDate(zonedDateKey(new Date(), timezone)))}>Сегодня</button>
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
                { value: "rescheduled", label: "Перенесено" },
              ] as const).map((item) => <button key={item.value} className={statusFilter === item.value ? `active status-${item.value}` : ""} onClick={() => setStatusFilter(item.value)}>{item.label}</button>)}
            </div>
          )}
          <span className="week-load">{displayedLessons.length} {eventWord(displayedLessons.length)} · {formatHours(displayedLessons.reduce((sum, lesson) => sum + lesson.duration / 60, 0))}</span>
        </div>

        <div className="calendar-color-legend" aria-label="Цветовые обозначения календаря">
          <span><i className="calendar-color-scheduled" />Запланировано</span>
          <span><i className="calendar-color-completed" />Проведено</span>
          <span><i className="calendar-color-cancelled" />Отменено</span>
          <span><i className="calendar-color-rescheduled" />Перенесено</span>
          <span><i className="calendar-color-no-show" />Не пришёл</span>
          <span><i className="calendar-color-other" />Другое событие</span>
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
          students={students.filter((student) => student.status === "active")}
          groups={groups.filter((group) => group.status === "active")}
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
          groups={groups}
          isMutating={isLessonMutating}
          error={lessonActionError}
          onClose={() => { if (!isLessonMutating) setSelectedLesson(null); }}
          onUpdate={saveSelectedLesson}
          onCancelLesson={cancelSelectedLesson}
          onReschedule={rescheduleSelectedLesson}
          onStatusChange={changeSelectedLessonStatus}
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

function toCalendarLesson(lesson: Lesson, students: Student[], groups: StudentGroup[], timezone: string): CalendarLesson {
  const student = students.find((item) => item.id === lesson.studentId);
  const group = groups.find((item) => item.id === lesson.groupId);
  const start = new Date(lesson.startAt);
  const end = new Date(lesson.endAt);
  const zonedStart = getZonedParts(start, timezone);
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
  const studentKey = student?.id ?? group?.id ?? lesson.studentId ?? lesson.groupId ?? lesson.id;

  return {
    id: lesson.id,
    kind: "lesson",
    studentId: lesson.studentId ?? undefined,
    groupId: lesson.groupId ?? undefined,
    participant: group?.name ?? (student ? `${student.firstName} ${student.lastName}` : "Участник"),
    date: `${zonedStart.year}-${String(zonedStart.month).padStart(2, "0")}-${String(zonedStart.day).padStart(2, "0")}`,
    startTime: `${String(zonedStart.hour).padStart(2, "0")}:${String(zonedStart.minute).padStart(2, "0")}`,
    duration,
    price: lesson.price,
    status: lesson.status,
    cancellationReason: lesson.cancellationReason,
    cancellationFee: lesson.cancellationFee,
    cancelledAt: lesson.cancelledAt,
    notes: lesson.notes,
    startAt: lesson.startAt,
    endAt: lesson.endAt,
    subject: group ? `Групповое занятие · ${group.studentIds.length} уч.` : "Индивидуальное занятие",
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

function minutesToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function getQueryRange(anchorDate: Date, view: CalendarView): { from: string; to: string } {
  if (view === "day") return { from: toDateKey(anchorDate), to: toDateKey(addDays(anchorDate, 1)) };
  if (view === "week") {
    const from = startOfWeek(anchorDate);
    return { from: toDateKey(from), to: toDateKey(addDays(from, 7)) };
  }
  const from = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const to = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1);
  return { from: toDateKey(from), to: toDateKey(to) };
}

function dateKeyToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
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
