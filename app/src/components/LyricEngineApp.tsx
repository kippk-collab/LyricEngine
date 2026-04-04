"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContextMenu } from "./ContextMenu";
import { InlineExpansion } from "./InlineExpansion";
import { WordGraph } from "./WordGraph";
import type { SyllableGroup } from "@/lib/wordService";

class UsageLimitReachedError extends Error {
  constructor() {
    super('usage_limit_reached');
    this.name = 'UsageLimitReachedError';
  }
}

async function getRhymes(word: string): Promise<SyllableGroup[]> {
  const res = await fetch(`/api/rhymes?word=${encodeURIComponent(word)}`);
  if (res.status === 429) throw new UsageLimitReachedError();
  if (!res.ok) throw new Error(`rhymes fetch failed: ${res.status}`);
  return res.json();
}

async function getRelations(word: string, type: string): Promise<string[]> {
  const res = await fetch(`/api/relations?word=${encodeURIComponent(word)}&type=${encodeURIComponent(type)}`);
  if (res.status === 429) throw new UsageLimitReachedError();
  if (!res.ok) throw new Error(`relations fetch failed: ${res.status}`);
  return res.json();
}

// ── Types ────────────────────────────────────────────────────

interface Expansion {
  label: string;
  words: string[];
  loading?: boolean;
  sourceWord?: string;  // the word whose relations are shown (set when triggered from inside a panel)
  children?: Record<string, Expansion>;  // keyed by the word that was right-clicked inside this panel
}

interface ContextMenuState {
  word: string;
  x: number;
  y: number;
  panelPath?: string[];  // path to the panel from which this menu was triggered
}

type VizMode = 'list' | 'graph';

interface Tab {
  id: string;
  customName: string;  // user-set label; empty = none
  query: string;
  submittedWord: string;
  results: SyllableGroup[];
  loading: boolean;
  errorMessage: string | null;
  expansions: Record<string, Expansion>;
  collapsedGroups: Set<number>;
  vizMode: VizMode;
}

function createTab(query?: string): Tab {
  return {
    id: crypto.randomUUID(),
    customName: '',
    query: query ?? '',
    submittedWord: '',
    results: [],
    loading: false,
    errorMessage: null,
    expansions: {},
    collapsedGroups: new Set(),
    vizMode: 'list',
  };
}

// "love", "love [My Poem]", or "love [2]" for unnamed dupes
function getTabDisplayName(tab: Tab, allTabs: Tab[]): string {
  const word = tab.submittedWord;
  if (!word) return tab.customName || 'new tab';
  if (tab.customName) return `${word} [${tab.customName}]`;
  const dupes = allTabs.filter(t => t.submittedWord === word);
  const idx = dupes.findIndex(t => t.id === tab.id);
  return idx > 0 ? `${word} [${idx}]` : word;
}

const USAGE_LIMIT_MSG = "You've reached your monthly limit. Sign in and upgrade to continue.";

// Recursively set an expansion at a given path within the expansions tree.
// path = [] → top-level: expansions[word] = newExp
// path = ["dove"] → expansions["dove"].children[word] = newExp
// path = ["dove","pigeon"] → expansions["dove"].children["pigeon"].children[word] = newExp
function setExpansionAtPath(
  expansions: Record<string, Expansion>,
  path: string[],
  word: string,
  newExp: Expansion
): Record<string, Expansion> {
  if (path.length === 0) return { ...expansions, [word]: newExp };
  const [head, ...rest] = path;
  const parent = expansions[head];
  if (!parent) return expansions;
  return {
    ...expansions,
    [head]: { ...parent, children: setExpansionAtPath(parent.children ?? {}, rest, word, newExp) },
  };
}

// ── Main Component ───────────────────────────────────────────

