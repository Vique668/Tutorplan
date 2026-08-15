import type {
  CreateLessonInput,
  Lesson,
  LessonStatus,
  UpdateLessonInput,
} from "../../src/types/lesson";
import { createClient } from "./client";

const lessonColumns = "id,tutor_id,student_id,group_id,lesson_series_id,series_occurrence_date,start_at,end_at,price,status,notes,created_at" as const;

type LessonRow = {
  id: string;
  tutor_id: string;
  student_id: string | null;
  group_id: string | null;
  lesson_series_id: string | null;
  series_occurrence_date: string | null;
  start_at: string;
  end_at: string;
  price: number | string;
  status: LessonStatus;
  notes: string | null;
  created_at: string;
};

type LessonUpdatePayload = {
  student_id?: string | null;
  group_id?: string | null;
  lesson_series_id?: string | null;
  start_at?: string;
  end_at?: string;
  price?: number;
  status?: LessonStatus;
  notes?: string | null;
};

export async function getLessons(fromDate?: string, toDate?: string): Promise<Lesson[]> {
  const supabase = createClient();
  let query = supabase
    .from("lessons")
    .select(lessonColumns)
    .order("start_at", { ascending: true });
  if (fromDate) query = query.gte("start_at", normalizeBoundary(fromDate));
  if (toDate) query = query.lt("start_at", normalizeBoundary(toDate));
  const { data, error } = await query;

  if (error) throw error;
  return (data as LessonRow[]).map(toLesson);
}

export async function getCompletedLessons(fromDate?: string, toDate?: string): Promise<Lesson[]> {
  const supabase = createClient();
  let query = supabase
    .from("lessons")
    .select(lessonColumns)
    .eq("status", "completed")
    .order("start_at", { ascending: true });
  if (fromDate) query = query.gte("start_at", normalizeBoundary(fromDate));
  if (toDate) query = query.lt("start_at", normalizeBoundary(toDate));
  const { data, error } = await query;

  if (error) throw error;
  return (data as LessonRow[]).map(toLesson);
}

export async function getStudentLessons(studentId: string): Promise<Lesson[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select(lessonColumns)
    .eq("student_id", studentId)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data as LessonRow[]).map(toLesson);
}

export async function createLesson(input: CreateLessonInput): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      student_id: input.studentId ?? null,
      group_id: input.groupId ?? null,
      lesson_series_id: input.lessonSeriesId ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      price: input.price,
      status: input.status ?? "scheduled",
      notes: emptyToNull(input.notes),
    })
    .select(lessonColumns)
    .single();

  if (error) throw error;
  return toLesson(data as LessonRow);
}

export async function updateLesson(
  lessonId: string,
  input: UpdateLessonInput,
): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .update(toUpdatePayload(input))
    .eq("id", lessonId)
    .select(lessonColumns)
    .single();

  if (error) throw error;
  return toLesson(data as LessonRow);
}

export async function cancelLesson(lessonId: string): Promise<Lesson> {
  return updateLesson(lessonId, { status: "cancelled" });
}

export async function restoreLesson(lessonId: string): Promise<Lesson> {
  return updateLesson(lessonId, { status: "scheduled" });
}

export async function markLessonNoShow(lessonId: string, charge: boolean): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mark_lesson_no_show", { p_lesson_id: lessonId, p_charge: charge });
  if (error) throw error;
  return toLesson(data as LessonRow);
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .select("id")
    .single();

  if (error) throw error;
  if (data.id !== lessonId) throw new Error("Supabase did not delete the lesson");
}

function toUpdatePayload(input: UpdateLessonInput): LessonUpdatePayload {
  const payload: LessonUpdatePayload = {};

  if ("studentId" in input) payload.student_id = input.studentId ?? null;
  if ("groupId" in input) payload.group_id = input.groupId ?? null;
  if ("lessonSeriesId" in input) payload.lesson_series_id = input.lessonSeriesId ?? null;
  if (input.startAt !== undefined) payload.start_at = input.startAt;
  if (input.endAt !== undefined) payload.end_at = input.endAt;
  if (input.price !== undefined) payload.price = input.price;
  if (input.status !== undefined) payload.status = input.status;
  if ("notes" in input) payload.notes = emptyToNull(input.notes);

  return payload;
}

function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    groupId: row.group_id,
    lessonSeriesId: row.lesson_series_id,
    seriesOccurrenceDate: row.series_occurrence_date,
    startAt: row.start_at,
    endAt: row.end_at,
    price: Number(row.price),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function emptyToNull(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeBoundary(value: string): string {
  return value.includes("T") ? value : `${value}T00:00:00Z`;
}
