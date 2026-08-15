"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CircleAlert, CircleDollarSign, Download, LoaderCircle, Pencil, Plus, ReceiptText, Trash2, WalletCards, X } from "lucide-react";
import type { Student } from "@/components/students/student-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import type { FinanceTransaction } from "@/types/finance";
import type { Lesson } from "@/types/lesson";
import { createExpense, createPayment, deleteFinanceTransaction, getFinanceTransactions, getIncomeGoal, signedStudentAmount, updateFinanceTransaction, updateIncomeGoal } from "../../../lib/supabase/finance";
import { getCompletedLessons } from "../../../lib/supabase/lessons";
import { getStudents } from "../../../lib/supabase/students";

type OperationDraft = { kind: "payment" | "expense"; studentId: string; amount: number; date: string; paymentMethod: string; category: string; description: string };
type Filter = "all" | "income" | "expense" | "charge";
const expenseCategories = ["Сервисы", "Материалы", "Реклама", "Аренда", "Налоги", "Другое"];

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [period, setPeriod] = useState(() => toMonthKey(new Date()));
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedTransactions, loadedStudents, loadedGoal, loadedLessons] = await Promise.all([getFinanceTransactions(), getStudents(), getIncomeGoal(), getCompletedLessons()]);
      setTransactions(loadedTransactions);
      setStudents(loadedStudents);
      setGoal(loadedGoal);
      setCompletedLessons(loadedLessons);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadFinance(); }, [loadFinance]);

  const range = useMemo(() => monthRange(period), [period]);
  const monthTransactions = transactions.filter((item) => item.transactionDate >= range.from && item.transactionDate < range.to && item.status === "posted");
  const monthCompletedLessons = completedLessons.filter((lesson) => toMonthKey(new Date(lesson.startAt)) === period);
  const income = monthCompletedLessons.reduce((total, lesson) => total + lesson.price, 0);
  const expenses = sum(monthTransactions.filter((item) => item.type === "expense"), "amount");
  const debtByStudent = new Map<string, number>();
  transactions.filter((item) => item.studentId && item.status === "posted").forEach((item) => debtByStudent.set(item.studentId!, (debtByStudent.get(item.studentId!) ?? 0) + signedStudentAmount(item)));
  const expected = [...debtByStudent.values()].reduce((total, balance) => total + Math.max(0, -balance), 0);
  const chart = getMonthlyLessonChart(completedLessons, period);
  const chartMax = Math.max(...chart.map((item) => item.value), 1);
  const filtered = monthTransactions.filter((item) => filter === "all" || (filter === "income" && item.type === "payment") || (filter === "expense" && item.type === "expense") || (filter === "charge" && item.type === "lesson_charge"));

  async function saveOperation(draft: OperationDraft) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const saved = editingTransaction
        ? await updateFinanceTransaction(editingTransaction.id, {
          kind: draft.kind,
          studentId: draft.kind === "payment" ? draft.studentId : null,
          amount: draft.amount,
          date: draft.date,
          paymentMethod: draft.kind === "payment" ? draft.paymentMethod : null,
          category: draft.kind === "expense" ? draft.category : null,
          description: draft.description,
        })
        : draft.kind === "payment"
          ? await createPayment({ studentId: draft.studentId, amount: draft.amount, date: draft.date, paymentMethod: draft.paymentMethod, description: draft.description })
          : await createExpense({ category: draft.category, amount: draft.amount, date: draft.date, description: draft.description });
      setTransactions((current) => editingTransaction
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setModalOpen(false);
      setEditingTransaction(null);
    } catch (saveError) {
      setSubmitError(getErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeOperation(transaction: FinanceTransaction) {
    if (!isManualTransaction(transaction) || !window.confirm("Удалить эту финансовую операцию?")) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await deleteFinanceTransaction(transaction.id);
      setTransactions((current) => current.filter((item) => item.id !== transaction.id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeGoal() {
    const value = window.prompt("Цель дохода на месяц, ₽", goal?.toString() ?? "");
    if (value === null) return;
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 0)) return setError("Цель должна быть целым неотрицательным числом.");
    try { await updateIncomeGoal(parsed); setGoal(parsed); } catch (goalError) { setError(getErrorMessage(goalError)); }
  }

  function downloadReport() {
    const rows = [["Дата", "Тип", "Ученик/категория", "Описание", "Сумма"], ...filtered.map((item) => [item.transactionDate, transactionLabel(item.type), entityName(item, students), item.description ?? "", signedOperationAmount(item).toString()])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `tutorplan-finance-${period}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const goalPercent = goal && goal > 0 ? Math.min(100, Math.round(income / goal * 100)) : 0;
  return (
    <div className="page-stack">
      <PageHeader title="Финансы" description="Доходы, расходы и оплаты учеников" actions={<><input className="finance-period-input" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Финансовый период" /><Button variant="secondary" icon={<Download size={18} />} onClick={downloadReport}>Отчёт</Button><Button icon={<Plus size={18} />} onClick={() => { setEditingTransaction(null); setSubmitError(null); setModalOpen(true); }}>Добавить операцию</Button></>} />
      {isLoading && <Card><div className="students-empty-state"><LoaderCircle className="spin" size={28} /><h2>Загружаем финансы</h2></div></Card>}
      {error && <Card><div className="students-empty-state" role="alert"><CircleAlert size={28} /><h2>Не удалось загрузить данные</h2><p>{error}</p><Button variant="secondary" onClick={() => void loadFinance()}>Повторить</Button></div></Card>}
      {!isLoading && !error && <>
        <div className="stats-grid stats-grid-three">
          <StatCard label={`Доход · ${formatMonth(period)}`} value={formatMoney(income)} note={`${monthCompletedLessons.length} проведённых уроков`} icon={<ArrowDownLeft size={21} />} tone="green" />
          <StatCard label="Расходы" value={formatMoney(expenses)} note="Фактические операции" icon={<ArrowUpRight size={21} />} tone="orange" />
          <StatCard label="Ожидается / долг" value={formatMoney(expected)} note={`${[...debtByStudent.values()].filter((balance) => balance < 0).length} учеников с задолженностью`} icon={<WalletCards size={21} />} tone="purple" />
        </div>
        <div className="finance-grid">
          <Card className="chart-card">
            <div className="card-toolbar"><div><h2>Доход по проведённым урокам</h2><p>За последние 8 месяцев</p></div></div>
            <div className="income-summary"><strong>{formatMoney(chart.reduce((sumValue, item) => sumValue + item.value, 0))}</strong></div>
            <div className="bar-chart" aria-label="График полученных оплат">{chart.map((item) => <div className="bar-item" key={item.key}><div><span style={{ height: `${Math.max(3, item.value / chartMax * 100)}%` }} className={item.key === period ? "bar-current" : ""} /></div><small>{item.label}</small></div>)}</div>
          </Card>
          <Card className="goal-card"><div className="card-toolbar"><div><h2>Цель на месяц</h2><p>{formatMonth(period)}</p></div><span className="goal-icon"><CircleDollarSign size={21} /></span></div><div className="goal-ring" style={{ background: `conic-gradient(var(--orange) ${goalPercent}%, #f1eee9 0)` }}><div><strong>{goal ? `${goalPercent}%` : "—"}</strong><span>{goal ? "выполнено" : "не задана"}</span></div></div><div className="goal-values"><div><span>Получено</span><strong>{formatMoney(income)}</strong></div><div><span>Цель</span><strong>{goal === null ? "—" : formatMoney(goal)}</strong></div></div><Button variant="secondary" className="full-button" onClick={() => void changeGoal()}>Изменить цель</Button></Card>
        </div>
        <Card className="table-card">
          <div className="card-toolbar"><div><h2>Операции</h2><p>{formatMonth(period)}</p></div><select className="select-button" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="all">Все</option><option value="income">Оплаты</option><option value="charge">Начисления</option><option value="expense">Расходы</option></select></div>
          {filtered.length ? <div className="data-table finance-table"><div className="data-row data-head"><span>Дата</span><span>Ученик / категория</span><span>Назначение</span><span>Статус</span><span>Сумма</span></div>{filtered.map((item) => <div className="data-row" key={item.id}><span>{formatDate(item.transactionDate)}</span><div className="transaction-name"><span className={`transaction-icon ${item.type === "expense" ? "expense" : ""}`}><ReceiptText size={16} /></span><strong>{entityName(item, students)}</strong></div><span>{item.description || transactionLabel(item.type)}</span><span><Badge tone={item.status === "posted" ? "green" : "gray"}>{item.status === "posted" ? "Проведено" : item.status === "pending" ? "Ожидает" : "Отменено"}</Badge></span><div className="finance-row-value"><strong className={signedOperationAmount(item) >= 0 ? "balance-positive" : "balance-negative"}>{formatSignedMoney(signedOperationAmount(item))}</strong>{isManualTransaction(item) && <span className="finance-row-actions"><button type="button" aria-label="Редактировать операцию" onClick={() => { setEditingTransaction(item); setSubmitError(null); setModalOpen(true); }}><Pencil size={15} /></button><button type="button" aria-label="Удалить операцию" onClick={() => void removeOperation(item)} disabled={isSubmitting}><Trash2 size={15} /></button></span>}</div></div>)}</div> : <div className="students-empty-state"><ReceiptText size={28} /><h2>Операций за период нет</h2><p>Добавьте оплату или расход.</p></div>}
        </Card>
      </>}
      {modalOpen && <FinanceOperationModal transaction={editingTransaction} students={students.filter((student) => student.status === "active")} isSubmitting={isSubmitting} error={submitError} onClose={() => { if (!isSubmitting) { setModalOpen(false); setEditingTransaction(null); } }} onSave={saveOperation} />}
    </div>
  );
}

function FinanceOperationModal({ transaction, students, isSubmitting, error, onClose, onSave }: { transaction: FinanceTransaction | null; students: Student[]; isSubmitting: boolean; error: string | null; onClose: () => void; onSave: (draft: OperationDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<OperationDraft>(() => ({
    kind: transaction?.type === "expense" ? "expense" : "payment",
    studentId: transaction?.studentId ?? students[0]?.id ?? "",
    amount: transaction?.amount ?? 0,
    date: transaction?.transactionDate ?? toDateKey(new Date()),
    paymentMethod: transaction?.paymentMethod ?? "Перевод",
    category: transaction?.category ?? expenseCategories[0],
    description: transaction?.description ?? "",
  }));
  const [validationError, setValidationError] = useState<string | null>(null);
  const update = <K extends keyof OperationDraft>(key: K, value: OperationDraft[K]) => { setDraft((current) => ({ ...current, [key]: value })); setValidationError(null); };
  function submit(event: FormEvent) { event.preventDefault(); if (!Number.isInteger(draft.amount) || draft.amount <= 0) return setValidationError("Сумма должна быть целым положительным числом."); if (draft.kind === "payment" && !draft.studentId) return setValidationError("Выберите ученика."); void onSave(draft); }
  return <div className="lesson-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !isSubmitting && onClose()}><section className="lesson-modal" role="dialog" aria-modal="true" aria-labelledby="finance-modal-title"><div className="lesson-modal-header"><div><span>ФИНАНСОВЫЙ ЖУРНАЛ</span><h2 id="finance-modal-title">{transaction ? "Редактировать операцию" : "Добавить операцию"}</h2></div><button className="icon-button" onClick={onClose} disabled={isSubmitting} aria-label="Закрыть"><X size={20} /></button></div><div className="calendar-create-tabs"><button type="button" className={draft.kind === "payment" ? "active" : ""} onClick={() => update("kind", "payment")}>Оплата</button><button type="button" className={draft.kind === "expense" ? "active" : ""} onClick={() => update("kind", "expense")}>Расход</button></div><form onSubmit={submit}><div className="lesson-form-grid">{draft.kind === "payment" ? <><label className="lesson-form-full"><span>Ученик</span><select value={draft.studentId} onChange={(event) => update("studentId", event.target.value)} disabled={isSubmitting}>{!students.length && <option value="">Нет активных учеников</option>}{students.map((student) => <option value={student.id} key={student.id}>{student.firstName} {student.lastName}</option>)}</select></label><label><span>Способ оплаты</span><select value={draft.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}><option>Перевод</option><option>Наличные</option><option>Другое</option></select></label></> : <label className="lesson-form-full"><span>Категория</span><select value={draft.category} onChange={(event) => update("category", event.target.value)}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></label>}<label><span>Сумма</span><div className="price-input-wrap"><input type="number" min="1" step="1" value={draft.amount} onChange={(event) => update("amount", Number(event.target.value))} /><i>₽</i></div></label><label><span>Дата</span><input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} required /></label><label className="lesson-form-full"><span>Описание</span><textarea rows={3} value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="Необязательно" /></label></div>{(validationError || error) && <p className="lesson-form-error">{validationError || error}</p>}<div className="lesson-modal-footer"><div><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Сохранение…" : transaction ? "Сохранить" : "Добавить"}</Button></div></div></form></section></div>;
}

function monthRange(value: string) { const [year, month] = value.split("-").map(Number); return { from: `${value}-01`, to: toDateKey(new Date(year, month, 1)) }; }
function getMonthlyLessonChart(items: Lesson[], endMonth: string) { const [year, month] = endMonth.split("-").map(Number); return Array.from({ length: 8 }, (_, index) => { const date = new Date(year, month - 8 + index, 1); const key = toMonthKey(date); return { key, label: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(".", ""), value: items.filter((item) => toMonthKey(new Date(item.startAt)) === key).reduce((sumValue, item) => sumValue + item.price, 0) }; }); }
function entityName(item: FinanceTransaction, students: Student[]) { if (item.studentId) { const student = students.find((candidate) => candidate.id === item.studentId); return student ? `${student.firstName} ${student.lastName}` : "Ученик"; } return item.category || "Операция"; }
function transactionLabel(type: FinanceTransaction["type"]) { return ({ payment: "Оплата", lesson_charge: "Начисление за урок", expense: "Расход", adjustment: "Корректировка", refund: "Возврат" })[type]; }
function isManualTransaction(item: FinanceTransaction) { return item.lessonId === null && (item.type === "payment" || item.type === "expense"); }
function signedOperationAmount(item: FinanceTransaction) { if (item.type === "payment" || item.type === "adjustment") return item.amount; return -item.amount; }
function formatMoney(value: number) { return `${value.toLocaleString("ru-RU")} ₽`; }
function formatSignedMoney(value: number) { return `${value >= 0 ? "+" : "−"}${Math.abs(value).toLocaleString("ru-RU")} ₽`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${value}T00:00:00`)); }
function formatMonth(value: string) { return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${value}-01T00:00:00`)); }
function toMonthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function toDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function sum<T>(items: T[], key: keyof T) { return items.reduce((total, item) => total + Number(item[key]), 0); }
function getErrorMessage(error: unknown) { if (error instanceof Error) return error.message; if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message; return "Неизвестная ошибка Supabase"; }
