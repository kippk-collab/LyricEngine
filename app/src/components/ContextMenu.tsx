"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const CATEGORY_DOT: Record<string, string> = {
  Sound: "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.55)]",
  Meaning: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
  Association: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.55)]",
  Description: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]",
  Structure: "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.55)]",
};

const RELATION_GROUPS = [
  {
    label: "Sound",
    items: [
      { key: "rel_rhy", label: "Perfect rhymes" },
      { key: "rel_nry", label: "Near rhymes" },
      { key: "rel_hom", label: "Homophones" },
      { key: "rel_cns", label: "Consonant match" },
    ],
  },
  {
    label: "Meaning",
    items: [
      { key: "rel_syn", label: "Synonyms" },
      { key: "rel_ant", label: "Antonyms" },
      { key: "rel_spc", label: "Broader terms" },
      { key: "rel_gen", label: "Narrower terms" },
    ],
  },
  {
    label: "Association",
    items: [
      { key: "rel_trg", label: "Triggers" },
      { key: "rel_bga", label: "Frequent followers" },
      { key: "rel_bgb", label: "Frequent predecessors" },
    ],
  },
  {
    label: "Description",
    items: [
      { key: "rel_jja", label: "Adjectives for this noun" },
      { key: "rel_jjb", label: "Nouns for this adjective" },
    ],
  },
  {
    label: "Structure",
    items: [
      { key: "rel_com", label: "Comprises / made of" },
      { key: "rel_par", label: "Part of" },
    ],
  },
];

interface ContextMenuProps {
  word: string;
  x: number;
  y: number;
  onSelect: (word: string, key: string, label: string) => void;
  onExplore: (word: string) => void;
  onExploreNewTab: (word: string) => void;
  onClose: () => void;
}

export function ContextMenu({ word, x, y, onSelect, onExplore, onExploreNewTab, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Adjust so menu stays on screen
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let nx = x;
    let ny = y;
    if (nx + rect.width > vw - 12) nx = x - rect.width;
    if (ny + rect.height > vh - 12) ny = y - rect.height;
    if (nx < 8) nx = 8;
    if (ny < 8) ny = 8;
    setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 1000 }}
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
      className="glass-menu rounded-lg w-52 max-h-96 overflow-y-auto custom-scrollbar py-1"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Word label */}
      <div className="px-4 pt-2 pb-2 mb-0.5" style={{ borderBottom: "1px solid rgba(72,72,72,0.2)" }}>
        <span className="font-display italic text-sm text-[#acc7fb]">{word}</span>
      </div>

      {/* Explore actions */}
      <div className="mt-1 mb-1" style={{ borderBottom: "1px solid rgba(72,72,72,0.2)" }}>
        <button
          onClick={() => { onExplore(word); onClose(); }}
          className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/5 transition-colors group text-left"
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#acc7fb] shadow-[0_0_8px_rgba(172,199,251,0.55)]" />
          <span className="font-sans text-xs text-[#e7e5e5]/80 group-hover:text-[#e7e5e5] transition-colors">
            Explore
          </span>
        </button>
        <button
          onClick={() => { onExploreNewTab(word); onClose(); }}
          className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/5 transition-colors group text-left"
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#acc7fb] shadow-[0_0_8px_rgba(172,199,251,0.55)]" />
          <span className="font-sans text-xs text-[#e7e5e5]/80 group-hover:text-[#e7e5e5] transition-colors">
            Explore (new tab)
          </span>
        </button>
      </div>

      {RELATION_GROUPS.map((group) => (
        <div key={group.label} className="mt-2 mb-1">
          <p className="font-display italic text-[10px] text-[#bd9952] px-4 py-0.5 uppercase tracking-widest select-none">
            {group.label}
          </p>
          <div>
            {group.items.map((item) => (
              <button
                key={item.key}
                onClick={() => { onSelect(word, item.key, item.label); onClose(); }}
                className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/5 transition-colors group text-left"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CATEGORY_DOT[group.label]}`} />
                <span className="font-sans text-xs text-[#acabaa] group-hover:text-[#e7e5e5] transition-colors">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
