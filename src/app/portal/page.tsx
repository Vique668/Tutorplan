"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "../../../lib/supabase/client";

export default function PortalPage() {
  const router = useRouter();
  async function logout() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }
  return <AuthShell eyebrow="БЕЗОПАСНЫЙ ДОСТУП" title="Личный кабинет готовится" description="Аккаунт ученика или родителя не показывает рабочий кабинет репетитора и данные других учеников."><div className="auth-message auth-message-success"><ShieldCheck size={17} /> Роль аккаунта распознана. Доступ к связанным данным будет открыт только после приглашения репетитора.</div><button className="auth-submit" onClick={() => void logout()}><LogOut size={18} />Выйти</button></AuthShell>;
}
