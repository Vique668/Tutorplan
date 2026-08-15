import type {
  ParentContact,
  Student,
  StudentDraft,
  StudentStatus,
} from "../../src/components/students/student-types";
import { createClient } from "./client";

// Temporary tenant until authentication provides the current tutor.
// Replace this value with the id of an existing row in public.tutors.
export const CURRENT_TUTOR_ID = "49a7b6ac-1767-4561-9348-13f5de3c5b9f";

const studentColumns = "id,first_name,last_name,phone,email,date_of_birth,address,lesson_price,lesson_duration,notes,status" as const;
const studentWithParentsColumns = "id,first_name,last_name,phone,email,date_of_birth,address,lesson_price,lesson_duration,notes,status,parent_students(parent:parents(id,first_name,last_name,phone,email))" as const;
const parentColumns = "id,first_name,last_name,phone,email" as const;

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  lesson_price: number | string;
  lesson_duration: number;
  notes: string | null;
  status: StudentStatus;
};

type StudentPayload = {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  address: string | null;
  lesson_price: number;
  lesson_duration: number;
  notes: string | null;
};

type ParentRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type ParentPayload = {
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type ParentRelationRow = {
  parent: ParentRow;
};

type StudentWithParentsRow = StudentRow & {
  parent_students: ParentRelationRow[];
};

export async function getStudents(): Promise<Student[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as StudentRow[]).map((row) => toStudent(row));
}

export async function getStudent(studentId: string): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentWithParentsColumns)
    .eq("id", studentId)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .single();

  if (error) throw error;
  const row = data as unknown as StudentWithParentsRow;
  const parents = row.parent_students.map((relation) => toParent(relation.parent));
  return toStudent(row, parents);
}

export async function createStudent(draft: StudentDraft): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      tutor_id: CURRENT_TUTOR_ID,
      ...toPayload(draft),
      status: "active" satisfies StudentStatus,
    })
    .select(studentColumns)
    .single();

  if (error) throw error;
  const student = toStudent(data as StudentRow);
  const parent = await createParentRelation(student.id, draft);
  return { ...student, parents: parent ? [parent] : [] };
}

export async function updateStudent(
  studentId: string,
  draft: StudentDraft,
): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .update(toPayload(draft))
    .eq("id", studentId)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .select(studentColumns)
    .single();

  if (error) throw error;
  const student = toStudent(data as StudentRow);
  const parents = await syncParentRelation(student.id, draft);
  return { ...student, parents };
}

export async function archiveStudent(
  studentId: string,
  status: StudentStatus = "archived",
): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", studentId)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .select(studentColumns)
    .single();

  if (error) throw error;
  const parents = await getParentsForStudent(studentId);
  return toStudent(data as StudentRow, parents);
}

function toPayload(draft: StudentDraft): StudentPayload {
  return {
    first_name: draft.firstName?.trim() ?? "",
    last_name: draft.lastName?.trim() ?? "",
    phone: emptyToNull(draft.phone),
    email: emptyToNull(draft.email),
    date_of_birth: emptyToNull(draft.dateOfBirth),
    address: emptyToNull(draft.address),
    lesson_price: draft.lessonPrice,
    lesson_duration: draft.lessonDuration,
    notes: emptyToNull(draft.notes),
  };
}

function toStudent(row: StudentRow, parents: ParentContact[] = []): Student {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    dateOfBirth: row.date_of_birth,
    address: row.address,
    lessonPrice: Number(row.lesson_price),
    lessonDuration: row.lesson_duration,
    notes: row.notes ?? "",
    balance: 0,
    status: row.status,
    upcomingLessons: [],
    parents,
  };
}

async function getParentsForStudent(studentId: string): Promise<ParentContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parent_students")
    .select("parent:parents!inner(id,first_name,last_name,phone,email)")
    .eq("student_id", studentId)
    .eq("parent.tutor_id", CURRENT_TUTOR_ID);

  if (error) throw error;
  return (data as unknown as ParentRelationRow[]).map((relation) => toParent(relation.parent));
}

async function createParentRelation(
  studentId: string,
  draft: StudentDraft,
): Promise<ParentContact | null> {
  if (!hasParentInformation(draft)) return null;

  const supabase = createClient();
  const { data: parent, error: parentError } = await supabase
    .from("parents")
    .insert({ tutor_id: CURRENT_TUTOR_ID, ...toParentPayload(draft) })
    .select(parentColumns)
    .single();

  if (parentError) throw parentError;

  const parentRow = parent as ParentRow;
  const { error: relationError } = await supabase
    .from("parent_students")
    .insert({ parent_id: parentRow.id, student_id: studentId });

  if (relationError) throw relationError;
  return toParent(parentRow);
}

async function syncParentRelation(
  studentId: string,
  draft: StudentDraft,
): Promise<ParentContact[]> {
  const existingParents = await getParentsForStudent(studentId);
  if (!hasParentInformation(draft)) return existingParents;
  if (!existingParents.length) {
    const parent = await createParentRelation(studentId, draft);
    return parent ? [parent] : [];
  }

  const [primaryParent, ...otherParents] = existingParents;

  const supabase = createClient();
  const { data: parent, error } = await supabase
    .from("parents")
    .update(toParentPayload(draft))
    .eq("id", primaryParent.id)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .select(parentColumns)
    .single();

  if (error) throw error;
  return [toParent(parent as ParentRow), ...otherParents];
}

function hasParentInformation(draft: StudentDraft): boolean {
  return [
    draft.parentFirstName,
    draft.parentLastName,
    draft.parentPhone,
    draft.parentEmail,
  ].some((value) => (value?.trim() ?? "") !== "");
}

function toParentPayload(draft: StudentDraft): ParentPayload {
  return {
    first_name: draft.parentFirstName?.trim() ?? "",
    last_name: emptyToNull(draft.parentLastName),
    phone: emptyToNull(draft.parentPhone),
    email: emptyToNull(draft.parentEmail),
  };
}

function toParent(row: ParentRow): ParentContact {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
  };
}

function emptyToNull(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}
