"use client";

import { FormEvent, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "../../../lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Пароль должен содержать не менее 6 символов.");
    if (password !== confirmation) return setError("Пароли не совпадают.");
    setIsSubmitting(true);
    const { error: authError } = await createClient().auth.updateUser({ password });
    if (authError) {
      setError(getAuthErrorMessage(authError));
      setIsSubmitting(false);
      return;
    }
    router.replace("/calendar");
    router.refresh();
  }
  return (
    <AuthShell eyebrow="БЕЗОПАСНОСТЬ" title="Новый пароль" description="Придумайте новый пароль для аккаунта TutorPlan.">
      <form className="auth-form" onSubmit={submit}>
        {error && <AuthMessage>{error}</AuthMessage>}
        <label><span>Новый пароль</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label><span>Повторите пароль</span><input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
        <button className="auth-submit" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle size={18} className="spin" /> : <KeyRound size={18} />}{isSubmitting ? "Сохраняем…" : "Сохранить пароль"}</button>
      </form>
    </AuthShell>
  );
}
