import type { AccountProfile, TutorSettings } from "../../src/types/settings";
import type { ThemeMode } from "../../src/lib/themes";
import { createClient } from "./client";

type SettingsRow = { tutor_id: string; timezone: string; default_lesson_duration: number; default_lesson_price: number | string | null; working_day_start: string; working_day_end: string; working_weekdays: number[]; lesson_reminders_enabled: boolean; reminder_minutes_before: number; preferred_payment_method: string | null; payment_instructions: string | null; currency: "RUB"; monthly_income_goal: number | string | null; appearance_mode: ThemeMode };

export async function getAccountSettings(): Promise<{ profile: AccountProfile; settings: TutorSettings }> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Сессия не найдена. Войдите снова.");
  const [{ data: profile, error: profileError }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("profiles").select("id,first_name,last_name,phone,description,avatar_url").eq("id", user.id).single(),
    supabase.from("tutor_settings").select("tutor_id,timezone,default_lesson_duration,default_lesson_price,working_day_start,working_day_end,working_weekdays,lesson_reminders_enabled,reminder_minutes_before,preferred_payment_method,payment_instructions,currency,monthly_income_goal,appearance_mode").single(),
  ]);
  if (profileError) throw profileError;
  if (settingsError) throw settingsError;
  return {
    profile: { id: profile.id, firstName: profile.first_name, lastName: profile.last_name, email: user.email ?? "", phone: profile.phone ?? "", description: profile.description ?? "", avatarUrl: profile.avatar_url },
    settings: toSettings(settings as SettingsRow),
  };
}

export async function updateProfile(input: Omit<AccountProfile, "id" | "avatarUrl">): Promise<void> {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Сессия не найдена.");
  const { error } = await supabase.from("profiles").update({ first_name: input.firstName.trim(), last_name: input.lastName.trim(), phone: emptyToNull(input.phone), description: emptyToNull(input.description) }).eq("id", user.id);
  if (error) throw error;
  const tutorName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  const { error: tutorError } = await supabase.from("tutors").update({ name: tutorName, email: input.email.trim() }).eq("user_id", user.id);
  if (tutorError) throw tutorError;
  if (input.email.trim() && input.email.trim() !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: input.email.trim() });
    if (emailError) throw emailError;
  }
}

export async function updateTutorSettings(input: TutorSettings): Promise<void> {
  const { error } = await createClient().from("tutor_settings").update({ timezone: input.timezone, default_lesson_duration: input.defaultLessonDuration, default_lesson_price: input.defaultLessonPrice, working_day_start: input.workingDayStart, working_day_end: input.workingDayEnd, working_weekdays: input.workingWeekdays, lesson_reminders_enabled: input.remindersEnabled, reminder_minutes_before: input.reminderMinutesBefore, preferred_payment_method: emptyToNull(input.preferredPaymentMethod), payment_instructions: emptyToNull(input.paymentInstructions), currency: input.currency, monthly_income_goal: input.monthlyIncomeGoal, appearance_mode: input.appearanceMode }).eq("tutor_id", input.tutorId);
  if (error) throw error;
}

export async function uploadAvatar(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Файл должен быть не больше 5 МБ.");
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) throw new Error("Используйте JPG, PNG или WebP.");
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Сессия не найдена.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/avatar.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) throw error;
  return avatarUrl;
}

export async function changePassword(password: string): Promise<void> { const { error } = await createClient().auth.updateUser({ password }); if (error) throw error; }

export async function getTutorTimezone(): Promise<string> {
  const { data, error } = await createClient().from("tutor_settings").select("timezone").single();
  if (error) throw error;
  return data.timezone;
}

function toSettings(row: SettingsRow): TutorSettings { return { tutorId: row.tutor_id, timezone: row.timezone, defaultLessonDuration: row.default_lesson_duration, defaultLessonPrice: row.default_lesson_price === null ? null : Number(row.default_lesson_price), workingDayStart: row.working_day_start.slice(0, 5), workingDayEnd: row.working_day_end.slice(0, 5), workingWeekdays: row.working_weekdays, remindersEnabled: row.lesson_reminders_enabled, reminderMinutesBefore: row.reminder_minutes_before, preferredPaymentMethod: row.preferred_payment_method ?? "", paymentInstructions: row.payment_instructions ?? "", currency: row.currency, monthlyIncomeGoal: row.monthly_income_goal === null ? null : Number(row.monthly_income_goal), appearanceMode: row.appearance_mode }; }
function emptyToNull(value?: string | null) { const normalized = value?.trim() ?? ""; return normalized || null; }
