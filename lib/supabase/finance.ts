import type { CreateExpenseInput, CreatePaymentInput, FinanceTransaction, FinanceTransactionStatus, FinanceTransactionType, StudentFinanceSummary } from "../../src/types/finance";
import { createClient } from "./client";

const columns = "id,student_id,group_id,lesson_id,type,category,amount,transaction_date,status,payment_method,description,created_at" as const;

type FinanceRow = {
  id: string;
  student_id: string | null;
  group_id: string | null;
  lesson_id: string | null;
  type: FinanceTransactionType;
  category: string | null;
  amount: number | string;
  transaction_date: string;
  status: FinanceTransactionStatus;
  payment_method: string | null;
  description: string | null;
  created_at: string;
};

export type ManualFinanceTransactionInput = {
  kind: "payment" | "expense";
  studentId: string | null;
  amount: number;
  date: string;
  paymentMethod: string | null;
  category: string | null;
  description: string | null;
};

export async function getFinanceTransactions(fromDate?: string, toDate?: string): Promise<FinanceTransaction[]> {
  const supabase = createClient();
  let query = supabase.from("finance_transactions").select(columns).order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (fromDate) query = query.gte("transaction_date", fromDate);
  if (toDate) query = query.lt("transaction_date", toDate);
  const { data, error } = await query;
  if (error) throw error;
  return (data as FinanceRow[]).map(toTransaction);
}

export async function createPayment(input: CreatePaymentInput): Promise<FinanceTransaction> {
  return insertTransaction({
    student_id: input.studentId,
    group_id: null,
    lesson_id: null,
    type: "payment",
    category: "Оплата ученика",
    amount: input.amount,
    transaction_date: input.date,
    status: "posted",
    payment_method: emptyToNull(input.paymentMethod),
    description: emptyToNull(input.description),
  });
}

export async function createExpense(input: CreateExpenseInput): Promise<FinanceTransaction> {
  return insertTransaction({
    student_id: null,
    group_id: null,
    lesson_id: null,
    type: "expense",
    category: input.category.trim(),
    amount: input.amount,
    transaction_date: input.date,
    status: "posted",
    payment_method: null,
    description: emptyToNull(input.description),
  });
}

export async function updateFinanceTransaction(transactionId: string, input: ManualFinanceTransactionInput): Promise<FinanceTransaction> {
  const { data, error } = await createClient()
    .from("finance_transactions")
    .update(toManualPayload(input))
    .eq("id", transactionId)
    .is("lesson_id", null)
    .in("type", ["payment", "expense"])
    .select(columns)
    .single();
  if (error) throw error;
  return toTransaction(data as FinanceRow);
}

export async function deleteFinanceTransaction(transactionId: string): Promise<void> {
  const { data, error } = await createClient()
    .from("finance_transactions")
    .delete()
    .eq("id", transactionId)
    .is("lesson_id", null)
    .in("type", ["payment", "expense"])
    .select("id")
    .single();
  if (error) throw error;
  if (data.id !== transactionId) throw new Error("Supabase did not delete the finance transaction");
}

export async function getStudentFinance(studentId: string): Promise<StudentFinanceSummary> {
  const supabase = createClient();
  const { data, error } = await supabase.from("finance_transactions").select(columns).eq("student_id", studentId).order("transaction_date", { ascending: false });
  if (error) throw error;
  const transactions = (data as FinanceRow[]).map(toTransaction);
  const balance = transactions.filter((item) => item.status === "posted").reduce((sum, item) => sum + signedStudentAmount(item), 0);
  return { balance, unpaidAmount: Math.max(0, -balance), transactions };
}

export async function getIncomeGoal(): Promise<number | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tutor_settings").select("monthly_income_goal").maybeSingle();
  if (error) throw error;
  return data?.monthly_income_goal === null || data?.monthly_income_goal === undefined ? null : Number(data.monthly_income_goal);
}

export async function updateIncomeGoal(value: number | null): Promise<void> {
  const supabase = createClient();
  const { data: settings, error: loadError } = await supabase.from("tutor_settings").select("tutor_id").single();
  if (loadError) throw loadError;
  const { error } = await supabase.from("tutor_settings").update({ monthly_income_goal: value }).eq("tutor_id", settings.tutor_id);
  if (error) throw error;
}

async function insertTransaction(payload: Record<string, unknown>): Promise<FinanceTransaction> {
  const supabase = createClient();
  const { data, error } = await supabase.from("finance_transactions").insert(payload).select(columns).single();
  if (error) throw error;
  return toTransaction(data as FinanceRow);
}

function toManualPayload(input: ManualFinanceTransactionInput) {
  return {
    student_id: input.kind === "payment" ? input.studentId : null,
    group_id: null,
    lesson_id: null,
    type: input.kind,
    category: input.kind === "payment" ? "Оплата ученика" : emptyToNull(input.category),
    amount: input.amount,
    transaction_date: input.date,
    status: "posted" as const,
    payment_method: input.kind === "payment" ? emptyToNull(input.paymentMethod) : null,
    description: emptyToNull(input.description),
  };
}

export function signedStudentAmount(transaction: FinanceTransaction): number {
  if (transaction.type === "payment" || transaction.type === "adjustment") return transaction.amount;
  if (transaction.type === "lesson_charge" || transaction.type === "refund") return -transaction.amount;
  return 0;
}

function toTransaction(row: FinanceRow): FinanceTransaction {
  return {
    id: row.id,
    studentId: row.student_id,
    groupId: row.group_id,
    lessonId: row.lesson_id,
    type: row.type,
    category: row.category,
    amount: Number(row.amount),
    transactionDate: row.transaction_date,
    status: row.status,
    paymentMethod: row.payment_method,
    description: row.description,
    createdAt: row.created_at,
  };
}

function emptyToNull(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}
