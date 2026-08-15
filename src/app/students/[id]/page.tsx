"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  History,
  LoaderCircle,
  Mail,
  NotebookText,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  UserRound,
  WalletCards,
} from "lucide-react";
import { StudentLessonModal, type StudentLessonDraft } from "@/components/students/student-lesson-modal";
import { StudentModal } from "@/components/students/student-modal";
import type { Student, StudentDraft } from "@/components/students/student-types";
import type { Lesson } from "@/types/lesson";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  archiveStudent,
  getStudent,
  updateStudent,
} from "../../../../lib/supabase/students";
import {
  createLesson,
  getStudentLessons,
} from "../../../../lib/supabase/lessons";

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsReferenceTime, setLessonsReferenceTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isLessonSubmitting, setIsLessonSubmitting] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    if (!studentId) {
      setError("Идентификатор ученика не указан.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [loadedStudent, loadedLessons] = await Promise.all([
        getStudent(studentId),
        getStudentLessons(studentId),
      ]);
      setStudent(loadedStudent);
      setLessons(loadedLessons);
      setLessonsReferenceTime(Date.now());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadStudent();
  }, [loadStudent]);

  const upcomingLessons = useMemo(() => {
    return lessons
      .filter((lesson) => (
        new Date(lesson.endAt).getTime() >= lessonsReferenceTime
        && lesson.status !== "cancelled"
        && lesson.status !== "completed"
      ))
      .sort((first, second) => new Date(first.startAt).getTime() - new Date(second.startAt).getTime());
  }, [lessons, lessonsReferenceTime]);

  function openEdit() {
    setSubmitError(null);
    setIsEditing(true);
  }

  function closeEdit() {
    setSubmitError(null);
    setIsEditing(false);
  }

  async function saveStudent(draft: StudentDraft) {
    if (!student) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      setStudent(await updateStudent(student.id, draft));
      closeEdit();
    } catch (saveError) {
      setSubmitError(getErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeArchiveStatus() {
    if (!student) return;

    setIsArchiving(true);
    setActionError(null);
    try {
      const nextStatus = student.status === "active" ? "archived" : "active";
      setStudent(await archiveStudent(student.id, nextStatus));
    } catch (archiveError) {
      setActionError(getErrorMessage(archiveError));
    } finally {
      setIsArchiving(false);
    }
  }

  async function saveLesson(draft: StudentLessonDraft) {
    if (!student) return;

    setIsLessonSubmitting(true);
    setLessonError(null);
    setActionError(null);
    try {
      const startAt = new Date(`${draft.date}T${draft.startTime}:00`);
      const endAt = new Date(startAt.getTime() + draft.duration * 60_000);
      const createdLesson = await createLesson({
        studentId: student.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        price: draft.price,
        status: draft.status,
        notes: draft.notes,
      });

      setLessons((current) => [...current, createdLesson]);
      setLessonsReferenceTime(Date.now());
      setIsLessonModalOpen(false);

      try {
        const [refreshedStudent, refreshedLessons] = await Promise.all([
          getStudent(student.id),
          getStudentLessons(student.id),
        ]);
        setStudent(refreshedStudent);
        setLessons(refreshedLessons);
      } catch (refreshError) {
        setActionError(`Занятие создано, но профиль не удалось обновить: ${getErrorMessage(refreshError)}`);
      }
    } catch (createError) {
      setLessonError(getErrorMessage(createError));
    } finally {
      setIsLessonSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack student-details-page">
        <Card>
          <div className="students-empty-state" aria-live="polite">
            <LoaderCircle size={32} />
            <h2>Загружаем профиль ученика</h2>
            <p>Получаем данные из Supabase.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page-stack student-details-page">
        <Button variant="ghost" icon={<ArrowLeft size={17} />} onClick={() => router.push("/students")}>К ученикам</Button>
        <Card>
          <div className="students-empty-state" role="alert">
            <CircleAlert size={34} />
            <h2>Не удалось открыть профиль</h2>
            <p>{error ?? "Ученик не найден."}</p>
            <Button variant="secondary" onClick={() => void loadStudent()}>Попробовать снова</Button>
          </div>
        </Card>
      </div>
    );
  }

  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`;
  const editDraft = toDraft(student);

  return (
    <div className="page-stack student-details-page">
      <button className="student-details-back" type="button" onClick={() => router.push("/students")}>
        <ArrowLeft size={16} /> К списку учеников
      </button>

      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description="Профиль ученика"
        actions={(
          <>
            <Button icon={<Plus size={16} />} onClick={() => { setLessonError(null); setIsLessonModalOpen(true); }}>Добавить занятие</Button>
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={openEdit}>Редактировать</Button>
            <Button
              variant="secondary"
              icon={student.status === "active" ? <Archive size={16} /> : <RotateCcw size={16} />}
              onClick={() => void changeArchiveStatus()}
              disabled={isArchiving}
            >
              {isArchiving ? "Сохранение…" : student.status === "active" ? "Архивировать" : "Восстановить"}
            </Button>
          </>
        )}
      />

      {actionError && <p className="student-form-error" role="alert">{actionError}</p>}

      <div className="student-details-layout">
        <Card className="student-details-card">
          <div className="student-details-heading">
            <Avatar initials={initials} color="peach" size="lg" />
            <div>
              <h2>{student.firstName} {student.lastName}</h2>
              <Badge tone={student.status === "active" ? "green" : "gray"}>
                {student.status === "active" ? "Активный" : "В архиве"}
              </Badge>
            </div>
          </div>

          <section className="student-profile-section">
            <h3>Основная информация</h3>
            <div className="student-details-fields">
              <div><span>Имя</span><strong>{student.firstName}</strong></div>
              <div><span>Фамилия</span><strong>{student.lastName}</strong></div>
            </div>
          </section>

          <section className="student-profile-section">
            <h3>Контактная информация</h3>
            <div className="student-contact-row"><Phone size={16} /><span>{student.phone || "Телефон не указан"}</span></div>
            <div className="student-contact-row"><Mail size={16} /><span>{student.email || "Email не указан"}</span></div>
          </section>

          <section className="student-profile-section">
            <h3>Родитель / контактное лицо</h3>
            {student.parents.length ? (
              <div className="student-parent-list">
                {student.parents.map((parent, index) => (
                  <div className="student-parent-card" key={parent.id}>
                    <div className="student-parent-heading">
                      <span><UserRound size={17} /></span>
                      <div>
                        <small>{student.parents.length > 1 ? `Контакт ${index + 1}` : "Контактное лицо"}</small>
                        <strong>{parent.firstName} {parent.lastName ?? ""}</strong>
                      </div>
                    </div>
                    <div className="student-parent-name-grid">
                      <div><span>Имя</span><strong>{parent.firstName}</strong></div>
                      <div><span>Фамилия</span><strong>{parent.lastName || "Не указана"}</strong></div>
                    </div>
                    <div className="student-contact-row"><Phone size={16} /><span>{parent.phone || "Телефон не указан"}</span></div>
                    <div className="student-contact-row"><Mail size={16} /><span>{parent.email || "Email не указан"}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="student-placeholder">Родитель или контактное лицо не добавлены.</p>
            )}
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
        </Card>

        <div className="student-details-sections">
          <StudentPlaceholder
            icon={<BookOpen size={20} />}
            title="Занятия"
            text={lessons.length ? `Всего занятий: ${lessons.length}` : "Занятий пока нет."}
          />
          <UpcomingLessons lessons={upcomingLessons} />
          <StudentPlaceholder
            icon={<History size={20} />}
            title="История занятий"
            text="История появится после проведённых уроков."
          />
          <StudentPlaceholder
            icon={<CircleDollarSign size={20} />}
            title="Финансы"
            text="Финансовые данные пока не подключены."
          />
        </div>
      </div>

      {isEditing && (
        <StudentModal
          student={student}
          initialDraft={editDraft}
          isSubmitting={isSubmitting}
          error={submitError}
          onClose={closeEdit}
          onSave={saveStudent}
        />
      )}
      {isLessonModalOpen && (
        <StudentLessonModal
          student={student}
          isSubmitting={isLessonSubmitting}
          error={lessonError}
          onClose={() => { if (!isLessonSubmitting) setIsLessonModalOpen(false); }}
          onSave={saveLesson}
        />
      )}
    </div>
  );
}

function StudentPlaceholder({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="student-details-placeholder">
      <span>{icon}</span>
      <div><h2>{title}</h2><p>{text}</p></div>
    </Card>
  );
}

function UpcomingLessons({ lessons }: { lessons: Lesson[] }) {
  return (
    <Card className="student-details-placeholder student-upcoming-lessons-card">
      <span><CalendarDays size={20} /></span>
      <div className="student-upcoming-lessons-content">
        <h2>Ближайшие занятия</h2>
        {lessons.length ? (
          <div className="student-upcoming-lessons-list">
            {lessons.map((lesson) => (
              <div className={`student-upcoming-lesson lesson-status-${lesson.status}`} key={lesson.id}>
                <strong>{formatLessonDate(lesson.startAt)}</strong>
                <span>{formatLessonTime(lesson.startAt)}–{formatLessonTime(lesson.endAt)}</span>
                <small>{lessonStatusLabel(lesson.status)} · {lesson.price.toLocaleString("ru-RU")} ₽</small>
              </div>
            ))}
          </div>
        ) : (
          <p>Запланированных занятий пока нет.</p>
        )}
      </div>
    </Card>
  );
}

function toDraft(student: Student): StudentDraft {
  const { firstName, lastName, phone, email, lessonPrice, lessonDuration, notes } = student;
  const primaryParent = student.parents[0];
  return {
    firstName,
    lastName,
    phone,
    email,
    dateOfBirth: student.dateOfBirth ?? "",
    address: student.address ?? "",
    parentFirstName: primaryParent?.firstName ?? null,
    parentLastName: primaryParent?.lastName ?? null,
    parentPhone: primaryParent?.phone ?? null,
    parentEmail: primaryParent?.email ?? null,
    lessonPrice,
    lessonDuration,
    notes,
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  if (minutes === 60) return "1 час";
  if (minutes === 90) return "1 ч 30 мин";
  if (minutes === 120) return "2 часа";
  return `${minutes} мин`;
}

function formatLessonDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(value));
}

function formatLessonTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function lessonStatusLabel(status: Lesson["status"]): string {
  const labels: Record<Lesson["status"], string> = {
    scheduled: "Запланировано",
    completed: "Проведено",
    cancelled: "Отменено",
    rescheduled: "Перенесено",
    no_show: "Ученик не пришёл",
  };
  return labels[status];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "Неизвестная ошибка Supabase";
}
