"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Plus, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { emptyStudentDraft } from "@/components/students/student-data";
import { StudentModal } from "@/components/students/student-modal";
import type { Student, StudentDraft, StudentFilter } from "@/components/students/student-types";
import {
  createStudent,
  getStudents,
} from "../../../lib/supabase/students";

const filters: { value: StudentFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "archived", label: "Архив" },
];

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [modalState, setModalState] = useState<{ student: Student | null; draft: StudentDraft } | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setStudents(await getStudents());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    return students.filter((student) => {
      const matchesStatus = filter === "all" || student.status === filter;
      const haystack = `${student.firstName} ${student.lastName} ${student.phone} ${student.email}`.toLocaleLowerCase("ru-RU");
      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [filter, search, students]);

  const closeModal = useCallback(() => {
    setModalState(null);
    setSubmitError(null);
  }, []);

  function openCreate() {
    setSubmitError(null);
    setModalState({ student: null, draft: { ...emptyStudentDraft } });
  }

  async function saveStudent(draft: StudentDraft) {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newStudent = await createStudent(draft);
      setStudents((current) => [newStudent, ...current]);
      setFilter("all");
      setSearch("");

      void getStudents()
        .then(setStudents)
        .catch(() => {
          // The inserted student is already visible; a later page refresh
          // will retry synchronization without risking a duplicate insert.
        });
      closeModal();
    } catch (saveError) {
      setSubmitError(getErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack students-page">
      <PageHeader
        title="Ученики"
        description={`${students.filter((student) => student.status === "active").length} активных · ${students.filter((student) => student.status === "archived").length} в архиве`}
        actions={<Button icon={<Plus size={18} />} onClick={openCreate}>Добавить ученика</Button>}
      />

      <Card className="student-directory">
        <div className="student-directory-toolbar">
          <label className="student-search">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти ученика по имени или контактам"
              aria-label="Поиск учеников"
            />
            {search && <button type="button" onClick={() => setSearch("")} aria-label="Очистить поиск">×</button>}
          </label>
          <div className="student-filter" aria-label="Фильтр учеников">
            {filters.map((item) => (
              <button
                key={item.value}
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
                <span>{item.value === "all" ? students.length : students.filter((student) => student.status === item.value).length}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="students-empty-state" aria-live="polite">
            <LoaderCircle size={32} />
            <h2>Загружаем учеников</h2>
            <p>Получаем данные из Supabase.</p>
          </div>
        ) : error ? (
          <div className="students-empty-state" role="alert">
            <CircleAlert size={34} />
            <h2>Не удалось загрузить учеников</h2>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void loadStudents()}>Попробовать снова</Button>
          </div>
        ) : filteredStudents.length ? (
          <div className="student-card-list">
            {filteredStudents.map((student) => {
              const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`;
              return (
                <button className="student-list-card" key={student.id} onClick={() => router.push(`/students/${student.id}`)}>
                  <div className="student-list-identity">
                    <Avatar initials={initials} color={student.status === "active" ? "peach" : "blue"} />
                    <div>
                      <span>{student.firstName}</span>
                      <strong>{student.lastName}</strong>
                      <small>{student.email || student.phone || "Контакты не указаны"}</small>
                    </div>
                  </div>
                  <div className="student-list-value">
                    <small>Баланс</small>
                    <strong className={student.balance > 0 ? "balance-positive" : ""}>{student.balance.toLocaleString("ru-RU")} ₽</strong>
                  </div>
                  <div className="student-list-value">
                    <small>Стоимость урока</small>
                    <strong>{student.lessonPrice.toLocaleString("ru-RU")} ₽</strong>
                    <span>{student.lessonDuration} мин</span>
                  </div>
                  <Badge tone={student.status === "active" ? "green" : "gray"}>{student.status === "active" ? "Активный" : "В архиве"}</Badge>
                  <span className="student-open-icon"><ArrowRight size={17} /></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="students-empty-state">
            <Image src="/ui/empty-students.png" alt="" width={180} height={180} />
            <h2>{students.length ? "Ученики не найдены" : "Добавьте первого ученика"}</h2>
            <p>{students.length ? "Попробуйте изменить запрос или выбрать другой фильтр." : "Карточки учеников помогут хранить контакты, цены и заметки в одном месте."}</p>
            {!students.length && <Button icon={<Plus size={17} />} onClick={openCreate}>Добавить ученика</Button>}
          </div>
        )}
      </Card>

      <div className="students-local-note">
        <span><Users size={18} /></span>
        <p><strong>Supabase</strong> Данные учеников загружаются и сохраняются в базе данных.</p>
      </div>

      {modalState && (
        <StudentModal
          student={modalState.student}
          initialDraft={modalState.draft}
          isSubmitting={isSubmitting}
          error={submitError}
          onClose={closeModal}
          onSave={saveStudent}
        />
      )}
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "Неизвестная ошибка Supabase";
}
