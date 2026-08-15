"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAutomaticTheme, isThemeMode, THEME_STORAGE_KEY, type ThemeId, type ThemeMode } from "@/lib/themes";

type ThemeContextValue = {
  mode: ThemeMode;
  activeTheme: ThemeId;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("late-summer");
  const [ready, setReady] = useState(false);

  const applyTheme = useCallback((nextMode: ThemeMode) => {
    const resolved = nextMode === "auto" ? getAutomaticTheme() : nextMode;
    document.documentElement.dataset.theme = resolved;
    setActiveTheme(resolved);
  }, []);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialMode = isThemeMode(storedMode) ? storedMode : "auto";
    setModeState(initialMode);
    applyTheme(initialMode);
    setReady(true);
  }, [applyTheme]);

  useEffect(() => {
    if (!ready || mode !== "auto") return;

    const refreshAutomaticTheme = () => applyTheme("auto");
    const timer = window.setInterval(refreshAutomaticTheme, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [applyTheme, mode, ready]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    applyTheme(nextMode);
  }, [applyTheme]);

  const value = useMemo(() => ({ mode, activeTheme, setMode }), [activeTheme, mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme должен использоваться внутри ThemeProvider");
  return context;
}
