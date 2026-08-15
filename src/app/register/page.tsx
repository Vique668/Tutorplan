"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "../../../lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", confirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    if (!firstName || !lastName || !email || !form.password) return setError("Заполните имя, фамилию, email и пароль.");
    if (form.password.length < 6) return setError("Пароль должен содержать не менее 6 символов.");
    if (form.password !== form.confirmation) return setError("Пароли не совпадают.");
    setIsSubmitting(true);
    const { data, error: authError } = await createClient().auth.signUp({
      email,
      password: form.password,
      options: {
        data: { first_name: firstName, last_name: lastName, role: "tutor" },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (authError) {
      setError(getAuthErrorMessage(authError));
      setIsSubmitting(false);
      return;
    }
    if (data.session) {
      router.replace("/calendar");
      router.refresh();
    } else {
      setSuccess("Регистрация завершена. Проверьте почту и подтвердите email.");
      setIsSubmitting(false);
    }
  }

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <AuthShell eyebrow="НОВЫЙ АККАУНТ" title="Начните с TutorPlan" description="Создайте отдельное безопасное пространство для своей практики." footer={<>Уже есть аккаунт? <Link href="/login">Войти</Link></>}>
      <form className="auth-form" onSubmit={submit}>
        {error && <AuthMessage>{error}</AuthMessage>}
        {success && <AuthMessage tone="success">{success}</AuthMessage>}
        <div className="auth-form-grid">
          <label><span>Имя</span><input autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></label>
          <label><span>Фамилия</span><input autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></label>
        </div>
        <label><span>Email</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label><span>Пароль</span><input type="password" autoComplete="new-password" value={form.password} onChange={(event) => update("password", event.target.value)} /></label>
        <label><span>Повторите пароль</span><input type="password" autoComplete="new-password" value={form.confirmation} onChange={(event) => update("confirmation", event.target.value)} /></label>
        <button className="auth-submit" disabled={isSubmitting || Boolean(success)} type="submit">{isSubmitting ? <LoaderCircle size={18} className="spin" /> : <UserPlus size={18} />}{isSubmitting ? "Создаём аккаунт…" : "Зарегистрироваться"}</button>
      </form>
    </AuthShell>
  );
}
