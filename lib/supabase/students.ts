import type {
  ParentContact,
  Student,
  StudentDraft,
  StudentStatus,
} from "../../src/components/students/student-types";
import { createClient } from "./client";

const studentColumns = "id,first_name,last_name,phone,email,date_of_birth,address,lesson_price,lesson_duration,notes,status" as const;
const studentWithParentsColumns = "id,first_name,last_name,phone,email,date_of_birth,address,lesson_price,lesson_duration,notes,status,parent_students(parent:parents(id,first_name,last_name,phone,email))" as const;

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

type ParentRow = {
  id: string;
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
  const [{ data, error }, balances] = await Promise.all([
    supabase.from("students").select(studentColumns).is("deleted_at", null).order("created_at", { ascending: false }),
    getStudentBalances(),
  ]);

  if (error) throw error;
  return (data as StudentRow[]).map((row) => ({ ...toStudent(row), balance: balances.get(row.id) ?? 0 }));
}

export async function getStudent(studentId: string): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentWithParentsColumns)
    .eq("id", studentId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  const row = data as unknown as StudentWithParentsRow;
  const parents = row.parent_students.map((relation) => toParent(relation.parent));
  return { ...toStudent(row, parents), balance: await getStudentBalance(studentId) };
}

export async function createStudent(draft: StudentDraft): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("save_student_with_parent", toRpcPayload(null, draft));
  if (error) throw error;
  return getStudent(String(data));
}

export async function updateStudent(
  studentId: string,
  draft: StudentDraft,
): Promise<Student> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("save_student_with_parent", toRpcPayload(studentId, draft));
  if (error) throw error;
  return getStudent(String(data));
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
    .is("deleted_at", null)
    .select(studentColumns)
    .single();

  if (error) throw error;
  const parents = await getParentsForStudent(studentId);
  return { ...toStudent(data as StudentRow, parents), balance: await getStudentBalance(studentId) };
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { data, error } = await createClient().rpc("soft_delete_student", { p_student_id: studentId });
  if (error) throw error;
  if (String(data) !== studentId) throw new Error("Supabase did not delete the student");
}

async function getStudentBalances(): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("finance_transactions").select("student_id,type,amount,status").not("student_id", "is", null);
  if (error) throw error;
  const balances = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.status !== "posted" || !row.student_id) continue;
    const amount = Number(row.amount);
    const signed = row.type === "payment" || row.type === "adjustment" ? amount : row.type === "lesson_charge" || row.type === "refund" ? -amount : 0;
    balances.set(row.student_id, (balances.get(row.student_id) ?? 0) + signed);
  }
  return balances;
}

async function getStudentBalance(studentId: string): Promise<number> {
  return (await getStudentBalances()).get(studentId) ?? 0;
}

function toRpcPayload(studentId: string | null, draft: StudentDraft) {
  return {
    p_student_id: studentId,
    p_first_name: draft.firstName?.trim() ?? "",
    p_last_name: draft.lastName?.trim() ?? "",
    p_phone: emptyToNull(draft.phone),
    p_email: emptyToNull(draft.email),
    p_date_of_birth: emptyToNull(draft.dateOfBirth),
    p_address: emptyToNull(draft.address),
    p_lesson_price: draft.lessonPrice,
    p_lesson_duration: draft.lessonDuration,
    p_notes: emptyToNull(draft.notes),
    p_parent_first_name: emptyToNull(draft.parentFirstName),
    p_parent_last_name: emptyToNull(draft.parentLastName),
    p_parent_phone: emptyToNull(draft.parentPhone),
    p_parent_email: emptyToNull(draft.parentEmail),
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
    .eq("student_id", studentId);

  if (error) throw error;
  return (data as unknown as ParentRelationRow[]).map((relation) => toParent(relation.parent));
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
