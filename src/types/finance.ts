export type FinanceTransactionType = "payment" | "lesson_charge" | "expense" | "adjustment" | "refund";
export type FinanceTransactionStatus = "posted" | "pending" | "void";

export type FinanceTransaction = {
  id: string;
  studentId: string | null;
  groupId: string | null;
  lessonId: string | null;
  type: FinanceTransactionType;
  category: string | null;
  amount: number;
  transactionDate: string;
  status: FinanceTransactionStatus;
  paymentMethod: string | null;
  description: string | null;
  createdAt: string;
};

export type CreatePaymentInput = {
  studentId: string;
  amount: number;
  date: string;
  paymentMethod?: string | null;
  description?: string | null;
};

export type CreateExpenseInput = {
  category: string;
  amount: number;
  date: string;
  description?: string | null;
};

export type StudentFinanceSummary = {
  balance: number;
  unpaidAmount: number;
  transactions: FinanceTransaction[];
};
