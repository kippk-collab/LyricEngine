"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setThemeId, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-wider transition-colors duration-200"
        style={{ color: `color-mix(in srgb, var(--le-text-muted) 50%, transparent)` }}
        onMouseEnter={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 80%, transparent)`)}
        onMouseLeave={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 50%, transparent)`)}
        aria-label="Switch theme"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: theme.colors.accent }}
        />
        {theme.name}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 rounded-lg py-1 z-50 min-w-[160px]"
            style={{
              background: `color-mix(in srgb, var(--le-surface) 95%, transparent)`,
              backdropFilter: "blur(16px)",
              border: `1px solid color-mix(in srgb, var(--le-border) 30%, transparent)`,
              boxShadow: "0 12px 40px -8px rgba(0,0,0,0.6)",
            }}
          >
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setThemeId(t.id); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-colors duration-150"
                style={{
                  background: t.id === theme.id ? `color-mix(in srgb, var(--le-accent) 8%, transparent)` : undefined,
                }}
                onMouseEnter={(e) => {
                  if (t.id !== theme.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (t.id !== theme.id) e.currentTarget.style.background = "";
                }}
              >
                {/* Color swatches */}
                <span className="flex gap-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: t.colors.bg, border: `1px solid ${t.colors.border}` }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: t.colors.accent }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: t.colors.gold }} />
                </span>
                <span
                  className="font-sans text-[11px]"
                  style={{ color: t.id === theme.id ? "var(--le-accent)" : "var(--le-text-muted)" }}
                >
                  {t.name}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
