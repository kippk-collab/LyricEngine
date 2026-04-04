"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
}

export function InlineExpansion({ word, expansion, panelPath, onContextMenu, onDismiss }: InlineExpansionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="mt-4 ml-4 pl-4 py-3 rounded-sm"
      style={{ borderLeft: "1px solid rgba(172, 199, 251, 0.18)", background: "rgba(172, 199, 251, 0.025)" }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="font-sans text-[10px] uppercase tracking-widest text-[#bd9952]/70 select-none flex items-baseline gap-1.5 hover:text-[#bd9952] transition-colors duration-200 group/collapse"
        >
          <span className="text-[#6ea8a0]/60 group-hover/collapse:text-[#6ea8a0]/90 transition-colors duration-200 text-[9px]">{collapsed ? '▸' : '▾'}</span>
          {expansion.sourceWord ?? word}{" "}
          <span className="text-[#484848]">·</span>{" "}
          {expansion.label}
          {collapsed && expansion.words.length > 0 && (
            <span className="text-[#acabaa]/30">{expansion.words.length}</span>
          )}
        </button>
        {onDismiss && (
          <button
            onClick={() => onDismiss(panelPath)}
            className="font-sans text-[10px] text-[#b8697a]/50 hover:text-[#b8697a]/85 transition-colors duration-200 leading-none px-1"
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
                <span className="font-display italic text-[#acabaa]/35 text-[11px]">
                  listening...
                </span>
              ) : expansion.words.length === 0 ? (
                <span className="font-display italic text-[#acabaa]/35 text-[11px]">
                  no results found
                </span>
              ) : (
                <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                  {expansion.words.map((w) => (
                    <span
                      key={w}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onContextMenu(e, w, panelPath);
                      }}
                      className={`font-display text-[11px] text-[#e7e5e5]/70 cursor-pointer word-glow hover:text-[#e7e5e5]/95 select-none transition-all duration-300 ${
                        expansion.children?.[w] ? "border-b border-[#acc7fb]/30 pb-0.5" : ""
                      }`}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              )}

              {/* Child expansion panels — one per word drilled into inside this panel */}
              <AnimatePresence>
                {expansion.children && Object.entries(expansion.children).map(([childWord, childExp]) => (
                  <InlineExpansion
                    key={childWord}
                    word={childWord}
                    expansion={childExp}
                    panelPath={[...panelPath, childWord]}
                    onContextMenu={onContextMenu}
                    onDismiss={onDismiss}
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
