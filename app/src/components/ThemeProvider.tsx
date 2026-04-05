"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { themes, getThemeById, applyThemeToDocument, type Theme } from "@/lib/themes";

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
  themes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "le-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getThemeById("midnight"));

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const restored = getThemeById(saved);
      if (restored.id !== theme.id) setTheme(restored);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(STORAGE_KEY, theme.id);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    setTheme(getThemeById(id));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
