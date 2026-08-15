import type { GroupDraft, GroupLesson, GroupStatus, StudentGroup } from "../../src/components/groups/group-types";
import { createClient } from "./client";

const groupColumns = "id,name,subject,lesson_price,lesson_duration,notes,status,created_at,group_students(student_id)" as const;

type GroupRow = {
  id: string;
  name: string;
  subject: string | null;
  lesson_price: number | string;
  lesson_duration: number;
  notes: string | null;
  status: GroupStatus;
  created_at: string;
  group_students: { student_id: string }[];
};

export async function getGroups(): Promise<StudentGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("groups").select(groupColumns).order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data as unknown as GroupRow[];
  const groupLessons = await Promise.all(rows.map((row) => getGroupLessonSummary(row.id)));
  return rows.map((row, index) => toGroup(row, groupLessons[index].upcoming, groupLessons[index].historyCount));
}

export async function createGroup(draft: GroupDraft): Promise<StudentGroup> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("save_group_with_members", toRpcPayload(null, draft));
  if (error) throw error;
  return getGroup(String(data));
}

export async function updateGroup(groupId: string, draft: GroupDraft): Promise<StudentGroup> {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_group_with_members", toRpcPayload(groupId, draft));
  if (error) throw error;
  return getGroup(groupId);
}

export async function setGroupStatus(groupId: string, status: GroupStatus): Promise<StudentGroup> {
  const supabase = createClient();
  const { data, error } = await supabase.from("groups").update({ status }).eq("id", groupId).select(groupColumns).single();
  if (error) throw error;
  const lessons = await getGroupLessonSummary(groupId);
  return toGroup(data as unknown as GroupRow, lessons.upcoming, lessons.historyCount);
}

export async function deleteGroup(groupId: string): Promise<void> {
  const supabase = createClient();
  const [{ count: lessonCount, error: lessonError }, { count: seriesCount, error: seriesError }] = await Promise.all([
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("group_id", groupId),
    supabase.from("lesson_series").select("id", { count: "exact", head: true }).eq("group_id", groupId),
  ]);
  if (lessonError) throw lessonError;
  if (seriesError) throw seriesError;
  if ((lessonCount ?? 0) > 0 || (seriesCount ?? 0) > 0) {
    throw new Error("Группу с расписанием или историей занятий нельзя удалить. Архивируйте её.");
  }
  const { data, error } = await supabase.from("groups").delete().eq("id", groupId).select("id").single();
  if (error) throw error;
  if (data.id !== groupId) throw new Error("Supabase did not delete the group");
}

async function getGroup(groupId: string): Promise<StudentGroup> {
  const supabase = createClient();
  const { data, error } = await supabase.from("groups").select(groupColumns).eq("id", groupId).single();
  if (error) throw error;
  const lessons = await getGroupLessonSummary(groupId);
  return toGroup(data as unknown as GroupRow, lessons.upcoming, lessons.historyCount);
}

async function getGroupLessonSummary(groupId: string): Promise<{ upcoming: GroupLesson[]; historyCount: number }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    supabase.from("lessons").select("id,start_at,end_at").eq("group_id", groupId).gte("end_at", now).neq("status", "cancelled").order("start_at", { ascending: true }).limit(5),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("group_id", groupId).lt("end_at", now),
  ]);
  if (error) throw error;
  if (countError) throw countError;
  const upcoming = (data ?? []).map((lesson) => ({
    id: lesson.id,
    date: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(lesson.start_at)),
    time: `${formatTime(lesson.start_at)}–${formatTime(lesson.end_at)}`,
  }));
  return { upcoming, historyCount: count ?? 0 };
}

function toRpcPayload(groupId: string | null, draft: GroupDraft) {
  return {
    p_group_id: groupId,
    p_name: draft.name?.trim() ?? "",
    p_subject: emptyToNull(draft.subject),
    p_lesson_price: draft.lessonPrice,
    p_lesson_duration: draft.lessonDuration,
    p_notes: emptyToNull(draft.notes),
    p_student_ids: draft.studentIds,
  };
}

function toGroup(row: GroupRow, upcomingLessons: GroupLesson[], lessonHistoryCount: number): StudentGroup {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    studentIds: row.group_students?.map((relation) => relation.student_id) ?? [],
    lessonPrice: Number(row.lesson_price),
    lessonDuration: row.lesson_duration,
    notes: row.notes ?? "",
    status: row.status,
    upcomingLessons,
    lessonHistoryCount,
    createdAt: row.created_at,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function emptyToNull(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}
