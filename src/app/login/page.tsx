"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "../../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "callback") {
      setError("Ссылка входа недействительна или устарела. Запросите новую.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Введите email и пароль.");
      return;
    }
    setIsSubmitting(true);
    const { error: authError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(getAuthErrorMessage(authError));
      setIsSubmitting(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next?.startsWith("/") ? next : "/calendar");
    router.refresh();
  }

  return (
    <AuthShell eyebrow="КАБИНЕТ РЕПЕТИТОРА" title="С возвращением" description="Войдите, чтобы открыть своё расписание и учеников." footer={<>Нет аккаунта? <Link href="/register">Зарегистрироваться</Link></>}>
      <form className="auth-form" onSubmit={submit}>
        {error && <AuthMessage>{error}</AuthMessage>}
        <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.ru" /></label>
        <label><span>Пароль</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <Link className="auth-forgot" href="/forgot-password">Забыли пароль?</Link>
        <button className="auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle size={18} className="spin" /> : <LogIn size={18} />}{isSubmitting ? "Входим…" : "Войти"}</button>
      </form>
    </AuthShell>
  );
}
