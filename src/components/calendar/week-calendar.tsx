"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Repeat2, Video } from "lucide-react";
import { lessonStatusLabels, type CalendarLesson } from "./calendar-types";
import { formatLessonEnd, timeToMinutes, toDateKey } from "./date-utils";

const dayNames = [
  { short: "ВС", full: "Воскресенье" },
  { short: "ПН", full: "Понедельник" },
  { short: "ВТ", full: "Вторник" },
  { short: "СР", full: "Среда" },
  { short: "ЧТ", full: "Четверг" },
  { short: "ПТ", full: "Пятница" },
  { short: "СБ", full: "Суббота" },
];

const firstHour = 8;
const lastHour = 22;
const hourHeight = 64;
const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);

type WeekCalendarProps = {
  dates: Date[];
  lessons: CalendarLesson[];
  onEmptySlotClick: (date: Date, startTime: string) => void;
  onLessonClick: (lesson: CalendarLesson) => void;
  onOtherEventClick: (event: CalendarLesson) => void;
};

export function WeekCalendar({ dates, lessons, onEmptySlotClick, onLessonClick, onOtherEventClick }: WeekCalendarProps) {
  const today = new Date();
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const showCurrentTime = nowMinutes >= firstHour * 60 && nowMinutes <= lastHour * 60;
  const gridStyle = { "--day-count": dates.length } as CSSProperties;

  function handleSlotClick(event: MouseEvent<HTMLDivElement>, date: Date) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(bounds.height - 1, event.clientY - bounds.top));
    const slot = Math.floor(relativeY / (hourHeight / 2));
    const totalMinutes = firstHour * 60 + slot * 30;
    onEmptySlotClick(date, `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`);
  }

  return (
    <div className="tutor-week-scroll">
      <div className={`tutor-week-calendar ${dates.length === 1 ? "tutor-day-calendar" : ""}`}>
        <div className="tutor-week-header" style={gridStyle}>
          <div className="timezone-label">GMT+3</div>
          {dates.map((date) => {
            const names = dayNames[date.getDay()];
            const current = toDateKey(date) === toDateKey(today);
            const weekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <div className={`tutor-day-heading ${current ? "is-current" : ""} ${weekend ? "is-weekend" : ""}`} key={toDateKey(date)}>
                <span>{names.short}</span>
                <strong>{date.getDate()}</strong>
                <small>{names.full}</small>
              </div>
            );
          })}
        </div>

        <div className="tutor-week-body">
          <div className="tutor-time-axis">
            {hours.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}
            <span>22:00</span>
          </div>

          <div className="tutor-days-grid" style={gridStyle}>
            {dates.map((date) => {
              const dateKey = toDateKey(date);
              const current = dateKey === toDateKey(today);
              const weekend = date.getDay() === 0 || date.getDay() === 6;
              const dayLessons = lessons.filter((lesson) => lesson.date === dateKey);
              const lessonBreaks = getLessonBreaks(dayLessons);
              return (
                <div
                  className={`tutor-day-column ${current ? "is-current" : ""} ${weekend ? "is-weekend" : ""}`}
                  key={dateKey}
                  onClick={(event) => handleSlotClick(event, date)}
                  aria-label={`Добавить занятие ${date.toLocaleDateString("ru-RU")}`}
                >
                  {hours.map((hour) => <div className="tutor-hour-line" key={hour} />)}
                  {current && showCurrentTime && (
                    <div className="current-time-line" style={{ top: `${((nowMinutes / 60) - firstHour) * hourHeight}px` }}><span /></div>
                  )}
                  {lessonBreaks.map((lessonBreak) => (
                    <div
                      className={`calendar-lesson-break ${lessonBreak.start === lessonBreak.end ? "is-zero" : ""}`}
                      key={`${lessonBreak.start}-${lessonBreak.end}`}
                      style={{
                        top: `${((lessonBreak.start / 60) - firstHour) * hourHeight}px`,
                        height: `${((lessonBreak.end - lessonBreak.start) / 60) * hourHeight}px`,
                      }}
                      aria-label={`Перерыв ${formatBreakDuration(lessonBreak.end - lessonBreak.start)}`}
                    >
                      <span>Перерыв · {formatBreakDuration(lessonBreak.end - lessonBreak.start)}</span>
                    </div>
                  ))}
                  {dayLessons.map((lesson) => {
                    const startMinutes = timeToMinutes(lesson.startTime);
                    const visibleStart = Math.max(startMinutes, firstHour * 60);
                    const visibleEnd = Math.min(startMinutes + lesson.duration, lastHour * 60);
                    if (visibleStart >= visibleEnd) return null;

                    if (lesson.kind === "other") {
                      return (
                        <button
                          type="button"
                          className="tutor-lesson tutor-lesson-lavender calendar-other-event"
                          key={lesson.id}
                          title={lesson.notes ? `${lesson.participant}: ${lesson.notes}` : lesson.participant}
                          style={{
                            top: `${((visibleStart / 60) - firstHour) * hourHeight + 3}px`,
                            height: `${((visibleEnd - visibleStart) / 60) * hourHeight - 6}px`,
                          }}
                          onClick={(event) => { event.stopPropagation(); onOtherEventClick(lesson); }}
                        >
                          <strong>{lesson.participant}</strong>
                          <span>{lesson.startTime}–{formatLessonEnd(lesson.startTime, lesson.duration)}</span>
                          <small><b className="calendar-event-kind calendar-event-kind-other">Другое</b></small>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        className={`tutor-lesson tutor-lesson-${lesson.color} lesson-status-${lesson.status}`}
                        key={lesson.id}
                        style={{
                          top: `${((visibleStart / 60) - firstHour) * hourHeight + 3}px`,
                          height: `${((visibleEnd - visibleStart) / 60) * hourHeight - 6}px`,
                        }}
                        onClick={(event) => { event.stopPropagation(); onLessonClick(lesson); }}
                      >
                        <i className="lesson-status-mark" role="img" aria-label={lessonStatusLabels[lesson.status]} title={lessonStatusLabels[lesson.status]} />
                        <strong>{lesson.participant}</strong>
                        <span>{lesson.startTime}–{formatLessonEnd(lesson.startTime, lesson.duration)}</span>
                        <small><b className="calendar-event-kind">Урок</b><span>{lessonStatusLabels[lesson.status]} · {lesson.duration} мин · {lesson.price.toLocaleString("ru-RU")} ₽</span>{lesson.seriesId && <Repeat2 size={10} aria-label="Повторяется каждую неделю" />}{lesson.online && <Video size={11} />}</small>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getLessonBreaks(items: CalendarLesson[]) {
  const intervals = items
    .filter((item) => item.kind === "lesson" && item.status !== "cancelled")
    .map((item) => ({ start: timeToMinutes(item.startTime), end: timeToMinutes(item.startTime) + item.duration }))
    .sort((first, second) => first.start - second.start);
  if (intervals.length < 2) return [];

  const breaks: { start: number; end: number }[] = [];
  let occupiedUntil = intervals[0].end;
  for (const interval of intervals.slice(1)) {
    if (interval.start >= occupiedUntil) {
      const visibleStart = Math.max(occupiedUntil, firstHour * 60);
      const visibleEnd = Math.min(interval.start, lastHour * 60);
      const isVisibleZeroBreak = interval.start === occupiedUntil
        && occupiedUntil >= firstHour * 60
        && occupiedUntil <= lastHour * 60;
      if (visibleEnd > visibleStart || isVisibleZeroBreak) breaks.push({ start: visibleStart, end: visibleEnd });
    }
    occupiedUntil = Math.max(occupiedUntil, interval.end);
  }
  return breaks;
}

function formatBreakDuration(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hoursValue = Math.floor(minutes / 60);
  const minutesValue = minutes % 60;
  return minutesValue ? `${hoursValue} ч ${minutesValue} мин` : `${hoursValue} ч`;
}
