import type { ThemeMode } from "@/lib/themes";

export type AccountProfile = { id: string; firstName: string; lastName: string; email: string; phone: string; description: string; avatarUrl: string | null };
export type TutorSettings = { tutorId: string; timezone: string; defaultLessonDuration: number; defaultLessonPrice: number | null; workingDayStart: string; workingDayEnd: string; workingWeekdays: number[]; remindersEnabled: boolean; reminderMinutesBefore: number; preferredPaymentMethod: string; paymentInstructions: string; currency: "RUB"; monthlyIncomeGoal: number | null; appearanceMode: ThemeMode };
