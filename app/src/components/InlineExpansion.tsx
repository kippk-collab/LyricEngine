"use client";

import { motion } from "framer-motion";

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;
}

interface InlineExpansionProps {
  word: string;
  expansion: Expansion;
  onContextMenu: (e: React.MouseEvent, word: string, panelKey?: string) => void;
}

export function InlineExpansion({ word, expansion, onContextMenu }: InlineExpansionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="mt-6 ml-4 pl-5 py-4"
      style={{ borderLeft: "1px solid rgba(172, 199, 251, 0.18)" }}
    >
      <p className="font-sans text-[10px] uppercase tracking-widest text-[#bd9952]/70 mb-3 select-none">
        {expansion.sourceWord ?? word}{" "}
        <span className="text-[#484848]">·</span>{" "}
        {expansion.label}
      </p>

      {expansion.loading ? (
        <span className="font-display italic text-[#acabaa]/35 text-sm">
          listening...
        </span>
      ) : expansion.words.length === 0 ? (
        <span className="font-display italic text-[#acabaa]/35 text-sm">
          no results found
        </span>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-baseline">
          {expansion.words.map((w) => (
            <span
              key={w}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(e, w, word);
              }}
              className="font-display text-sm text-[#e7e5e5]/65 cursor-pointer word-glow hover:text-[#e7e5e5]/95 select-none transition-all duration-300"
            >
              {w}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
