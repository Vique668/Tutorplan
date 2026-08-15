export type LessonSeries = {
  id: string;
  tutorId: string;
  targetType: "student" | "group";
  studentId: string | null;
  groupId: string | null;
  weekday: number;
  startTime: string;
  endTime: string | null;
  duration: number;
  price: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CreateLessonSeriesInput = Omit<LessonSeries, "id" | "tutorId" | "createdAt"> & { endTime: string };

export type LessonSeriesUpdateScope = "template" | "all_future" | "from_date";

export type LessonSeriesUpdateOptions = {
  scope: LessonSeriesUpdateScope;
  fromDate: string | null;
};
