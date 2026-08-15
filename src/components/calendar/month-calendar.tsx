"use client";

import { lessonStatusLabels, type CalendarLesson } from "./calendar-types";
import { formatLessonEnd, getMonthDays, toDateKey } from "./date-utils";

const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type MonthCalendarProps = {
  anchorDate: Date;
  lessons: CalendarLesson[];
  onEmptyDateClick: (date: Date) => void;
  onLessonClick: (lesson: CalendarLesson) => void;
  onOtherEventClick: (event: CalendarLesson) => void;
};

export function MonthCalendar({ anchorDate, lessons, onEmptyDateClick, onLessonClick, onOtherEventClick }: MonthCalendarProps) {
  const days = getMonthDays(anchorDate);
  const todayKey = toDateKey(new Date());

  return (
    <div className="interactive-month-scroll">
      <div className="interactive-month-calendar">
        {weekdays.map((day) => <div className="interactive-month-weekday" key={day}>{day}</div>)}
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const dayLessons = lessons.filter((lesson) => lesson.date === dateKey).sort((a, b) => a.startTime.localeCompare(b.startTime));
          const muted = date.getMonth() !== anchorDate.getMonth();
          return (
            <div
              className={`interactive-month-day ${muted ? "is-muted" : ""} ${dateKey === todayKey ? "is-today" : ""}`}
              key={dateKey}
              onClick={() => onEmptyDateClick(date)}
            >
              <span className="interactive-month-number">{date.getDate()}</span>
              <div className="interactive-month-lessons">
                {dayLessons.slice(0, 3).map((lesson) => (
                  lesson.kind === "other" ? (
                    <button type="button" className="month-lesson-pill tutor-lesson-lavender calendar-other-event" key={lesson.id} title={lesson.notes || lesson.participant} onClick={(event) => { event.stopPropagation(); onOtherEventClick(lesson); }}>
                      <span>{lesson.startTime}–{formatLessonEnd(lesson.startTime, lesson.duration)}</span>
                      <strong><em className="calendar-event-kind calendar-event-kind-other">Другое</em>{lesson.participant}</strong>
                    </button>
                  ) : (
                    <button type="button" className={`month-lesson-pill tutor-lesson-${lesson.color} lesson-status-${lesson.status}`} key={lesson.id} onClick={(event) => { event.stopPropagation(); onLessonClick(lesson); }}>
                      <i className="month-status-mark" role="img" aria-label={lessonStatusLabels[lesson.status]} title={lessonStatusLabels[lesson.status]} />
                      <span>{lesson.startTime}–{formatLessonEnd(lesson.startTime, lesson.duration)} · {lesson.duration} мин</span>
                      <strong><em className="calendar-event-kind">Урок</em>{lesson.seriesId ? `↻ ${lesson.participant}` : lesson.participant} · {lesson.price.toLocaleString("ru-RU")} ₽</strong>
                    </button>
                  )
                ))}
                {dayLessons.length > 3 && <small>Ещё {dayLessons.length - 3}</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
