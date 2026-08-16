import type {
  LessonAbsenceReason,
  LessonAttendance,
  LessonAttendanceInput,
} from "../../src/types/lesson-attendance";
import { createClient } from "./client";

const attendanceColumns = "id,lesson_id,student_id,attended,price,absence_reason,absence_fee,created_at,updated_at" as const;

type AttendanceRow = {
  id: string;
  lesson_id: string;
  student_id: string;
  attended: boolean;
  price: number | string;
  absence_reason: LessonAbsenceReason | null;
  absence_fee: number | string;
  created_at: string;
  updated_at: string;
};

export async function getLessonAttendance(lessonId: string): Promise<LessonAttendance[]> {
  const { data, error } = await createClient()
    .from("lesson_attendance")
    .select(attendanceColumns)
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

export async function saveLessonAttendance(
  lessonId: string,
  entries: LessonAttendanceInput[],
): Promise<LessonAttendance[]> {
  const { data, error } = await createClient().rpc("save_group_lesson_attendance", {
    p_lesson_id: lessonId,
    p_entries: entries.map((entry) => ({
      student_id: entry.studentId,
      attended: entry.attended,
      price: entry.price,
      absence_reason: entry.absenceReason,
      absence_fee: entry.absenceFee,
    })),
  });

  if (error) throw error;
  return (data as AttendanceRow[]).map(toAttendance);
}

function toAttendance(row: AttendanceRow): LessonAttendance {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    studentId: row.student_id,
    attended: row.attended,
    price: Number(row.price),
    absenceReason: row.absence_reason,
    absenceFee: Number(row.absence_fee),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

