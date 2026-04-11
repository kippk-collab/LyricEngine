"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buildColorMap, pillBackground } from "@/lib/pillColors";

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;
  children?: Record<string, Expansion>;
}

interface InlineExpansionProps {
  word: string;
  expansion: Expansion;
  panelPath: string[];  // path to this panel; passed as panelPath when words inside are right-clicked
  onContextMenu: (e: React.MouseEvent, word: string, panelPath?: string[]) => void;
  onDismiss?: (panelPath: string[]) => void;
  accentVar?: string;  // CSS var name for this panel's accent color (e.g. "--le-lavender")
}

export function InlineExpansion({ word, expansion, panelPath, onContextMenu, onDismiss, accentVar = '--le-accent' }: InlineExpansionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const childColorMap = useMemo(
    () => buildColorMap(expansion.children ? Object.keys(expansion.children) : []),
    [expansion.children]
  );

  const getWordChildColors = (w: string): string[] => {
    if (!expansion.children) return [];
    return Object.keys(expansion.children)
      .filter(k => k.startsWith(w + '|'))
      .map(k => childColorMap[k]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="mt-4 ml-4 pl-4 py-3 rounded-sm"
      style={{
        borderLeft: `2px solid color-mix(in srgb, var(${accentVar}) 65%, transparent)`,
        background: `color-mix(in srgb, var(${accentVar}) 7%, transparent)`,
      }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="font-sans text-[10px] uppercase tracking-widest select-none flex items-baseline gap-1.5 transition-colors duration-200 group/collapse"
          style={{ color: `color-mix(in srgb, var(--le-gold) 70%, transparent)` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--le-gold)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-gold) 70%, transparent)`)}
        >
          <span
            className="text-[9px] transition-colors duration-200"
            style={{ color: `color-mix(in srgb, var(--le-teal) 60%, transparent)` }}
          >
            {collapsed ? '▸' : '▾'}
          </span>
          {expansion.sourceWord ?? word}{" "}
          <span style={{ color: "var(--le-separator)" }}>·</span>{" "}
          {expansion.label}
          {collapsed && expansion.words.length > 0 && (
            <span style={{ color: `color-mix(in srgb, var(--le-text-muted) 30%, transparent)` }}>
              {expansion.words.length}
            </span>
          )}
        </button>
        {onDismiss && (
          <button
            onClick={() => onDismiss(panelPath)}
            className="font-sans text-[10px] transition-colors duration-200 leading-none px-1"
            style={{ color: `color-mix(in srgb, var(--le-rose) 50%, transparent)` }}
            onMouseEnter={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-rose) 85%, transparent)`)}
            onMouseLeave={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-rose) 50%, transparent)`)}
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              {expansion.loading ? (
                <span
                  className="font-display italic text-[11px]"
                  style={{ color: `color-mix(in srgb, var(--le-text-muted) 35%, transparent)` }}
                >
                  listening...
                </span>
              ) : expansion.words.length === 0 ? (
                <span
                  className="font-display italic text-[11px]"
                  style={{ color: `color-mix(in srgb, var(--le-text-muted) 35%, transparent)` }}
                >
                  no results found
                </span>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                  {expansion.words.map((w) => {
                    const isPhrase = w.includes(' ');
                    if (isPhrase) {
                      return (
                        <span key={w} className="inline-flex gap-x-1 items-baseline">
                          {w.split(/\s+/).map((part, i) => {
                            const childColors = getWordChildColors(part);
                            const hasChildren = childColors.length > 0;
                            return (
                              <span
                                key={`${w}-${i}`}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onContextMenu(e, part, panelPath);
                                }}
                                className="font-display text-[11px] cursor-pointer word-glow select-none transition-all duration-300"
                                style={{
                                  color: hasChildren
                                    ? `color-mix(in srgb, var(${childColors[0]}) 95%, transparent)`
                                    : `color-mix(in srgb, var(--le-text) 70%, transparent)`,
                                  background: pillBackground(childColors),
                                  borderRadius: hasChildren ? "4px" : undefined,
                                  padding: hasChildren ? "1px 6px" : undefined,
                                }}
                              >
                                {part}
                              </span>
                            );
                          })}
                        </span>
                      );
                    }
                    const childColors = getWordChildColors(w);
                    const hasChildren = childColors.length > 0;
                    return (
                      <span
                        key={w}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenu(e, w, panelPath);
                        }}
                        className="font-display text-[11px] cursor-pointer word-glow select-none transition-all duration-300"
                        style={{
                          color: hasChildren
                            ? `color-mix(in srgb, var(${childColors[0]}) 95%, transparent)`
                            : `color-mix(in srgb, var(--le-text) 70%, transparent)`,
                          background: pillBackground(childColors),
                          borderRadius: hasChildren ? "4px" : undefined,
                          padding: hasChildren ? "1px 6px" : undefined,
                        }}
                      >
                        {w}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Child expansion panels - one per word drilled into inside this panel */}
              <AnimatePresence>
                {expansion.children && Object.entries(expansion.children).map(([childKey, childExp]) => (
                  <InlineExpansion
                    key={childKey}
                    word={childKey}
                    expansion={childExp}
                    panelPath={[...panelPath, childKey]}
                    onContextMenu={onContextMenu}
                    onDismiss={onDismiss}
                    accentVar={childColorMap[childKey]}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
