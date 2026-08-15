export type StudentStatus = "active" | "archived";
export type StudentFilter = "all" | StudentStatus;

export type UpcomingLesson = {
  id: string;
  date: string;
  time: string;
  subject: string;
};

export type ParentContact = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
};

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dateOfBirth?: string | null;
  address?: string | null;
  lessonPrice: number;
  lessonDuration: number;
  notes: string;
  balance: number;
  status: StudentStatus;
  upcomingLessons: UpcomingLesson[];
  parents: ParentContact[];
};

export type StudentDraft = Pick<Student, "firstName" | "lastName" | "lessonPrice" | "lessonDuration"> & {
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  parentFirstName: string | null;
  parentLastName: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
};
