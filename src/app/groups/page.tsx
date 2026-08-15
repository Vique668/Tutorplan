"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleAlert, Clock3, LoaderCircle, Plus, Users, WalletCards } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { Student } from "@/components/students/student-types";
import { emptyGroupDraft } from "@/components/groups/group-defaults";
import { GroupModal } from "@/components/groups/group-modal";
import { GroupProfilePanel } from "@/components/groups/group-profile-panel";
import type { GroupDraft, StudentGroup } from "@/components/groups/group-types";
import type { FinanceTransaction } from "@/types/finance";
import { createGroup, deleteGroup, getGroups, setGroupStatus, updateGroup } from "../../../lib/supabase/groups";
import { getStudents } from "../../../lib/supabase/students";
import { getFinanceTransactions } from "../../../lib/supabase/finance";

export default function GroupsPage() {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [finance, setFinance] = useState<FinanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ group: StudentGroup | null; draft: GroupDraft } | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedId) ?? null;

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedGroups, loadedStudents, loadedFinance] = await Promise.all([getGroups(), getStudents(), getFinanceTransactions()]);
      setGroups(loadedGroups);
      setStudents(loadedStudents);
      setFinance(loadedFinance);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  function openCreate() {
    setActionError(null);
    setModalState({ group: null, draft: { ...emptyGroupDraft, studentIds: [] } });
  }

  function openEdit(group: StudentGroup) {
    setActionError(null);
    const { name, subject, studentIds, lessonPrice, lessonDuration, notes } = group;
    setModalState({ group, draft: { name, subject, studentIds: [...studentIds], lessonPrice, lessonDuration, notes } });
  }

  async function saveGroup(draft: GroupDraft) {
    setIsMutating(true);
    setActionError(null);
    try {
      const saved = modalState?.group ? await updateGroup(modalState.group.id, draft) : await createGroup(draft);
      setGroups((current) => modalState?.group ? current.map((group) => group.id === saved.id ? saved : group) : [saved, ...current]);
      setModalState(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function changeStatus(group: StudentGroup) {
    if (group.status === "active" && !window.confirm("Архивировать эту группу?")) return;
    await mutateGroup(async () => setGroupStatus(group.id, group.status === "active" ? "archived" : "active"));
  }

  async function changeMembers(group: StudentGroup, studentIds: string[]) {
    await mutateGroup(() => updateGroup(group.id, toDraft(group, studentIds)));
  }

  async function removeSelectedGroup() {
    if (!selectedGroup || !window.confirm("Удалить группу без возможности восстановления?")) return;
    setIsMutating(true);
    setActionError(null);
    try {
      await deleteGroup(selectedGroup.id);
      setGroups((current) => current.filter((group) => group.id !== selectedGroup.id));
      setSelectedId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function mutateGroup(operation: () => Promise<StudentGroup>) {
    setIsMutating(true);
    setActionError(null);
    try {
      const updated = await operation();
      setGroups((current) => current.map((group) => group.id === updated.id ? updated : group));
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="page-stack groups-page">
      <PageHeader title="Группы" description={`${groups.filter((group) => group.status === "active").length} активных · ${groups.filter((group) => group.status === "archived").length} в архиве`} actions={<Button icon={<Plus size={18} />} onClick={openCreate}>Создать группу</Button>} />
      {isLoading && <Card><div className="students-empty-state"><LoaderCircle size={28} className="spin" /><h2>Загружаем группы</h2><p>Получаем данные из Supabase.</p></div></Card>}
      {loadError && <Card><div className="students-empty-state" role="alert"><CircleAlert size={30} /><h2>Не удалось загрузить группы</h2><p>{loadError}</p><Button variant="secondary" onClick={() => void loadGroups()}>Повторить</Button></div></Card>}

      {!isLoading && !loadError && (groups.length ? (
        <div className="interactive-groups-grid">
          {groups.map((group) => {
            const members = students.filter((student) => group.studentIds.includes(student.id));
            return (
              <button className="interactive-group-card" key={group.id} onClick={() => { setActionError(null); setSelectedId(group.id); }}>
                <div className="interactive-group-top"><span><Users size={21} /></span><Badge tone={group.status === "active" ? "green" : "gray"}>{group.status === "active" ? "Активная" : "В архиве"}</Badge></div>
                <h2>{group.name}</h2>
                {group.subject && <p>{group.subject}</p>}
                <div className="group-card-members"><div>{members.slice(0, 4).map((student, index) => <Avatar key={student.id} initials={`${student.firstName[0]}${student.lastName[0]}`} color={index % 2 ? "blue" : "peach"} size="sm" />)}</div><span>{members.length} {studentWord(members.length)}</span></div>
                <div className="interactive-group-details"><div><Clock3 size={16} /><span>Продолжительность</span><strong>{group.lessonDuration} мин</strong></div><div><WalletCards size={16} /><span>Стоимость</span><strong>{group.lessonPrice.toLocaleString("ru-RU")} ₽</strong></div></div>
                <span className="interactive-group-open">Открыть группу <ArrowRight size={16} /></span>
              </button>
            );
          })}
          <button className="new-group-card" onClick={openCreate}><span><Plus size={22} /></span><strong>Новая группа</strong><p>Соберите учеников для совместных занятий</p></button>
        </div>
      ) : (
        <div className="groups-empty-state"><Image src="/ui/empty-groups.png" alt="" width={180} height={180} /><h2>Создайте первую группу</h2><p>Добавьте учеников и задайте общие параметры занятий.</p><Button icon={<Plus size={17} />} onClick={openCreate}>Создать группу</Button></div>
      ))}

      {selectedGroup && <GroupProfilePanel group={selectedGroup} students={students} isMutating={isMutating} error={actionError} financeTotal={finance.filter((item) => item.groupId === selectedGroup.id && item.type === "lesson_charge" && item.status === "posted").reduce((sum, item) => sum + item.amount, 0)} onClose={() => setSelectedId(null)} onEdit={() => openEdit(selectedGroup)} onStatusChange={() => void changeStatus(selectedGroup)} onAddStudent={(studentId) => void changeMembers(selectedGroup, [...selectedGroup.studentIds, studentId])} onRemoveStudent={(studentId) => void changeMembers(selectedGroup, selectedGroup.studentIds.filter((id) => id !== studentId))} onDelete={() => void removeSelectedGroup()} />}
      {modalState && <GroupModal group={modalState.group} initialDraft={modalState.draft} students={students} isSubmitting={isMutating} error={actionError} onClose={() => { if (!isMutating) setModalState(null); }} onSave={saveGroup} />}
    </div>
  );
}

function toDraft(group: StudentGroup, studentIds: string[]): GroupDraft {
  return { name: group.name, subject: group.subject, studentIds, lessonPrice: group.lessonPrice, lessonDuration: group.lessonDuration, notes: group.notes };
}

function studentWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "учеников";
  if (last === 1) return "ученик";
  if (last >= 2 && last <= 4) return "ученика";
  return "учеников";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Неизвестная ошибка Supabase";
}
