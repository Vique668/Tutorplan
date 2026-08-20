"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, CircleAlert, Clock3, LoaderCircle, Target, TrendingUp, Users, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import type { FinanceTransaction } from "@/types/finance";
import type { Lesson } from "@/types/lesson";
import { getZonedParts, zonedLocalToIso } from "@/lib/date-time";
import { getFinanceTransactions } from "../../../lib/supabase/finance";
import { getCompletedLessons } from "../../../lib/supabase/lessons";
import { getTutorTimezone } from "../../../lib/supabase/settings";

type PeriodType = "month" | "year";

export default function StatisticsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [period, setPeriod] = useState(() => toMonthKey(new Date()));
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<FinanceTransaction[]>([]);
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => getRange(periodType, period), [periodType, period]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedTimezone = await getTutorTimezone();
      const [completedLessons, transactions] = await Promise.all([
        getCompletedLessons(
          zonedLocalToIso(range.from, "00:00", loadedTimezone),
          zonedLocalToIso(range.to, "00:00", loadedTimezone),
        ),
        getFinanceTransactions(range.from, range.to),
      ]);
      setLessons(completedLessons);
      setFinanceTransactions(transactions);
      setTimezone(loadedTimezone);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { void load(); }, [load]);

  const teachingMinutes = lessons.reduce((total, lesson) => total + durationMinutes(lesson), 0);
  const completedLessonIds = new Set(lessons.map((lesson) => lesson.id));
  const postedLessonCharges = financeTransactions.filter((item) => item.type === "lesson_charge" && item.status === "posted");
  const completedLessonIncome = postedLessonCharges
    .filter((item) => item.lessonId && completedLessonIds.has(item.lessonId))
    .reduce((total, item) => total + item.amount, 0);
  const income = postedLessonCharges.reduce((total, item) => total + item.amount, 0);
  const otherCharges = Math.max(0, income - completedLessonIncome);
  const averagePrice = lessons.length ? Math.round(completedLessonIncome / lessons.length) : 0;
  const participants = new Set(lessons.map((lesson) => lesson.studentId ? `student:${lesson.studentId}` : `group:${lesson.groupId}`)).size;
  const activity = buildActivity(lessons, range.from, range.to, periodType, timezone);
  const maxActivity = Math.max(...activity.map((item) => item.minutes), 1);

  function switchPeriodType(next: PeriodType) {
    setPeriodType(next);
    setPeriod(next === "month" ? toMonthKey(new Date()) : String(new Date().getFullYear()));
  }

  return (
    <div className="page-stack">
      <PageHeader title="Статистика" description="Проведённые уроки и реальные финансовые начисления" actions={<div className="statistics-period-controls"><div className="segmented"><button className={periodType === "month" ? "active" : ""} onClick={() => switchPeriodType("month")}>Месяц</button><button className={periodType === "year" ? "active" : ""} onClick={() => switchPeriodType("year")}>Год</button></div><input type={periodType === "month" ? "month" : "number"} min={2020} max={2100} value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Период статистики" /></div>} />
      {isLoading && <Card><div className="students-empty-state"><LoaderCircle className="spin" size={28} /><h2>Считаем статистику</h2></div></Card>}
      {error && <Card><div className="students-empty-state" role="alert"><CircleAlert size={28} /><h2>Не удалось загрузить статистику</h2><p>{error}</p></div></Card>}
      {!isLoading && !error && <>
        <div className="stats-grid">
          <StatCard label="Проведено уроков" value={String(lessons.length)} note="Статус: проведено" icon={<Target size={21} />} />
          <StatCard label="Учебных часов" value={formatHours(teachingMinutes)} note="Только проведённые уроки" icon={<Clock3 size={21} />} tone="blue" />
          <StatCard label="Доход" value={`${income.toLocaleString("ru-RU")} ₽`} note={otherCharges > 0 ? `${completedLessonIncome.toLocaleString("ru-RU")} ₽ за уроки · ${otherCharges.toLocaleString("ru-RU")} ₽ прочие начисления` : "По реальным начислениям в финансах"} icon={<WalletCards size={21} />} tone="green" />
          <StatCard label="Средняя стоимость" value={`${averagePrice.toLocaleString("ru-RU")} ₽`} note="За проведённый урок" icon={<TrendingUp size={21} />} tone="purple" />
        </div>
        <div className="statistics-grid">
          <Card className="activity-card"><div className="card-toolbar"><div><h2>Учебная активность</h2><p>Проведённые часы по {periodType === "month" ? "неделям" : "месяцам"}</p></div><Badge tone="green"><TrendingUp size={14} /> {formatHours(teachingMinutes)}</Badge></div><div className="statistics-real-bars">{activity.map((item) => <div key={item.label}><div><span style={{ height: `${Math.max(2, item.minutes / maxActivity * 100)}%` }} /></div><small>{item.label}</small><strong>{formatHours(item.minutes)}</strong></div>)}</div></Card>
          <Card className="subjects-card"><div className="card-toolbar"><div><h2>Итоги периода</h2><p>Уроки — по статусу, доход — по финансовому журналу</p></div></div><div className="statistics-summary-list"><div><WalletCards size={18} /><span>Доход по начислениям</span><strong>{income.toLocaleString("ru-RU")} ₽</strong></div><div><CalendarRange size={18} /><span>Проведённых уроков</span><strong>{lessons.length}</strong></div><div><Users size={18} /><span>Учеников и групп</span><strong>{participants}</strong></div><div><Target size={18} /><span>Средний доход за проведённый урок</span><strong>{averagePrice.toLocaleString("ru-RU")} ₽</strong></div></div></Card>
        </div>
        {lessons.length === 0 && <Card><div className="students-empty-state"><CalendarRange size={30} /><h2>За выбранный период проведённых уроков нет</h2><p>Статистика появится после перевода занятия в статус «Проведено».</p></div></Card>}
      </>}
    </div>
  );
}

function getRange(type: PeriodType, value: string) {
  if (type === "year") return { from: `${value}-01-01`, to: `${Number(value) + 1}-01-01` };
  const [year, month] = value.split("-").map(Number);
  return { from: `${value}-01`, to: toDateKey(new Date(year, month, 1)) };
}

function durationMinutes(lesson: Lesson) {
  return Math.max(0, Math.round((new Date(lesson.endAt).getTime() - new Date(lesson.startAt).getTime()) / 60_000));
}

function buildActivity(lessons: Lesson[], from: string, to: string, type: PeriodType, timezone: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const buckets: { label: string; from: Date; to: Date; minutes: number }[] = [];
  let cursor = new Date(start);
  while (cursor < end) {
    const next = type === "year" ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) : new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    buckets.push({ label: type === "year" ? new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(cursor).replace(".", "") : `${cursor.getDate()}`, from: new Date(cursor), to: next < end ? next : end, minutes: 0 });
    cursor = next;
  }
  lessons.forEach((lesson) => {
    const parts = getZonedParts(new Date(lesson.startAt), timezone);
    const date = new Date(parts.year, parts.month - 1, parts.day);
    const bucket = buckets.find((item) => date >= item.from && date < item.to);
    if (bucket) bucket.minutes += durationMinutes(lesson);
  });
  return buckets;
}

function formatHours(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} ч`;
}

function toMonthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function toDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getErrorMessage(error: unknown) { if (error instanceof Error) return error.message; if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message; return "Неизвестная ошибка Supabase"; }
