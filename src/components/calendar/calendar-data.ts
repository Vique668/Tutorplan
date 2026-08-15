import type { CalendarLesson, LessonColor, LessonStatus, RecurringLessonSeries } from "./calendar-types";
import { initialGroups } from "@/components/groups/group-data";
import { initialStudents } from "@/components/students/student-data";
import { addDays, formatLessonEnd, fromDateKey, timeToMinutes, toDateKey } from "./date-utils";

const studentPresentation: Record<string, { subject: string; color: LessonColor; online: boolean }> = {
  "Ульяна Шмагина": { subject: "Математика", color: "apricot", online: true },
  "Павел Новиков": { subject: "Физика", color: "sage", online: false },
  "Мария Крюкова": { subject: "Геометрия", color: "sky", online: false },
  "Катя Игнатова": { subject: "Алгебра", color: "rose", online: true },
};

export const calendarParticipants = [
  ...initialStudents.filter((student) => student.status === "active").map((student) => {
    const name = `${student.firstName} ${student.lastName}`;
    const presentation = studentPresentation[name] ?? { subject: "Индивидуальное занятие", color: "apricot" as LessonColor, online: true };
    return { name, kind: "student" as const, subject: presentation.subject, color: presentation.color, price: student.lessonPrice, online: presentation.online };
  }),
  ...initialGroups.filter((group) => group.status === "active").map((group) => ({ name: group.name, kind: "group" as const, subject: "Групповое занятие", color: "lavender" as LessonColor, price: group.lessonPrice, online: true })),
];

export const initialRecurringSeries: RecurringLessonSeries[] = [
  series("series-uliana-monday", "Ульяна Шмагина", "2026-08-10", "2026-09-28", "09:00", 90),
  series("series-round-up-thursday", "Round Up", "2026-08-13", "2026-09-24", "18:00", 90),
];

export const initialCalendarLessons: CalendarLesson[] = [
  lesson("2", "Павел Новиков", "2026-08-10", "14:00", 90, "completed"),
  lesson("3", "Round Up", "2026-08-11", "10:00", 90, "completed"),
  lesson("4", "Катя Игнатова", "2026-08-11", "17:00", 60, "cancelled"),
  lesson("5", "Мария Крюкова", "2026-08-12", "12:00", 90, "completed"),
  lesson("6", "Ульяна Шмагина", "2026-08-12", "16:00", 90, "rescheduled"),
  lesson("7", "Катя Игнатова", "2026-08-13", "09:00", 90, "completed"),
  lesson("8", "Павел Новиков", "2026-08-13", "13:00", 60, "no_show"),
  lesson("10", "Мария Крюкова", "2026-08-14", "11:00", 90, "scheduled"),
  lesson("11", "Ульяна Шмагина", "2026-08-14", "16:00", 90, "scheduled"),
  lesson("12", "Павел Новиков", "2026-08-15", "10:00", 90, "scheduled"),
  ...initialRecurringSeries.flatMap(createSeriesOccurrences).map((item) => item.date <= "2026-08-13" ? { ...item, status: "completed" as const } : item),
];

function lesson(id: string, participant: string, date: string, startTime: string, duration: number, status: LessonStatus = "scheduled"): CalendarLesson {
  const person = calendarParticipants.find((item) => item.name === participant) ?? calendarParticipants[0];
  return {
    id,
    participant,
    date,
    startTime,
    duration,
    price: person.price,
    status,
    subject: person.subject,
    color: person.color,
    online: person.online,
  };
}

function series(id: string, participant: string, startDate: string, endDate: string, startTime: string, duration: number): RecurringLessonSeries {
  const person = calendarParticipants.find((item) => item.name === participant) ?? calendarParticipants[0];
  return { id, frequency: "weekly", participant, startDate, endDate, startTime, endTime: formatLessonEnd(startTime, duration), duration, price: person.price, status: "scheduled", subject: person.subject, color: person.color, online: person.online };
}

export function createSeriesOccurrences(seriesItem: RecurringLessonSeries): CalendarLesson[] {
  const occurrences: CalendarLesson[] = [];
  const duration = seriesItem.endTime
    ? timeToMinutes(seriesItem.endTime) - timeToMinutes(seriesItem.startTime)
    : seriesItem.duration;
  let date = fromDateKey(seriesItem.startDate);
  const endDate = fromDateKey(seriesItem.endDate);
  let guard = 0;

  while (date <= endDate && guard < 520) {
    const dateKey = toDateKey(date);
    occurrences.push({
      id: `${seriesItem.id}:${dateKey}`,
      participant: seriesItem.participant,
      date: dateKey,
      startTime: seriesItem.startTime,
      duration,
      price: seriesItem.price,
      status: seriesItem.status,
      subject: seriesItem.subject,
      color: seriesItem.color,
      online: seriesItem.online,
      seriesId: seriesItem.id,
      seriesDate: dateKey,
    });
    date = addDays(date, 7);
    guard += 1;
  }
  return occurrences;
}
