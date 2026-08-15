export type GroupStatus = "active" | "archived";

export type GroupLesson = {
  id: string;
  date: string;
  time: string;
};

export type StudentGroup = {
  id: string;
  name: string;
  subject: string | null;
  studentIds: string[];
  lessonPrice: number;
  lessonDuration: number;
  notes: string;
  status: GroupStatus;
  upcomingLessons: GroupLesson[];
  lessonHistoryCount: number;
  createdAt: string;
};

export type GroupDraft = Pick<StudentGroup, "name" | "subject" | "studentIds" | "lessonPrice" | "lessonDuration" | "notes">;
