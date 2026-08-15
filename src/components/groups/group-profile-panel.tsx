"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, CalendarDays, Clock3, Pencil, Plus, RotateCcw, UserMinus, Users, WalletCards, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initialStudents } from "@/components/students/student-data";
import type { StudentGroup } from "./group-types";

type GroupProfilePanelProps = {
  group: StudentGroup;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onAddStudent: (studentId: string) => void;
  onRemoveStudent: (studentId: string) => void;
};

export function GroupProfilePanel({ group, onClose, onEdit, onStatusChange, onAddStudent, onRemoveStudent }: GroupProfilePanelProps) {
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const members = initialStudents.filter((student) => group.studentIds.includes(student.id));
  const availableStudents = initialStudents.filter((student) => student.status === "active" && !group.studentIds.includes(student.id));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".group-modal-backdrop")) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="group-panel-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="group-profile-panel" role="dialog" aria-modal="true" aria-labelledby="group-profile-title">
        <div className="group-panel-topbar"><span>ПРОФИЛЬ ГРУППЫ</span><button className="icon-button" aria-label="Закрыть профиль" onClick={onClose}><X size={20} /></button></div>
        <div className="group-profile-heading">
          <span className="group-profile-icon"><Users size={24} /></span>
          <div><h2 id="group-profile-title">{group.name}</h2><Badge tone={group.status === "active" ? "green" : "gray"}>{group.status === "active" ? "Активная" : "В архиве"}</Badge></div>
        </div>
        <div className="group-profile-actions">
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={onEdit}>Редактировать группу</Button>
          <Button variant="secondary" icon={group.status === "active" ? <Archive size={16} /> : <RotateCcw size={16} />} onClick={onStatusChange}>{group.status === "active" ? "Архивировать" : "Восстановить"}</Button>
        </div>

        <section className="group-profile-section">
          <div className="group-section-heading"><h3>Ученики <span>{members.length}</span></h3><button onClick={() => setShowStudentPicker((value) => !value)}><Plus size={14} />Добавить ученика</button></div>
          {showStudentPicker && (
            <div className="group-add-student-picker">
              {availableStudents.length ? availableStudents.map((student) => <button key={student.id} onClick={() => { onAddStudent(student.id); setShowStudentPicker(false); }}><Avatar initials={`${student.firstName[0]}${student.lastName[0]}`} color="peach" size="sm" /><span>{student.firstName} {student.lastName}</span><Plus size={14} /></button>) : <p>Все активные ученики уже добавлены.</p>}
            </div>
          )}
          {members.length ? <div className="group-member-list">{members.map((student) => <div key={student.id}><Avatar initials={`${student.firstName[0]}${student.lastName[0]}`} color="peach" size="sm" /><div><strong>{student.firstName} {student.lastName}</strong><small>{student.email || student.phone}</small></div><button aria-label={`Удалить ${student.firstName} из группы`} onClick={() => onRemoveStudent(student.id)}><UserMinus size={16} /></button></div>)}</div> : <p className="group-profile-placeholder">В группе пока нет учеников.</p>}
        </section>

        <section className="group-profile-section">
          <h3>Параметры занятий</h3>
          <div className="group-profile-metrics"><div><WalletCards size={17} /><span>Стоимость</span><strong>{group.lessonPrice.toLocaleString("ru-RU")} ₽ / чел.</strong></div><div><Clock3 size={17} /><span>Продолжительность</span><strong>{formatDuration(group.lessonDuration)}</strong></div></div>
          {group.notes && <p className="group-profile-notes">{group.notes}</p>}
        </section>

        <section className="group-profile-section">
          <h3>Ближайшие занятия</h3>
          {group.upcomingLessons.length ? <div className="group-upcoming-list">{group.upcomingLessons.map((lesson) => <div key={lesson.id}><span><CalendarDays size={15} /></span><div><strong>{lesson.date}</strong><small>{lesson.time}</small></div></div>)}</div> : <p className="group-profile-placeholder">Ближайших занятий пока нет.</p>}
        </section>
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
