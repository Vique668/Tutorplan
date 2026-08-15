"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Archive, CalendarDays, Clock3, Mail, NotebookText, Pencil, Phone, RotateCcw, WalletCards, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Student } from "./student-types";

type StudentProfilePanelProps = {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
};

export function StudentProfilePanel({ student, onClose, onEdit, onStatusChange }: StudentProfilePanelProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".student-modal-backdrop")) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`;

  return createPortal(
    <div className="student-panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="student-profile-panel" role="dialog" aria-modal="true" aria-labelledby="student-profile-title">
        <div className="student-panel-topbar">
          <span>ПРОФИЛЬ УЧЕНИКА</span>
          <button className="icon-button" aria-label="Закрыть профиль" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="student-profile-heading">
          <Avatar initials={initials} color="peach" size="lg" />
          <div><h2 id="student-profile-title">{student.firstName} {student.lastName}</h2><Badge tone={student.status === "active" ? "green" : "gray"}>{student.status === "active" ? "Активный" : "В архиве"}</Badge></div>
        </div>

        <div className="student-profile-actions">
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={onEdit}>Редактировать</Button>
          <Button variant="secondary" icon={student.status === "active" ? <Archive size={16} /> : <RotateCcw size={16} />} onClick={onStatusChange}>{student.status === "active" ? "Архивировать" : "Восстановить"}</Button>
        </div>

        <section className="student-profile-section">
          <h3>Контактная информация</h3>
          <div className="student-contact-row"><Phone size={16} /><span>{student.phone || "Телефон не указан"}</span></div>
          <div className="student-contact-row"><Mail size={16} /><span>{student.email || "Email не указан"}</span></div>
        </section>

        <section className="student-profile-section">
          <h3>Параметры занятий</h3>
          <div className="student-profile-metrics">
            <div><WalletCards size={17} /><span>Стоимость</span><strong>{student.lessonPrice.toLocaleString("ru-RU")} ₽</strong></div>
            <div><Clock3 size={17} /><span>Продолжительность</span><strong>{formatDuration(student.lessonDuration)}</strong></div>
          </div>
        </section>

        <section className="student-profile-section">
          <h3>Заметки</h3>
          <div className="student-notes"><NotebookText size={17} /><p>{student.notes || "Заметок пока нет."}</p></div>
        </section>

        <section className="student-profile-section">
          <h3>Ближайшие занятия</h3>
          {student.upcomingLessons.length ? (
            <div className="student-upcoming-list">
              {student.upcomingLessons.map((lesson) => <div key={lesson.id}><span><CalendarDays size={15} /></span><div><strong>{lesson.date} · {lesson.time}</strong><small>{lesson.subject}</small></div></div>)}
            </div>
          ) : <p className="student-placeholder">Ближайших занятий пока нет.</p>}
        </section>

        <div className="student-placeholder-grid">
          <section><CalendarDays size={18} /><div><strong>История занятий</strong><span>История появится после проведённых уроков</span></div></section>
          <section><WalletCards size={18} /><div><strong>Финансы</strong><span>Баланс: {student.balance.toLocaleString("ru-RU")} ₽</span></div></section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes === 60) return "1 час";
  if (minutes === 90) return "1 ч 30 мин";
  return `${minutes / 60} часа`;
}
