export const themeOptions = [
  { value: "auto", label: "Автоматически" },
  { value: "late-summer", label: "Позднее лето" },
  { value: "summer-autumn", label: "Лето → осень" },
  { value: "golden-autumn", label: "Золотая осень" },
  { value: "late-autumn", label: "Поздняя осень" },
  { value: "autumn-winter", label: "Осень → зима" },
  { value: "winter", label: "Зима" },
  { value: "winter-spring", label: "Зима → весна" },
  { value: "spring", label: "Весна" },
  { value: "spring-summer", label: "Весна → лето" },
  { value: "summer", label: "Лето" },
] as const;

export type ThemeMode = (typeof themeOptions)[number]["value"];
export type ThemeId = Exclude<ThemeMode, "auto">;

export const THEME_STORAGE_KEY = "tutorplan-theme";

export function isThemeMode(value: string | null): value is ThemeMode {
  return themeOptions.some((theme) => theme.value === value);
}

export function getAutomaticTheme(date = new Date()): ThemeId {
  const month = date.getMonth();
  const day = date.getDate();

  if (month === 0 || (month === 1 && day <= 15) || (month === 11 && day > 15)) return "winter";
  if ((month === 1 && day > 15) || (month === 2 && day <= 15)) return "winter-spring";
  if ((month === 2 && day > 15) || month === 3) return "spring";
  if (month === 4) return "spring-summer";
  if (month === 5 || month === 6) return "summer";
  if (month === 7) return "late-summer";
  if (month === 8 && day <= 15) return "summer-autumn";
  if ((month === 8 && day > 15) || (month === 9 && day <= 15)) return "golden-autumn";
  if ((month === 9 && day > 15) || (month === 10 && day <= 15)) return "late-autumn";
  return "autumn-winter";
}

export function getThemeLabel(theme: ThemeId) {
  return themeOptions.find((option) => option.value === theme)?.label ?? theme;
}
