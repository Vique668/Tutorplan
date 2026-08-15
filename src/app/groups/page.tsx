"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { ArrowRight, Clock3, Plus, Users, WalletCards } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { initialStudents } from "@/components/students/student-data";
import { emptyGroupDraft, initialGroups } from "@/components/groups/group-data";
import { GroupModal } from "@/components/groups/group-modal";
import { GroupProfilePanel } from "@/components/groups/group-profile-panel";
import type { GroupDraft, StudentGroup } from "@/components/groups/group-types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<StudentGroup[]>(initialGroups);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ group: StudentGroup | null; draft: GroupDraft } | null>(null);
  const selectedGroup = groups.find((group) => group.id === selectedId) ?? null;

  const closeProfile = useCallback(() => setSelectedId(null), []);
  const closeModal = useCallback(() => setModalState(null), []);

  function openCreate() {
    setModalState({ group: null, draft: { ...emptyGroupDraft, studentIds: [] } });
  }

  function openEdit(group: StudentGroup) {
    const { name, studentIds, lessonPrice, lessonDuration, notes } = group;
    setModalState({ group, draft: { name, studentIds: [...studentIds], lessonPrice, lessonDuration, notes } });
  }

  function saveGroup(draft: GroupDraft) {
    if (modalState?.group) {
      setGroups((current) => current.map((group) => group.id === modalState.group?.id ? { ...group, ...draft } : group));
    } else {
      setGroups((current) => [{ id: globalThis.crypto?.randomUUID?.() ?? `group-${Date.now()}`, ...draft, status: "active", upcomingLessons: [] }, ...current]);
    }
    closeModal();
  }

  function toggleArchive(group: StudentGroup) {
    setGroups((current) => current.map((item) => item.id === group.id ? { ...item, status: item.status === "active" ? "archived" : "active" } : item));
  }

  function addStudent(groupId: string, studentId: string) {
    setGroups((current) => current.map((group) => group.id === groupId && !group.studentIds.includes(studentId) ? { ...group, studentIds: [...group.studentIds, studentId] } : group));
  }

  function removeStudent(groupId: string, studentId: string) {
    setGroups((current) => current.map((group) => group.id === groupId ? { ...group, studentIds: group.studentIds.filter((id) => id !== studentId) } : group));
  }

  return (
    <div className="page-stack groups-page">
      <PageHeader title="Группы" description={`${groups.filter((group) => group.status === "active").length} активных · ${groups.filter((group) => group.status === "archived").length} в архиве`} actions={<Button icon={<Plus size={18} />} onClick={openCreate}>Создать группу</Button>} />

      {groups.length ? (
        <div className="interactive-groups-grid">
          {groups.map((group) => {
            const members = initialStudents.filter((student) => group.studentIds.includes(student.id));
            return (
              <button className="interactive-group-card" key={group.id} onClick={() => setSelectedId(group.id)}>
                <div className="interactive-group-top"><span><Users size={21} /></span><Badge tone={group.status === "active" ? "green" : "gray"}>{group.status === "active" ? "Активная" : "В архиве"}</Badge></div>
                <h2>{group.name}</h2>
                <div className="group-card-members"><div>{members.slice(0, 4).map((student, index) => <Avatar key={student.id} initials={`${student.firstName[0]}${student.lastName[0]}`} color={index % 2 ? "blue" : "peach"} size="sm" />)}</div><span>{members.length} {studentWord(members.length)}</span></div>
                <div className="interactive-group-details"><div><Clock3 size={16} /><span>Продолжительность</span><strong>{group.lessonDuration} мин</strong></div><div><WalletCards size={16} /><span>Стоимость</span><strong>{group.lessonPrice.toLocaleString("ru-RU")} ₽</strong></div></div>
                <span className="interactive-group-open">Открыть группу <ArrowRight size={16} /></span>
              </button>
            );
          })}
          <button className="new-group-card" onClick={openCreate}><span><Plus size={22} /></span><strong>Новая группа</strong><p>Соберите учеников для совместных занятий</p></button>
        </div>
      ) : (
        <div className="groups-empty-state">
          <Image src="/ui/empty-groups.png" alt="" width={180} height={180} />
          <h2>Создайте первую группу</h2><p>Добавьте учеников и задайте общие параметры занятий.</p><Button icon={<Plus size={17} />} onClick={openCreate}>Создать группу</Button>
        </div>
      )}

      {selectedGroup && <GroupProfilePanel group={selectedGroup} onClose={closeProfile} onEdit={() => openEdit(selectedGroup)} onStatusChange={() => toggleArchive(selectedGroup)} onAddStudent={(studentId) => addStudent(selectedGroup.id, studentId)} onRemoveStudent={(studentId) => removeStudent(selectedGroup.id, studentId)} />}
      {modalState && <GroupModal group={modalState.group} initialDraft={modalState.draft} onClose={closeModal} onSave={saveGroup} />}
    </div>
  );
}

function studentWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "учеников";
  if (last === 1) return "ученик";
  if (last >= 2 && last <= 4) return "ученика";
  return "учеников";
}
