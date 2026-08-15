export type GroupStatus = "active" | "archived";

export type GroupLesson = {
  id: string;
  date: string;
  time: string;
};

export type StudentGroup = {
  id: string;
  name: string;
  studentIds: string[];
  lessonPrice: number;
  lessonDuration: number;
  notes: string;
  status: GroupStatus;
  upcomingLessons: GroupLesson[];
};

export type GroupDraft = Pick<StudentGroup, "name" | "studentIds" | "lessonPrice" | "lessonDuration" | "notes">;
