export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "Не удалось выполнить операцию";

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Неверный email или пароль.";
  if (normalized.includes("email not confirmed")) return "Подтвердите email по ссылке из письма.";
  if (normalized.includes("user already registered")) return "Пользователь с таким email уже зарегистрирован.";
  if (normalized.includes("password should be")) return "Пароль должен содержать не менее 6 символов.";
  if (normalized.includes("rate limit")) return "Слишком много попыток. Попробуйте немного позже.";
  if (normalized.includes("fetch")) return "Не удалось связаться с Supabase. Проверьте подключение.";
  return message;
}
