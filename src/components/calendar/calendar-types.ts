export type CalendarView = "day" | "week" | "month";
export type LessonStatus = "scheduled" | "completed" | "cancelled" | "rescheduled" | "no_show";
export type LessonCancellationReason = "tutor_cancelled" | "illness" | "absence" | "holiday";
export type LessonStatusFilter = "all" | "scheduled" | "completed" | "cancelled" | "rescheduled";
export type RecurrenceOption = "none" | "weekly";
export type SeriesActionScope = "single" | "following";

export const lessonStatusLabels: Record<LessonStatus, string> = {
  scheduled: "Запланировано",
  completed: "Проведено",
  cancelled: "Отменено",
  rescheduled: "Перенесено",
  no_show: "Ученик не пришёл",
};

export const primaryLessonStatuses = ["scheduled", "completed", "cancelled"] as const satisfies readonly LessonStatus[];

export type LessonColor = "apricot" | "lavender" | "sage" | "sky" | "rose";

export type CalendarLesson = {
  id: string;
  kind?: "lesson" | "other";
  studentId?: string;
  groupId?: string;
  participant: string;
  date: string;
  startTime: string;
  duration: number;
  price: number;
  status: LessonStatus;
  cancellationReason?: LessonCancellationReason | null;
  cancellationFee?: number;
  cancelledAt?: string | null;
  notes?: string | null;
  startAt?: string;
  endAt?: string;
  subject: string;
  color: LessonColor;
  online?: boolean;
  seriesId?: string;
  seriesDate?: string;
  isSeriesException?: boolean;
};

export type RecurringLessonSeries = {
  id: string;
  frequency: "weekly";
  participant: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime?: string;
  duration: number;
  price: number;
  status: LessonStatus;
  subject: string;
  color: LessonColor;
  online?: boolean;
};

export type LessonDraft = Pick<CalendarLesson, "participant" | "date" | "startTime" | "duration" | "price" | "status"> & {
  recurrence: RecurrenceOption;
  recurrenceEndDate: string;
};
