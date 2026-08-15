"use client";

import { useState } from "react";
import { Bell, CalendarClock, Check, ChevronRight, CircleUserRound, CreditCard, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useTheme } from "@/components/theme/theme-provider";
import { getThemeLabel, themeOptions, type ThemeMode } from "@/lib/themes";

const sections = [
  { icon: CircleUserRound, title: "Профиль", text: "Имя, контакты и информация о вас", active: true },
  { icon: CalendarClock, title: "Расписание", text: "Рабочие часы и длительность уроков" },
  { icon: Bell, title: "Уведомления", text: "Напоминания и способы связи" },
  { icon: CreditCard, title: "Оплата", text: "Тарифы и способы оплаты" },
  { icon: Palette, title: "Оформление", text: "Тема и внешний вид кабинета" },
  { icon: ShieldCheck, title: "Безопасность", text: "Пароль и активные устройства" },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [reminders, setReminders] = useState(true);
  const { mode, activeTheme, setMode } = useTheme();

  return (
    <div className="page-stack">
      <PageHeader title="Настройки" description="Настройте TutorPlan под свой рабочий процесс" />
      <div className="settings-layout">
        <Card className="settings-nav">
          {sections.map((section) => { const Icon=section.icon; return <button className={section.active ? "active" : ""} key={section.title}><span><Icon size={19} /></span><div><strong>{section.title}</strong><small>{section.text}</small></div><ChevronRight size={17} /></button>; })}
        </Card>
        <div className="settings-content">
          <Card className="profile-settings">
            <div className="settings-card-title"><div><h2>Личная информация</h2><p>Основные данные вашего профиля</p></div></div>
            <div className="avatar-edit"><Avatar initials="АМ" color="peach" size="lg" /><div><Button variant="secondary">Изменить фото</Button><small>JPG или PNG, не более 5 МБ</small></div></div>
            <div className="form-grid">
              <label><span>Имя</span><input defaultValue="Анна" /></label>
              <label><span>Фамилия</span><input defaultValue="Морозова" /></label>
              <label><span>Электронная почта</span><input type="email" defaultValue="anna@tutorplan.ru" /></label>
              <label><span>Телефон</span><input defaultValue="+7 916 234-56-78" /></label>
              <label className="form-full"><span>О себе</span><textarea defaultValue="Репетитор по математике и физике. Готовлю к ОГЭ и ЕГЭ." rows={3} /></label>
            </div>
          </Card>
          <Card className="theme-settings-card">
            <div className="settings-card-title">
              <div><h2>Сезонная тема</h2><p>Цвета и фон меняются, не затрагивая расположение элементов</p></div>
              <span className="theme-settings-icon"><Sparkles size={19} /></span>
            </div>
            <div className="theme-selector-row">
              <div className="theme-preview" aria-hidden="true">
                <span /><span /><span />
              </div>
              <div className="theme-selector-copy">
                <strong>Оформление интерфейса</strong>
                <small>{mode === "auto" ? `Сейчас выбрано: ${getThemeLabel(activeTheme)}` : "Выбранная тема сохранена в этом браузере"}</small>
              </div>
              <label className="theme-select-label">
                <span className="sr-only">Выберите сезонную тему</span>
                <select value={mode} onChange={(event) => setMode(event.target.value as ThemeMode)}>
                  {themeOptions.map((theme) => <option value={theme.value} key={theme.value}>{theme.label}</option>)}
                </select>
              </label>
            </div>
          </Card>
          <Card className="preferences-card">
            <div className="settings-card-title"><div><h2>Рабочие настройки</h2><p>Будут использоваться при создании новых занятий</p></div></div>
            <div className="preference-row"><div><strong>Часовой пояс</strong><small>Время в расписании и уведомлениях</small></div><select defaultValue="moscow"><option value="moscow">Москва · UTC+3</option></select></div>
            <div className="preference-row"><div><strong>Напоминания об уроках</strong><small>За 1 час до начала занятия</small></div><button role="switch" aria-checked={reminders} className={`toggle ${reminders ? "toggle-on" : ""}`} onClick={()=>setReminders(!reminders)}><span /></button></div>
          </Card>
          <div className="settings-save"><span>{saved && <><Check size={17} /> Изменения сохранены</>}</span><Button onClick={()=>setSaved(true)}>Сохранить изменения</Button></div>
        </div>
      </div>
    </div>
  );
}
