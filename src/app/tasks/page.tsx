import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const tasks = [
  { title: "Проверить домашнюю работу Ульяны", date: "Сегодня, до 15:00", done: false },
  { title: "Подготовить материалы для Round Up", date: "Сегодня, до 18:00", done: false },
  { title: "Отправить Павлу результаты теста", date: "Выполнено сегодня", done: true },
];

export default function TasksPage() {
  return (
    <div className="page-stack">
      <PageHeader title="Задачи" description="Личные напоминания и подготовка к занятиям" actions={<Button icon={<Plus size={18} />}>Новая задача</Button>} />
      <Card className="tasks-card">
        {tasks.map((task) => (
          <div className={`task-row ${task.done ? "task-done" : ""}`} key={task.title}>
            {task.done ? <CheckCircle2 size={21} /> : <Circle size={21} />}
            <div><strong>{task.title}</strong><small>{task.date}</small></div>
          </div>
        ))}
      </Card>
    </div>
  );
}
