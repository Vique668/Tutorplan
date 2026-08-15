"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "../../../lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Введите email.");
    setIsSubmitting(true);
    const { error: authError } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    if (authError) setError(getAuthErrorMessage(authError));
    else setSent(true);
    setIsSubmitting(false);
  }
  return (
    <AuthShell eyebrow="ВОССТАНОВЛЕНИЕ" title="Сброс пароля" description="Отправим безопасную ссылку для создания нового пароля." footer={<Link href="/login">Вернуться ко входу</Link>}>
      <form className="auth-form" onSubmit={submit}>
        {error && <AuthMessage>{error}</AuthMessage>}
        {sent && <AuthMessage tone="success">Письмо отправлено. Проверьте входящие и папку «Спам».</AuthMessage>}
        <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="auth-submit" disabled={isSubmitting || sent} type="submit">{isSubmitting ? <LoaderCircle size={18} className="spin" /> : <Mail size={18} />}{isSubmitting ? "Отправляем…" : "Отправить ссылку"}</button>
      </form>
    </AuthShell>
  );
}
