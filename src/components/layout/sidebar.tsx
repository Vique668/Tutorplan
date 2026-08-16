"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "../../../lib/supabase/client";

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
  const router = useRouter();
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", avatarUrl: "" });

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || !active) return;
      const { data: loadedProfile } = await supabase
        .from("profiles")
        .select("first_name,last_name,avatar_url")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active) {
        setProfile({
          firstName: loadedProfile?.first_name ?? "",
          lastName: loadedProfile?.last_name ?? "",
          email: data.user.email ?? "",
          avatarUrl: loadedProfile?.avatar_url ?? "",
        });
      }
    };
    const handleProfileUpdated = () => { void loadProfile(); };
    void loadProfile();
    window.addEventListener("tutorplan:profile-updated", handleProfileUpdated);
    return () => {
      active = false;
      window.removeEventListener("tutorplan:profile-updated", handleProfileUpdated);
    };
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email || "Репетитор";
  const initials = `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}` || "ТП";

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
        {profile.avatarUrl ? <img className="sidebar-avatar-image" src={profile.avatarUrl} alt="Фото профиля" /> : <Avatar initials={initials} color="peach" />}
        <div>
          <strong>{fullName}</strong>
          <small>Репетитор</small>
        </div>
        <button className="icon-button" aria-label="Выйти из аккаунта" title="Выйти" onClick={() => void logout()}><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
