import type { CreateLessonSeriesInput, LessonSeries } from "../../src/types/lesson-series";
import { createClient } from "./client";

const lessonSeriesColumns = "id,tutor_id,student_id,group_id,weekday,start_time,end_time,duration,price,start_date,end_date,is_active,created_at" as const;

type LessonSeriesRow = {
  id: string;
  tutor_id: string;
  student_id: string | null;
  group_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string | null;
  duration: number;
  price: number | string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export async function getLessonSeries(): Promise<LessonSeries[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_series")
    .select(lessonSeriesColumns)
    .is("deleted_at", null)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data as LessonSeriesRow[]).map(toLessonSeries);
}

export async function createLessonSeries(input: CreateLessonSeriesInput): Promise<LessonSeries> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_series")
    .insert({
      student_id: input.targetType === "student" ? input.studentId : null,
      group_id: input.targetType === "group" ? input.groupId : null,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      duration: calculateDuration(input.startTime, input.endTime),
      price: input.price,
      start_date: input.startDate,
      end_date: input.endDate || null,
      is_active: input.isActive,
    })
    .select(lessonSeriesColumns)
    .single();

  if (error) throw error;
  return toLessonSeries(data as LessonSeriesRow);
}

export async function updateLessonSeries(seriesId: string, input: CreateLessonSeriesInput): Promise<LessonSeries> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_series")
    .update({
      student_id: input.targetType === "student" ? input.studentId : null,
      group_id: input.targetType === "group" ? input.groupId : null,
      weekday: input.weekday,
      start_time: input.startTime,
      end_time: input.endTime,
      duration: calculateDuration(input.startTime, input.endTime),
      price: input.price,
      start_date: input.startDate,
      end_date: input.endDate || null,
      is_active: input.isActive,
    })
    .eq("id", seriesId)
    .select(lessonSeriesColumns)
    .single();

  if (error) throw error;
  return toLessonSeries(data as LessonSeriesRow);
}

export async function setLessonSeriesActive(seriesId: string, isActive: boolean): Promise<LessonSeries> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_series")
    .update({ is_active: isActive })
    .eq("id", seriesId)
    .select(lessonSeriesColumns)
    .single();

  if (error) throw error;
  return toLessonSeries(data as LessonSeriesRow);
}

export async function syncLessonSeriesFuture(seriesId: string, fromDate: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("sync_lesson_series_future", {
    p_series_id: seriesId,
    p_from_date: fromDate,
  });

  if (error) throw error;
}

export async function ensureLessonSeriesRange(fromDate: string, toDate: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("generate_active_lesson_series_range", {
    p_from_date: fromDate,
    p_to_date: toDate,
  });
  if (error) throw error;
}

export async function deleteLessonSeries(seriesId: string): Promise<void> {
  const { data, error } = await createClient().rpc("delete_lesson_series", { p_series_id: seriesId });
  if (error) throw error;
  if (typeof data !== "number") throw new Error("Supabase did not delete the schedule template");
}

function toLessonSeries(row: LessonSeriesRow): LessonSeries {
  const startTime = row.start_time.slice(0, 5);
  const endTime = row.end_time?.slice(0, 5) ?? null;
  return {
    id: row.id,
    tutorId: row.tutor_id,
    targetType: row.group_id ? "group" : "student",
    studentId: row.student_id,
    groupId: row.group_id,
    weekday: row.weekday,
    startTime,
    endTime,
    duration: endTime ? calculateDuration(startTime, endTime) : row.duration,
    price: Number(row.price),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function calculateDuration(startTime: string, endTime: string): number {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
