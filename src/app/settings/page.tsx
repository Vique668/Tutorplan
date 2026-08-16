"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, Check, ChevronRight, CircleAlert, CircleUserRound, CreditCard, LoaderCircle, LogOut, Palette, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useTheme } from "@/components/theme/theme-provider";
import { getThemeLabel, themeOptions, type ThemeMode } from "@/lib/themes";
import type { AccountProfile, TutorSettings } from "@/types/settings";
import { changePassword, getAccountSettings, updateProfile, updateTutorSettings, uploadAvatar } from "../../../lib/supabase/settings";
import { createClient } from "../../../lib/supabase/client";

type Section = "profile" | "schedule" | "notifications" | "payment" | "appearance" | "security";
const sections = [
  { id: "profile" as const, icon: CircleUserRound, title: "Профиль", text: "Имя, контакты и информация о вас" },
  { id: "schedule" as const, icon: CalendarClock, title: "Расписание", text: "Рабочие часы и параметры уроков" },
  { id: "notifications" as const, icon: Bell, title: "Уведомления", text: "Настройки напоминаний" },
  { id: "payment" as const, icon: CreditCard, title: "Оплата", text: "Реквизиты и способы оплаты" },
  { id: "appearance" as const, icon: Palette, title: "Оформление", text: "Сезонная тема кабинета" },
  { id: "security" as const, icon: ShieldCheck, title: "Безопасность", text: "Пароль и текущий аккаунт" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [section, setSection] = useState<Section>("profile");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [settings, setSettings] = useState<TutorSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const { mode, activeTheme, setMode } = useTheme();

  const load = useCallback(async () => { setIsLoading(true); setError(null); try { const loaded = await getAccountSettings(); setProfile(loaded.profile); setSettings(loaded.settings); setMode(loaded.settings.appearanceMode); } catch (loadError) { setError(getErrorMessage(loadError)); } finally { setIsLoading(false); } }, [setMode]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!profile || !settings) return;
    setError(null); setSaved(false);
    if (!(profile.firstName?.trim() ?? "") || !(profile.lastName?.trim() ?? "")) return setError("Имя и фамилия обязательны.");
    if (settings.workingDayEnd <= settings.workingDayStart) return setError("Конец рабочего дня должен быть позже начала.");
    if (!settings.workingWeekdays.length) return setError("Выберите хотя бы один рабочий день.");
    setIsSaving(true);
    try { await Promise.all([updateProfile({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, phone: profile.phone, description: profile.description }), updateTutorSettings({ ...settings, appearanceMode: mode })]); setSettings((current) => current ? { ...current, appearanceMode: mode } : current); window.dispatchEvent(new Event("tutorplan:profile-updated")); setSaved(true); } catch (saveError) { setError(getErrorMessage(saveError)); } finally { setIsSaving(false); }
  }

  async function avatarChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file || !profile) return; setIsSaving(true); setError(null); try { const avatarUrl = await uploadAvatar(file); setProfile({ ...profile, avatarUrl }); window.dispatchEvent(new Event("tutorplan:profile-updated")); setSaved(true); } catch (avatarError) { setError(getErrorMessage(avatarError)); } finally { setIsSaving(false); event.target.value = ""; } }
  async function savePassword() { setError(null); if (password.length < 6) return setError("Пароль должен содержать не менее 6 символов."); if (password !== passwordConfirmation) return setError("Пароли не совпадают."); setIsSaving(true); try { await changePassword(password); setPassword(""); setPasswordConfirmation(""); setSaved(true); } catch (passwordError) { setError(getErrorMessage(passwordError)); } finally { setIsSaving(false); } }
  async function logout() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }
  function updateSettings<K extends keyof TutorSettings>(key: K, value: TutorSettings[K]) { setSettings((current) => current ? { ...current, [key]: value } : current); setSaved(false); }

  return <div className="page-stack"><PageHeader title="Настройки" description="Настройте TutorPlan под свой рабочий процесс" />
    {isLoading && <Card><div className="students-empty-state"><LoaderCircle className="spin" size={28} /><h2>Загружаем настройки</h2></div></Card>}
    {!isLoading && error && !profile && <Card><div className="students-empty-state" role="alert"><CircleAlert size={28} /><h2>Не удалось загрузить настройки</h2><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Повторить</Button></div></Card>}
    {!isLoading && profile && settings && <div className="settings-layout"><Card className="settings-nav">{sections.map((item) => { const Icon = item.icon; return <button className={section === item.id ? "active" : ""} key={item.id} onClick={() => { setSection(item.id); setError(null); setSaved(false); }}><span><Icon size={19} /></span><div><strong>{item.title}</strong><small>{item.text}</small></div><ChevronRight size={17} /></button>; })}</Card><div className="settings-content">
      {section === "profile" && <Card className="profile-settings"><SettingsTitle title="Личная информация" text="Основные данные вашего профиля" /><div className="avatar-edit">{profile.avatarUrl ? <img className="settings-avatar-image" src={profile.avatarUrl} alt="Фото профиля" /> : <Avatar initials={`${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`} color="peach" size="lg" />}<div><label className="button button-secondary settings-upload-button"><Upload size={15} />Изменить фото<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void avatarChange(event)} disabled={isSaving} /></label><small>JPG, PNG или WebP, не более 5 МБ</small></div></div><div className="form-grid"><label><span>Имя</span><input value={profile.firstName} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></label><label><span>Фамилия</span><input value={profile.lastName} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></label><label><span>Электронная почта</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><label><span>Телефон</span><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label><label className="form-full"><span>О себе</span><textarea rows={3} value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} /></label></div></Card>}
      {section === "schedule" && <Card className="profile-settings"><SettingsTitle title="Рабочее расписание" text="Значения по умолчанию для календаря и уроков" /><div className="form-grid"><label><span>Часовой пояс</span><select value={settings.timezone} onChange={(event) => updateSettings("timezone", event.target.value)}><option value="Europe/Moscow">Москва · Europe/Moscow</option><option value="Europe/Kaliningrad">Калининград · Europe/Kaliningrad</option><option value="Asia/Yekaterinburg">Екатеринбург · Asia/Yekaterinburg</option><option value="Asia/Novosibirsk">Новосибирск · Asia/Novosibirsk</option><option value="Europe/Berlin">Берлин · Europe/Berlin</option></select></label><label><span>Продолжительность по умолчанию</span><input type="number" min="15" step="5" value={settings.defaultLessonDuration} onChange={(event) => updateSettings("defaultLessonDuration", Number(event.target.value))} /></label><label><span>Цена по умолчанию</span><input type="number" min="0" step="1" value={settings.defaultLessonPrice ?? ""} onChange={(event) => updateSettings("defaultLessonPrice", event.target.value ? Number(event.target.value) : null)} /></label><label><span>Начало рабочего дня</span><input type="time" value={settings.workingDayStart} onChange={(event) => updateSettings("workingDayStart", event.target.value)} /></label><label><span>Конец рабочего дня</span><input type="time" value={settings.workingDayEnd} onChange={(event) => updateSettings("workingDayEnd", event.target.value)} /></label><fieldset className="form-full settings-weekdays"><legend>Рабочие дни</legend>{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((label, index) => { const day = index + 1; const checked = settings.workingWeekdays.includes(day); return <button type="button" className={checked ? "active" : ""} key={day} onClick={() => updateSettings("workingWeekdays", checked ? settings.workingWeekdays.filter((item) => item !== day) : [...settings.workingWeekdays, day].sort())}>{label}</button>; })}</fieldset></div></Card>}
      {section === "notifications" && <Card className="preferences-card"><SettingsTitle title="Напоминания" text="Настройки сохраняются; внешняя доставка email/SMS пока не подключена" /><div className="preference-row"><div><strong>Напоминания об уроках</strong><small>Включить подготовку напоминаний</small></div><button role="switch" aria-checked={settings.remindersEnabled} className={`toggle ${settings.remindersEnabled ? "toggle-on" : ""}`} onClick={() => updateSettings("remindersEnabled", !settings.remindersEnabled)}><span /></button></div><div className="preference-row"><div><strong>За сколько минут</strong><small>Интервал до начала занятия</small></div><input type="number" min="0" step="5" value={settings.reminderMinutesBefore} onChange={(event) => updateSettings("reminderMinutesBefore", Number(event.target.value))} /></div><p className="settings-integration-note">Отправка email и SMS потребует отдельного провайдера. TutorPlan сейчас только хранит эти настройки.</p></Card>}
      {section === "payment" && <Card className="profile-settings"><SettingsTitle title="Настройки оплаты" text="Информация для учёта и инструкций ученикам" /><div className="form-grid"><label><span>Валюта</span><select value={settings.currency} disabled><option value="RUB">Российский рубль · RUB</option></select></label><label><span>Предпочтительный способ</span><input value={settings.preferredPaymentMethod} onChange={(event) => updateSettings("preferredPaymentMethod", event.target.value)} placeholder="Перевод по номеру телефона" /></label><label className="form-full"><span>Инструкции по оплате</span><textarea rows={4} value={settings.paymentInstructions} onChange={(event) => updateSettings("paymentInstructions", event.target.value)} placeholder="Необязательно" /></label></div><p className="settings-integration-note">TutorPlan не обрабатывает банковские карты и не списывает деньги автоматически.</p></Card>}
      {section === "appearance" && <Card className="theme-settings-card"><div className="settings-card-title"><div><h2>Сезонная тема</h2><p>Цвета и фон меняются, не затрагивая расположение элементов</p></div><span className="theme-settings-icon"><Sparkles size={19} /></span></div><div className="theme-selector-row"><div className="theme-preview" aria-hidden="true"><span /><span /><span /></div><div className="theme-selector-copy"><strong>Оформление интерфейса</strong><small>{mode === "auto" ? `Сейчас выбрано: ${getThemeLabel(activeTheme)}` : "Выбранная тема сохранится в аккаунте после нажатия кнопки"}</small></div><label className="theme-select-label"><span className="sr-only">Выберите сезонную тему</span><select value={mode} onChange={(event) => { setMode(event.target.value as ThemeMode); setSaved(false); }}>{themeOptions.map((theme) => <option value={theme.value} key={theme.value}>{theme.label}</option>)}</select></label></div></Card>}
      {section === "security" && <><Card className="profile-settings"><SettingsTitle title="Изменить пароль" text={`Текущий аккаунт: ${profile.email}`} /><div className="form-grid"><label><span>Новый пароль</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>Повторите пароль</span><input type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label></div><div className="settings-security-actions"><Button onClick={() => void savePassword()} disabled={isSaving}>Сменить пароль</Button><Button variant="secondary" icon={<LogOut size={16} />} onClick={() => void logout()}>Выйти</Button></div></Card></>}
      {error && <p className="student-form-error" role="alert">{error}</p>}<div className="settings-save"><span>{saved && <><Check size={17} /> Изменения сохранены</>}</span>{section !== "security" && <Button onClick={() => void save()} disabled={isSaving}>{isSaving ? "Сохранение…" : "Сохранить изменения"}</Button>}</div>
    </div></div>}
  </div>;
}

function SettingsTitle({ title, text }: { title: string; text: string }) { return <div className="settings-card-title"><div><h2>{title}</h2><p>{text}</p></div></div>; }
function getErrorMessage(error: unknown) { if (error instanceof Error) return error.message; if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message; return "Неизвестная ошибка Supabase"; }
