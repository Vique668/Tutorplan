import type { CreateLessonSeriesInput, LessonSeries } from "../../src/types/lesson-series";
import { createClient } from "./client";
import { CURRENT_TUTOR_ID } from "./students";

const lessonSeriesColumns = "id,tutor_id,student_id,weekday,start_time,end_time,duration,price,start_date,end_date,is_active,created_at" as const;

type LessonSeriesRow = {
  id: string;
  tutor_id: string;
  student_id: string;
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
    .eq("tutor_id", CURRENT_TUTOR_ID)
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
      tutor_id: CURRENT_TUTOR_ID,
      student_id: input.studentId,
      group_id: null,
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
      student_id: input.studentId,
      group_id: null,
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
    .eq("tutor_id", CURRENT_TUTOR_ID)
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
    .eq("tutor_id", CURRENT_TUTOR_ID)
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

export async function deleteLessonSeries(seriesId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("lesson_series")
    .delete()
    .eq("id", seriesId)
    .eq("tutor_id", CURRENT_TUTOR_ID);

  if (error) throw error;
}

function toLessonSeries(row: LessonSeriesRow): LessonSeries {
  const startTime = row.start_time.slice(0, 5);
  const endTime = row.end_time?.slice(0, 5) ?? null;
  return {
    id: row.id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
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
