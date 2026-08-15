"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  MoreHorizontal,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

const navigation = [
  { href: "/calendar", label: "Календарь", icon: CalendarDays },
  { href: "/schedule", label: "Расписание", icon: CalendarRange },
  { href: "/students", label: "Ученики", icon: GraduationCap },
  { href: "/groups", label: "Группы", icon: Users },
  { href: "/finance", label: "Финансы", icon: CircleDollarSign },
  { href: "/tasks", label: "Задачи", icon: ClipboardCheck },
  { href: "/statistics", label: "Статистика", icon: BarChart3 },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="sidebar-logo">
        <img src="/brand/logo-full.png?v=transparent-1" alt="TutorPlan" width={174} height={58} decoding="async" />
        <button className="icon-button sidebar-close" aria-label="Закрыть меню" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Основная навигация">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
              <Icon size={20} strokeWidth={active ? 2.35 : 1.8} />
              <span>{item.label}</span>
              {active && <span className="nav-active-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-profile">
        <Avatar initials="АМ" color="peach" />
        <div>
          <strong>Анна Морозова</strong>
          <small>Репетитор</small>
        </div>
        <button className="icon-button" aria-label="Меню профиля"><MoreHorizontal size={18} /></button>
      </div>
    </aside>
  );
}