export function LyricEngineApp() {
  const initialTab = useRef(createTab()).current;
  const [tabs, setTabs] = useState<Tab[]>([initialTab]);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab.id);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];
  const [introPlayed, setIntroPlayed] = useState(false);

  // Functional updater for a specific tab
  const updateTab = useCallback((id: string, updater: (t: Tab) => Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updater(t) } : t));
  }, []);

  const addTab = useCallback(() => {
    const tab = createTab();
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setContextMenu(null);
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length === 1) return prev;
      return prev.filter(t => t.id !== id);
    });
    setActiveTabId(prev => {
      if (prev !== id) return prev;
      const idx = tabs.findIndex(t => t.id === id);
      const remaining = tabs.filter(t => t.id !== id);
      return remaining[Math.min(idx, remaining.length - 1)].id;
    });
  }, [tabs]);

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
    setContextMenu(null);
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const tid = activeTabId;
      const tab = tabs.find(t => t.id === tid);
      if (!tab) return;
      const word = tab.query.trim().toLowerCase();
      if (!word || tab.loading) return;

      updateTab(tid, () => ({
        submittedWord: word,
        results: [],
        expansions: {},
        collapsedGroups: new Set(),
        errorMessage: null,
        loading: true,
      }));
      setContextMenu(null);

      try {
        const groups = await getRhymes(word);
        updateTab(tid, () => ({ results: groups, loading: false }));
      } catch (err) {
        if (err instanceof UsageLimitReachedError) {
          updateTab(tid, () => ({ errorMessage: USAGE_LIMIT_MSG, results: [], loading: false }));
        } else {
          console.error("[LyricEngine] fetchRhymes failed:", err);
          updateTab(tid, () => ({ results: [], loading: false }));
        }
      }
    },
    [activeTabId, tabs, updateTab]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, word: string, panelPath?: string[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ word, x: e.clientX, y: e.clientY, panelPath });
  }, []);

  const handleRelationSelect = useCallback(
    async (word: string, relationKey: string, label: string) => {
      const tabId = activeTabId;
      const panelPath = contextMenu?.panelPath;
      const isSearchTerm = panelPath?.length === 1 && panelPath[0] === '__search_term__';
      // Search-term picks: unique key per relation so all panels coexist.
      // Panel picks: navigate via panelPath to store as a child.
      const storePath = isSearchTerm ? [] : (panelPath ?? []);
      const storeKey = isSearchTerm ? `${word}|${relationKey}` : word;
      const sourceWord = (panelPath && !isSearchTerm) ? word : undefined;

      const applyExp = (t: Tab, exp: Expansion) => ({
        expansions: setExpansionAtPath(t.expansions, storePath, storeKey, exp),
      });

      updateTab(tabId, t => applyExp(t, { label, words: [], loading: true, sourceWord }));
      setContextMenu(null);
      try {
        const words = await getRelations(word, relationKey);
        updateTab(tabId, t => applyExp(t, { label, words, sourceWord }));
      } catch (err) {
        if (err instanceof UsageLimitReachedError) {
          updateTab(tabId, t => ({
            errorMessage: USAGE_LIMIT_MSG,
            expansions: setExpansionAtPath(t.expansions, panelPath ?? [], word, { label, words: [], sourceWord }),
          }));
        } else {
          console.error(`[LyricEngine] fetchRelations "${word}" ${relationKey} failed:`, err);
          updateTab(tabId, t => applyExp(t, { label, words: [], sourceWord }));
        }
      }
    },
    [activeTabId, contextMenu, updateTab]
  );

  const toggleGroup = useCallback((count: number) => {
    const tabId = activeTabId;
    updateTab(tabId, t => {
      const next = new Set(t.collapsedGroups);
      next.has(count) ? next.delete(count) : next.add(count);
      return { collapsedGroups: next };
    });
  }, [activeTabId, updateTab]);

  const handleExplore = useCallback((word: string) => {
    const tabId = activeTabId;
    updateTab(tabId, () => ({
      query: word,
      submittedWord: word,
      results: [],
      expansions: {},
      collapsedGroups: new Set(),
      errorMessage: null,
      loading: true,
    }));
    setContextMenu(null);

    getRhymes(word)
      .then(groups => updateTab(tabId, () => ({ results: groups, loading: false })))
      .catch(err => {
        if (err instanceof UsageLimitReachedError) {
          updateTab(tabId, () => ({ errorMessage: USAGE_LIMIT_MSG, results: [], loading: false }));
        } else {
          console.error("[LyricEngine] fetchRhymes failed:", err);
          updateTab(tabId, () => ({ results: [], loading: false }));
        }
      });
  }, [activeTabId, updateTab]);

  const handleExploreNewTab = useCallback((word: string) => {
    const tab: Tab = { ...createTab(word), loading: true, submittedWord: word };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    setContextMenu(null);

    const tabId = tab.id;
    getRhymes(word)
      .then(groups => updateTab(tabId, () => ({ results: groups, loading: false })))
      .catch(err => {
        if (err instanceof UsageLimitReachedError) {
          updateTab(tabId, () => ({ errorMessage: USAGE_LIMIT_MSG, results: [], loading: false }));
        } else {
          console.error("[LyricEngine] fetchRhymes new tab failed:", err);
          updateTab(tabId, () => ({ results: [], loading: false }));
        }
      });
  }, [updateTab]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const onScroll = () => setContextMenu(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0e0e0e]"
      onClick={closeContextMenu}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-[#0e0e0e]/90 backdrop-blur-md"
        style={{ borderBottom: "1px solid rgba(72,72,72,0.12)" }}
      >
        <div className="max-w-[720px] mx-auto px-4">
          {/* Brand */}
          <div className="pt-4 pb-0">
            <span className="font-display italic text-[#e7e5e5]/80 text-xl tracking-tight">
              The Midnight Lyricist
            </span>
          </div>

          {/* Tab bar */}
          <div
            className="flex items-end mt-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
            onClick={e => e.stopPropagation()}
          >
            {tabs.map(tab => (
              <div
                key={tab.id}
                role="tab"
                aria-selected={tab.id === activeTabId}
                onClick={() => switchTab(tab.id)}
                className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer flex-shrink-0 transition-colors duration-200 relative select-none ${
                  tab.id === activeTabId
                    ? "text-[#acc7fb]"
                    : "text-[#acabaa]/40 hover:text-[#acabaa]/75"
                }`}
              >
                {renamingTabId === tab.id ? (
                  <span className="font-sans text-[11px] flex items-baseline gap-0.5 min-w-0">
                    {tab.submittedWord && (
                      <span className="text-[#acc7fb] shrink-0">{tab.submittedWord} [</span>
                    )}
                    <input
                      className="bg-transparent text-[#acc7fb] outline-none border-none min-w-0 w-[60px]"
                      style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                      value={renameValue}
                      placeholder="label..."
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => {
                        updateTab(tab.id, () => ({ customName: renameValue.trim() }));
                        setRenamingTabId(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.currentTarget.blur(); }
                        else if (e.key === 'Escape') { setRenamingTabId(null); }
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                      ref={el => { if (el) el.select(); }}
                      autoFocus
                    />
                    {tab.submittedWord && (
                      <span className="text-[#acc7fb] shrink-0">]</span>
                    )}
                  </span>
                ) : (
                  <span
                    className="font-sans text-[11px] truncate max-w-[120px]"
                    title="Double click to add a label"
                    onDoubleClick={e => {
                      e.stopPropagation();
                      setRenamingTabId(tab.id);
                      setRenameValue(tab.customName);
                    }}
                  >
                    {getTabDisplayName(tab, tabs)}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    aria-label="Close tab"
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-[11px] leading-none flex-shrink-0 w-3 h-3 flex items-center justify-center"
                  >
                    ×
                  </button>
                )}
                {tab.id === activeTabId && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-[#acc7fb]/35" />
                )}
              </div>
            ))}
            <button
              onClick={addTab}
              aria-label="New tab"
              className="px-2.5 py-2 font-sans text-sm text-[#acabaa]/25 hover:text-[#acabaa]/60 transition-colors flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[720px] mx-auto px-4">
        {/* Input area */}
        <div className="pt-5 pb-4">
          {/* Ghost tagline - only shown before first search */}
          <AnimatePresence>
            {!activeTab.submittedWord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5 }}
                className="mb-12 select-none pointer-events-none"
              >
                <p className="font-display italic text-[5.5rem] leading-none text-[#e7e5e5]/[0.07] tracking-tight">
                  <motion.span
                    className="inline-block"
                    initial={{ opacity: 0, filter: "blur(12px)", y: 30 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 2.5, ease: "easeOut" }}
                  >
                    a word
                  </motion.span>
                  <br />
                  <motion.span
                    className="inline-block"
                    initial={{ opacity: 0, filter: "blur(12px)", y: 30 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 2.5, ease: "easeOut", delay: 0.6 }}
                  >
                    is a door
                  </motion.span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combined search input — large blue Playfair, doubles as the result title */}
          <motion.form
            onSubmit={handleSubmit}
            className="mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: introPlayed ? 0 : 3.8 }}
            onAnimationComplete={() => setIntroPlayed(true)}
          >
            <div className="relative">
              <input
                type="text"
                value={activeTab.query}
                onChange={e => {
                  const val = e.target.value;
                  updateTab(activeTabId, () => ({ query: val }));
                }}
                placeholder="enter a word..."
                autoFocus
                onContextMenu={e => {
                  if (activeTab.submittedWord) {
                    e.preventDefault();
                    handleContextMenu(e, activeTab.submittedWord, ['__search_term__']);
                  }
                }}
                className={`w-full bg-transparent text-[#acc7fb] placeholder:text-[#e7e5e5]/[0.25] italic pb-2 pt-0 pr-8 focus:outline-none transition-colors duration-300 ${!introPlayed && !activeTab.submittedWord ? 'glisten-text' : ''}`}
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: "3.5rem",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  border: "none",
                  boxShadow: "none",
                  borderRadius: 0,
                }}
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 bottom-3 text-[#acabaa]/30 hover:text-[#acc7fb] transition-colors duration-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.form>

          {/* Subtitle + viz toggle — appears once a word has been searched */}
          <AnimatePresence>
            {activeTab.submittedWord && (
              <motion.div
                key={activeTab.submittedWord}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between mb-5"
              >
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-[#bd9952]/70">
                  rhymes &amp; sound matches
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => updateTab(activeTabId, () => ({ vizMode: 'list' as const }))}
                    className={`font-sans text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors duration-200 ${
                      activeTab.vizMode === 'list'
                        ? 'text-[#acc7fb] bg-[#acc7fb]/10'
                        : 'text-[#acabaa]/35 hover:text-[#acabaa]/60'
                    }`}
                  >
                    list
                  </button>
                  <button
                    onClick={() => updateTab(activeTabId, () => ({ vizMode: 'graph' as const }))}
                    className={`font-sans text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors duration-200 ${
                      activeTab.vizMode === 'graph'
                        ? 'text-[#acc7fb] bg-[#acc7fb]/10'
                        : 'text-[#acabaa]/35 hover:text-[#acabaa]/60'
                    }`}
                  >
                    graph
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {activeTab.errorMessage && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-sans text-sm text-[#f87171]/70 pb-8"
            >
              {activeTab.errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Loading state */}
        <AnimatePresence>
          {activeTab.loading && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display italic text-[#acabaa]/40 text-lg pb-8"
            >
              listening...
            </motion.p>
          )}
        </AnimatePresence>

        {activeTab.vizMode === 'list' ? (
          <>
            {/* Expansions from right-clicking the search term — one panel per relation picked */}
            <AnimatePresence>
              {activeTab.submittedWord && Object.entries(activeTab.expansions)
                .filter(([k]) => k.startsWith(activeTab.submittedWord + '|'))
                .map(([k, exp]) => (
                  <InlineExpansion
                    key={k}
                    word={activeTab.submittedWord}
                    expansion={exp}
                    panelPath={[k]}
                    onContextMenu={handleContextMenu}
                  />
                ))
              }
            </AnimatePresence>

            {/* Syllable Results */}
            <AnimatePresence mode="wait">
              {activeTab.results.length > 0 && (
                <motion.div
                  key={`${activeTab.id}-${activeTab.submittedWord}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pb-32 space-y-6"
                >
                  {activeTab.results.map((group, idx) => (
                    <SyllableSection
                      key={group.count}
                      group={group}
                      groupIdx={idx}
                      isCollapsed={activeTab.collapsedGroups.has(group.count)}
                      onToggle={() => toggleGroup(group.count)}
                      expansions={activeTab.expansions}
                      onContextMenu={handleContextMenu}
                      onRelationSelect={handleRelationSelect}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : null}
      </main>

      {/* Graph — full width, outside the max-w container */}
      {activeTab.vizMode === 'graph' && activeTab.submittedWord && (
        <WordGraph
          submittedWord={activeTab.submittedWord}
          results={activeTab.results}
          expansions={activeTab.expansions}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            word={contextMenu.word}
            x={contextMenu.x}
            y={contextMenu.y}
            onSelect={handleRelationSelect}
            onExplore={handleExplore}
            onExploreNewTab={handleExploreNewTab}
            onClose={closeContextMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Syllable Section ─────────────────────────────────────────

interface SyllableSectionProps {
  group: SyllableGroup;
  groupIdx: number;
  isCollapsed: boolean;
  onToggle: () => void;
  expansions: Record<string, Expansion>;
  onContextMenu: (e: React.MouseEvent, word: string, panelPath?: string[]) => void;
  onRelationSelect: (word: string, key: string, label: string) => void;
}

function SyllableSection({
  group,
  groupIdx,
  isCollapsed,
  onToggle,
  expansions,
  onContextMenu,
  onRelationSelect,
}: SyllableSectionProps) {
  const activeExpansions = group.words.filter((w) => expansions[w]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: groupIdx * 0.1,
        duration: 0.45,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-baseline gap-4 mb-3 pb-1 text-left group transition-all duration-300"
        style={{ borderBottom: "1px solid rgba(72,72,72,0.18)" }}
      >
        <span className="font-display italic text-xl text-[#e7e5e5]/80 group-hover:text-[#e7e5e5] transition-colors duration-300">
          {group.count} {group.count === 1 ? "syllable" : "syllables"}
        </span>
        <span className="font-sans text-[10px] uppercase tracking-widest text-[#acabaa]/35">
          {group.words.length}
        </span>
        <span className="ml-auto font-sans text-xs text-[#acabaa]/20 group-hover:text-[#acabaa]/45 transition-colors duration-300">
          {isCollapsed ? "▸" : "▾"}
        </span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden pl-4"
          >
            {/* Word cloud */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-baseline">
              {group.words.map((word, wordIdx) => (
                <WordChip
                  key={word}
                  word={word}
                  delay={groupIdx * 0.05 + wordIdx * 0.025}
                  hasExpansion={!!expansions[word]}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>

            {/* Expansion panels */}
            <AnimatePresence>
              {activeExpansions.map((word) => (
                <InlineExpansion
                  key={word}
                  word={word}
                  expansion={expansions[word]}
                  panelPath={[word]}
                  onContextMenu={onContextMenu}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ── Word Chip ────────────────────────────────────────────────

interface WordChipProps {
  word: string;
  delay?: number;
  hasExpansion?: boolean;
  onContextMenu: (e: React.MouseEvent, word: string, panelPath?: string[]) => void;
}

function WordChip({ word, delay = 0, hasExpansion, onContextMenu }: WordChipProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: hasExpansion ? 1 : 0.72 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ opacity: 1 }}
      onContextMenu={(e) => onContextMenu(e, word)}
      className={`font-display text-sm text-[#e7e5e5] cursor-context-menu word-glow select-none transition-all duration-300 ${
        hasExpansion ? "border-b border-[#acc7fb]/30 pb-0.5" : ""
      }`}
    >
      {word}
    </motion.span>
  );
}
