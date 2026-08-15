const monthsGenitive = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const monthsNominative = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  return next;
}

export function startOfWeek(date: Date) {
  const day = date.getDay() || 7;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), 1 - day);
}

export function isSameDay(first: Date, second: Date) {
  return toDateKey(first) === toDateKey(second);
}

export function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getDateRangeLabel(anchor: Date, view: "day" | "week" | "month") {
  if (view === "day") return { main: `${anchor.getDate()} ${monthsGenitive[anchor.getMonth()]}`, year: String(anchor.getFullYear()) };
  if (view === "month") return { main: monthsNominative[anchor.getMonth()], year: String(anchor.getFullYear()) };

  const [start, , , , , , end] = getWeekDays(anchor);
  const main = start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${end.getDate()} ${monthsGenitive[end.getMonth()]}`
    : `${start.getDate()} ${monthsGenitive[start.getMonth()]} – ${end.getDate()} ${monthsGenitive[end.getMonth()]}`;
  const year = start.getFullYear() === end.getFullYear() ? String(end.getFullYear()) : `${start.getFullYear()}–${end.getFullYear()}`;
  return { main, year };
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatLessonEnd(startTime: string, duration: number) {
  return minutesToTime(timeToMinutes(startTime) + duration);
}
