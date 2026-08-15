import { ArrowDownLeft, ArrowUpRight, ChevronDown, CircleDollarSign, Download, Plus, ReceiptText, WalletCards } from "lucide-react";
import { transactions } from "@/data/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

const bars = [38, 52, 46, 65, 58, 77, 69, 86];

export default function FinancePage() {
  return (
    <div className="page-stack">
      <PageHeader title="Финансы" description="Доходы, расходы и оплаты учеников" actions={<><Button variant="secondary" icon={<Download size={18} />}>Отчёт</Button><Button icon={<Plus size={18} />}>Добавить операцию</Button></>} />
      <div className="stats-grid stats-grid-three">
        <StatCard label="Доход в августе" value="48 600 ₽" note="↑ 12% к июлю" icon={<ArrowDownLeft size={21} />} tone="green" />
        <StatCard label="Расходы" value="6 240 ₽" note="Сервисы и материалы" icon={<ArrowUpRight size={21} />} tone="orange" />
        <StatCard label="Ожидается" value="12 400 ₽" note="5 неоплаченных занятий" icon={<WalletCards size={21} />} tone="purple" />
      </div>
      <div className="finance-grid">
        <Card className="chart-card">
          <div className="card-toolbar"><div><h2>Доход</h2><p>За последние 8 месяцев</p></div><button className="select-button">2026 год <ChevronDown size={16} /></button></div>
          <div className="income-summary"><strong>326 800 ₽</strong><Badge tone="green">+18,4%</Badge></div>
          <div className="bar-chart" aria-label="График доходов">
            {bars.map((height, index) => <div className="bar-item" key={index}><div><span style={{ height: `${height}%` }} className={index === 7 ? "bar-current" : ""} /></div><small>{["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг"][index]}</small></div>)}
          </div>
        </Card>
        <Card className="goal-card">
          <div className="card-toolbar"><div><h2>Цель на август</h2><p>Ежемесячный доход</p></div><span className="goal-icon"><CircleDollarSign size={21} /></span></div>
          <div className="goal-ring"><div><strong>67%</strong><span>выполнено</span></div></div>
          <div className="goal-values"><div><span>Получено</span><strong>48 600 ₽</strong></div><div><span>Цель</span><strong>72 000 ₽</strong></div></div>
          <Button variant="secondary" className="full-button">Изменить цель</Button>
        </Card>
      </div>
      <Card className="table-card">
        <div className="card-toolbar"><div><h2>Последние операции</h2><p>Все движения за август</p></div><button className="text-button">Все операции</button></div>
        <div className="data-table finance-table">
          <div className="data-row data-head"><span>Дата</span><span>Ученик / категория</span><span>Назначение</span><span>Статус</span><span>Сумма</span></div>
          {transactions.map((transaction) => (
            <div className="data-row" key={`${transaction.date}-${transaction.student}`}>
              <span>{transaction.date}</span>
              <div className="transaction-name"><span className={transaction.status === "Расход" ? "transaction-icon expense" : "transaction-icon"}><ReceiptText size={16} /></span><strong>{transaction.student}</strong></div>
              <span>{transaction.purpose}</span>
              <span><Badge tone={transaction.status === "Расход" ? "orange" : "green"}>{transaction.status}</Badge></span>
              <strong className={transaction.amount.startsWith("+") ? "balance-positive" : "balance-negative"}>{transaction.amount}</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
