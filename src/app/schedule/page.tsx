"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CircleAlert, Clock3, LoaderCircle, Plus } from "lucide-react";
import { ScheduleFormModal } from "@/components/schedule/schedule-form-modal";
import type { Student } from "@/components/students/student-types";
import type { StudentGroup } from "@/components/groups/group-types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type {
  CreateLessonSeriesInput,
  LessonSeries,
  LessonSeriesUpdateOptions,
} from "@/types/lesson-series";
import {
  createLessonSeries,
  deleteLessonSeries,
  getLessonSeries,
  setLessonSeriesActive,
  syncLessonSeriesFuture,
  updateLessonSeries,
} from "../../../lib/supabase/lesson-series";
import { getStudents } from "../../../lib/supabase/students";
import { getGroups } from "../../../lib/supabase/groups";

const weekdays = [
  { value: 1, label: "Понедельник" },
  { value: 2, label: "Вторник" },
  { value: 3, label: "Среда" },
  { value: 4, label: "Четверг" },
  { value: 5, label: "Пятница" },
  { value: 6, label: "Суббота" },
  { value: 7, label: "Воскресенье" },
];

export default function SchedulePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [series, setSeries] = useState<LessonSeries[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createWeekday, setCreateWeekday] = useState(1);
  const [selectedSeries, setSelectedSeries] = useState<LessonSeries | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadSchedule = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedStudents, loadedGroups, loadedSeries] = await Promise.all([getStudents(), getGroups(), getLessonSeries()]);
      setStudents(loadedStudents);
      setGroups(loadedGroups);
      setSeries(loadedSeries);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const activeStudents = students.filter((student) => student.status === "active");
  const activeGroups = groups.filter((group) => group.status === "active");

  async function saveSchedule(draft: CreateLessonSeriesInput, options?: LessonSeriesUpdateOptions) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (selectedSeries) {
        const updated = await updateLessonSeries(selectedSeries.id, draft);
        if (updated.isActive && options && options.scope !== "template") {
          const fromDate = options.scope === "from_date" && options.fromDate
            ? options.fromDate
            : toLocalDateKey(new Date());
          await syncLessonSeriesFuture(updated.id, fromDate);
        }
        setSeries((current) => current.map((item) => item.id === updated.id ? updated : item).sort(compareSeries));
      } else {
        const created = await createLessonSeries(draft);
        setSeries((current) => [...current, created].sort(compareSeries));
      }
      closeModal();
      await loadSchedule(false);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateModal(weekday: number) {
    setSubmitError(null);
    setSelectedSeries(null);
    setCreateWeekday(weekday);
    setIsModalOpen(true);
  }

  function openDetailsModal(item: LessonSeries) {
    setSubmitError(null);
    setSelectedSeries(item);
    setCreateWeekday(item.weekday);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedSeries(null);
  }

  async function removeSchedule() {
    if (!selectedSeries) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await deleteLessonSeries(selectedSeries.id);
      setSeries((current) => current.filter((item) => item.id !== selectedSeries.id));
      closeModal();
      await loadSchedule(false);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleSchedule() {
    if (!selectedSeries) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await setLessonSeriesActive(selectedSeries.id, !selectedSeries.isActive);
      setSeries((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelectedSeries(updated);
      await loadSchedule(false);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack schedule-template-page">
      <PageHeader title="Расписание" description="Это шаблон недели, исходя из него формируется ваш календарь" />

      {isLoading && <Card className="calendar-data-state schedule-template-state" aria-live="polite"><LoaderCircle size={18} /><span>Загружаем шаблон недели из Supabase…</span></Card>}
      {loadError && <div className="card calendar-data-state calendar-data-error schedule-template-state" role="alert"><CircleAlert size={18} /><span>{loadError}</span><button type="button" onClick={() => void loadSchedule()}>Повторить</button></div>}

      {!isLoading && !loadError && (
        <div className="schedule-board-scroll">
          <div className="schedule-week-board">
            {weekdays.map((weekday) => {
              const daySeries = series.filter((item) => item.weekday === weekday.value).sort(compareSeries);
              const occupiedMinutes = daySeries.filter((item) => item.isActive).reduce((sum, item) => sum + getSeriesDuration(item), 0);
              return (
                <section className="card schedule-board-column" key={weekday.value}>
                  <div className="schedule-board-header">
                    <div className="schedule-board-title"><CalendarDays size={15} /><h2>{weekday.label}</h2></div>
                    <div className="schedule-board-counters"><span>Уроков: {daySeries.length}</span><span>Занятость {formatOccupiedDuration(occupiedMinutes)}</span></div>
                    <button type="button" className="schedule-column-add" aria-label={`Добавить расписание: ${weekday.label}`} onClick={() => openCreateModal(weekday.value)}><Plus size={16} /></button>
                  </div>

                  <div className="schedule-board-cards">
                    {daySeries.map((item) => {
                      const student = students.find((candidate) => candidate.id === item.studentId);
                      const group = groups.find((candidate) => candidate.id === item.groupId);
                      return (
                        <button type="button" className={`schedule-compact-card ${item.isActive ? "" : "schedule-compact-card-inactive"}`} key={item.id} onClick={() => openDetailsModal(item)}>
                          <span className={`schedule-state-dot ${item.isActive ? "is-active" : ""}`} aria-hidden="true" />
                          <strong>{group?.name ?? (student ? `${student.firstName} ${student.lastName}` : "Участник не найден")}</strong>
                          <span className="schedule-compact-time">{item.startTime}–{getSeriesEndTime(item)}</span>
                          <small>{formatDuration(getSeriesDuration(item))}</small>
                          <small className="schedule-compact-price">{item.price.toLocaleString("ru-RU")} ₽</small>
                          <em>{item.isActive ? "Активно" : "Отключено"}</em>
                        </button>
                      );
                    })}
                    {!daySeries.length && <div className="schedule-board-empty"><Clock3 size={15} /><span>Нет занятий</span></div>}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {!isLoading && !loadError && series.length === 0 && <div className="schedule-template-note"><CalendarDays size={17} /><span>Шаблон пока пуст. Используйте «+» в нужном дне недели.</span></div>}

      {isModalOpen && (
        <ScheduleFormModal
          students={selectedSeries ? students : activeStudents}
          groups={selectedSeries ? groups : activeGroups}
          series={selectedSeries ?? undefined}
          initialWeekday={createWeekday}
          initialStartDate={toLocalDateKey(new Date())}
          isSubmitting={isSubmitting}
          error={submitError}
          onClose={() => { if (!isSubmitting) closeModal(); }}
          onSave={saveSchedule}
          onDelete={removeSchedule}
          onToggle={toggleSchedule}
        />
      )}
    </div>
  );
}

function compareSeries(left: LessonSeries, right: LessonSeries): number {
  return left.weekday - right.weekday || left.startTime.localeCompare(right.startTime);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes % 60 === 0) return `${minutes / 60} ч`;
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

function formatOccupiedDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

function getSeriesEndTime(item: LessonSeries): string {
  if (item.endTime) return item.endTime;
  const startMinutes = timeToMinutes(item.startTime);
  const totalMinutes = startMinutes + item.duration;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

function getSeriesDuration(item: LessonSeries): number {
  return timeToMinutes(getSeriesEndTime(item)) - timeToMinutes(item.startTime);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Не удалось загрузить шаблон расписания";
}
