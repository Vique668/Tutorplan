export type LessonStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

export type Lesson = {
  id: string;
  tutorId: string;
  studentId: string | null;
  groupId: string | null;
  lessonSeriesId: string | null;
  seriesOccurrenceDate: string | null;
  startAt: string;
  endAt: string;
  price: number;
  status: LessonStatus;
  notes: string | null;
  createdAt: string;
};

type StudentLessonTarget = {
  studentId: string;
  groupId?: null;
};

type GroupLessonTarget = {
  studentId?: null;
  groupId: string;
};

export type CreateLessonInput = (StudentLessonTarget | GroupLessonTarget) & {
  lessonSeriesId?: string | null;
  startAt: string;
  endAt: string;
  price: number;
  status?: LessonStatus;
  notes?: string | null;
};

export type UpdateLessonInput = {
  studentId?: string | null;
  groupId?: string | null;
  lessonSeriesId?: string | null;
  startAt?: string;
  endAt?: string;
  price?: number;
  status?: LessonStatus;
  notes?: string | null;
};
