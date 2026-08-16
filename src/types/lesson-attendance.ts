export type LessonAbsenceReason = "illness" | "absence" | "holiday" | "other";

export type LessonAttendance = {
  id: string;
  lessonId: string;
  studentId: string;
  attended: boolean;
  price: number;
  absenceReason: LessonAbsenceReason | null;
  absenceFee: number;
  createdAt: string;
  updatedAt: string;
};

export type LessonAttendanceInput = Pick<
  LessonAttendance,
  "studentId" | "attended" | "price" | "absenceReason" | "absenceFee"
>;

