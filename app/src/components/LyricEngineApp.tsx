"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContextMenu } from "./ContextMenu";
import { InlineExpansion } from "./InlineExpansion";
import { WordGraph } from "./WordGraph";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { BackgroundAnimation } from "./BackgroundAnimation";
import type { SyllableGroup, RhymeResult } from "@/lib/wordService";
import { buildColorMap, pillBackground } from "@/lib/pillColors";

class UsageLimitReachedError extends Error {
  constructor() {
    super('usage_limit_reached');
    this.name = 'UsageLimitReachedError';
  }
}

async function getRhymes(word: string): Promise<RhymeResult> {
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
type GraphLayout = 'force' | 'radial' | 'edge-bundle';

interface Tab {
  id: string;
  customName: string;  // user-set label; empty = none
  query: string;
  submittedWord: string;
  results: SyllableGroup[];
  slantRhyme: boolean;  // true when results are slant rhymes (contraction proxy)
  loading: boolean;
  errorMessage: string | null;
  expansions: Record<string, Expansion>;
  collapsedGroups: Set<number>;
  vizMode: VizMode;
  graphLayout: GraphLayout;
}

function createTab(query?: string): Tab {
  return {
    id: crypto.randomUUID(),
    customName: '',
    query: query ?? '',
    submittedWord: '',
    results: [],
    slantRhyme: false,
    graphLayout: 'force',
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

// Recursively remove an expansion at a given path.
// panelPath = ["word"] → delete expansions["word"]
// panelPath = ["dove", "pigeon"] → delete expansions["dove"].children["pigeon"]
function removeExpansionAtPath(
  expansions: Record<string, Expansion>,
  panelPath: string[]
): Record<string, Expansion> {
  if (panelPath.length === 0) return expansions;
  if (panelPath.length === 1) {
    const { [panelPath[0]]: _, ...rest } = expansions;
    return rest;
  }
  const [head, ...rest] = panelPath;
  const parent = expansions[head];
  if (!parent || !parent.children) return expansions;
  return {
    ...expansions,
    [head]: { ...parent, children: removeExpansionAtPath(parent.children, rest) },
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
  const inputRef = useRef<HTMLDivElement>(null);
  // Sync contentEditable text with tab state on tab switch and auto-focus
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (el.textContent !== activeTab.query) {
      el.textContent = activeTab.query;
    }
    el.focus();
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [introPlayed, setIntroPlayed] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.25);

  // Graph syllable filter (lifted from WordGraph so pills can render in subtitle bar)
  const [visibleSyllables, setVisibleSyllables] = useState<Set<number>>(new Set([1, 2]));
  const allSyllableCounts = useMemo(
    () => activeTab.results.map(g => g.count).sort((a, b) => a - b),
    [activeTab.results]
  );
  // Reset when word changes
  const prevWord = useRef(activeTab.submittedWord);
  useEffect(() => {
    if (activeTab.submittedWord !== prevWord.current) {
      prevWord.current = activeTab.submittedWord;
      setVisibleSyllables(new Set([1, 2]));
    }
  }, [activeTab.submittedWord]);
  // On graph entry, show only the first syllable group (user toggles the rest)
  const startGraphReveal = useCallback((counts: number[]) => {
    if (counts.length === 0) return;
    setVisibleSyllables(new Set([counts[0]]));
  }, []);
  const toggleSyllable = useCallback((count: number) => {
    setVisibleSyllables(prev => {
      const next = new Set(prev);
      next.has(count) ? next.delete(count) : next.add(count);
      return next;
    });
  }, []);

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
        const { groups, slantRhyme } = await getRhymes(word);
        updateTab(tid, () => ({ results: groups, slantRhyme, loading: false }));
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
      // All picks use word|relationKey so multiple relation types coexist per word.
      // Search-term picks store at top level; panel picks navigate via panelPath as children.
      const storePath = isSearchTerm ? [] : (panelPath ?? []);
      const storeKey = `${word}|${relationKey}`;
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
            expansions: setExpansionAtPath(t.expansions, panelPath ?? [], storeKey, { label, words: [], sourceWord }),
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
      .then(({ groups, slantRhyme }) => updateTab(tabId, () => ({ results: groups, slantRhyme, loading: false })))
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
      .then(({ groups, slantRhyme }) => updateTab(tabId, () => ({ results: groups, slantRhyme, loading: false })))
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

  const handleDismissExpansion = useCallback((panelPath: string[]) => {
    const tabId = activeTabId;
    updateTab(tabId, t => ({
      expansions: removeExpansionAtPath(t.expansions, panelPath),
    }));
  }, [activeTabId, updateTab]);

  // Dismiss an expansion from graph view by cluster label (e.g. "synonyms (meal)")
  const handleGraphDismissExpansion = useCallback((clusterLabel: string) => {
    updateTab(activeTabId, t => {
      // Find the expansion key whose label + sourceWord matches the cluster label
      // Cluster label format: "label (sourceWord)"
      const newExpansions = { ...t.expansions };
      for (const key of Object.keys(newExpansions)) {
        const exp = newExpansions[key];
        const pipeIdx = key.indexOf('|');
        const sourceWord = exp.sourceWord ?? (pipeIdx >= 0 ? key.slice(0, pipeIdx) : key);
        if (`${exp.label} (${sourceWord})` === clusterLabel) {
          delete newExpansions[key];
          break;
        }
      }
      return { expansions: newExpansions };
    });
  }, [activeTabId, updateTab]);

  useEffect(() => {
    const onScroll = () => setContextMenu(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--le-bg)" }}
      onClick={closeContextMenu}
      onContextMenu={(e) => e.preventDefault()}
    >
      <BackgroundAnimation vizMode={activeTab.vizMode} opacity={bgOpacity} />
      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{
          background: `color-mix(in srgb, var(--le-bg) 90%, transparent)`,
          borderBottom: `1px solid color-mix(in srgb, var(--le-border) 12%, transparent)`,
        }}
      >
        <div className="max-w-[720px] mx-auto px-3">
          {/* Brand + Theme Switcher */}
          <div className="pt-4 pb-0 flex items-baseline justify-between">
            <span
              className="font-display italic text-xl tracking-tight"
              style={{ color: `color-mix(in srgb, var(--le-text) 80%, transparent)` }}
            >
              The Midnight Lyricist
            </span>
            <div className="flex items-center gap-3">
              <div className="bg-slider-wrap flex items-center gap-1.5">
                <span
                  className="bg-slider-label font-sans text-[9px] uppercase tracking-wider select-none"
                  style={{ color: "var(--le-text-muted)" }}
                >
                  bg
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(bgOpacity * 100)}
                  onChange={e => setBgOpacity(Number(e.target.value) / 100)}
                  className="bg-slider"
                  title={`Background ${Math.round(bgOpacity * 100)}%`}
                />
                <style>{`
                  .bg-slider-wrap { opacity: 0.35; transition: opacity 0.3s; }
                  .bg-slider-wrap:hover { opacity: 0.75; }
                  .bg-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 64px;
                    height: 2px;
                    background: var(--le-text-muted);
                    border-radius: 2px;
                    outline: none;
                    cursor: pointer;
                  }
                  .bg-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--le-text-muted);
                    cursor: pointer;
                  }
                `}</style>
              </div>
              <ThemeSwitcher />
            </div>
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
                className="group flex items-center gap-1.5 px-3 py-2 cursor-pointer flex-shrink-0 transition-colors duration-200 relative select-none"
                style={{
                  color: tab.id === activeTabId
                    ? "var(--le-accent)"
                    : `color-mix(in srgb, var(--le-text-muted) 40%, transparent)`,
                }}
                onMouseEnter={(e) => {
                  if (tab.id !== activeTabId) e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 75%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  if (tab.id !== activeTabId) e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 40%, transparent)`;
                }}
              >
                {renamingTabId === tab.id ? (
                  <span className="font-sans text-[11px] flex items-baseline gap-0.5 min-w-0">
                    {tab.submittedWord && (
                      <span style={{ color: "var(--le-accent)" }} className="shrink-0">{tab.submittedWord} [</span>
                    )}
                    <input
                      className="bg-transparent outline-none border-none min-w-0 w-[60px]"
                      style={{ fontSize: 'inherit', fontFamily: 'inherit', color: "var(--le-accent)" }}
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
                      <span style={{ color: "var(--le-accent)" }} className="shrink-0">]</span>
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
                  <span
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: `color-mix(in srgb, var(--le-accent) 35%, transparent)` }}
                  />
                )}
              </div>
            ))}
            <button
              onClick={addTab}
              aria-label="New tab"
              className="px-2.5 py-2 font-sans text-sm transition-colors flex-shrink-0"
              style={{ color: `color-mix(in srgb, var(--le-text-muted) 25%, transparent)` }}
              onMouseEnter={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 60%, transparent)`)}
              onMouseLeave={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-text-muted) 25%, transparent)`)}
            >
              +
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[720px] mx-auto px-3 relative z-10">
        {/* Input area */}
        <div className={activeTab.vizMode === 'graph' && activeTab.submittedWord ? 'pt-2 pb-1' : 'pt-5 pb-4'}>
          {/* Ghost tagline - only shown before first search */}
          <AnimatePresence>
            {!activeTab.submittedWord && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 48 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="select-none pointer-events-none overflow-hidden"
              >
                <p
                  className="font-display italic text-[5.5rem] leading-none tracking-tight"
                  style={{ color: `color-mix(in srgb, var(--le-text) 7%, transparent)` }}
                >
                  <motion.span
                    className="inline-block"
                    initial={{ opacity: 0, filter: "blur(18px)", y: 40 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 3.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    a word
                  </motion.span>
                  <br />
                  <motion.span
                    className="inline-block pl-[1in]"
                    initial={{ opacity: 0, filter: "blur(18px)", y: 40 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{ duration: 3.5, ease: [0.16, 1, 0.3, 1], delay: 3.2 }}
                  >
                    is a door
                  </motion.span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combined search input - large blue Playfair, doubles as the result title */}
          <motion.form
            onSubmit={handleSubmit}
            className="mb-2"
            initial={{ opacity: 0, paddingLeft: "2in" }}
            animate={{
              opacity: 1,
              paddingLeft: activeTab.submittedWord ? "0in" : "2in",
            }}
            transition={{
              opacity: { duration: 2, delay: introPlayed ? 0 : 7, ease: "linear" },
              paddingLeft: { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
            }}
            onAnimationComplete={() => {
              // Delay so the sparkle sweep (10.5s + 2.5s = 13s) finishes before the class is removed
              setTimeout(() => setIntroPlayed(true), 4000);
            }}
          >
            <div className={`relative ${!introPlayed && !activeTab.submittedWord ? 'glisten-text' : ''}`}>
              <div
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                onInput={e => {
                  const val = (e.currentTarget.textContent ?? '').replace(/\n/g, '');
                  updateTab(activeTabId, () => ({ query: val }));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                onContextMenu={e => {
                  if (activeTab.submittedWord) {
                    e.preventDefault();
                    handleContextMenu(e as unknown as React.MouseEvent, activeTab.submittedWord, ['__search_term__']);
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
                  document.execCommand('insertText', false, text);
                }}
                className={`w-full bg-transparent italic pb-2 pt-0 pr-8 focus:outline-none transition-all duration-300 ${!introPlayed ? 'caret-intro' : ''} ${!activeTab.query ? 'search-placeholder' : ''}`}
                style={{
                  fontFamily: "var(--font-playfair)",
                  fontSize: activeTab.vizMode === 'graph' && activeTab.submittedWord ? "1.3rem" : "3.5rem",
                  lineHeight: activeTab.vizMode === 'graph' && activeTab.submittedWord ? 1.4 : 1.25,
                  letterSpacing: "-0.02em",
                  border: "none",
                  boxShadow: "none",
                  borderRadius: 0,
                  color: "var(--le-accent)",
                  outline: "none",
                  minHeight: "1em",
                  overflowY: "visible",
                }}
              />
              <style>{`
                .search-placeholder:empty::before {
                  content: "enter a word...";
                  color: color-mix(in srgb, var(--le-text) 60%, transparent);
                  pointer-events: none;
                }
              `}</style>
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-0 bottom-3 transition-colors duration-300"
                style={{ color: `color-mix(in srgb, var(--le-copper) 70%, transparent)` }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--le-copper)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = `color-mix(in srgb, var(--le-copper) 70%, transparent)`)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.form>

          {/* Subtitle + viz toggle - appears once a word has been searched */}
          <AnimatePresence>
            {activeTab.submittedWord && (
              <motion.div
                key={activeTab.submittedWord}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center justify-between ${activeTab.vizMode === 'graph' ? 'mb-1' : 'mb-5'}`}
              >
                {activeTab.vizMode !== 'graph' && (
                  <p
                    className="font-sans text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: `color-mix(in srgb, var(--le-gold) 70%, transparent)` }}
                  >
                    {activeTab.slantRhyme ? 'slant rhymes & near matches' : 'rhymes & sound matches'}
                  </p>
                )}
                {activeTab.vizMode === 'graph' && allSyllableCounts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span
                      className="font-sans text-[10px] uppercase tracking-wider"
                      style={{ color: `color-mix(in srgb, var(--le-text-muted) 35%, transparent)` }}
                    >
                      syllables
                    </span>
                    {allSyllableCounts.map(count => (
                      <button
                        key={count}
                        onClick={() => toggleSyllable(count)}
                        className="font-sans text-[10px] px-2 py-0.5 rounded-sm transition-colors duration-200 hover:brightness-150"
                        style={{
                          color: visibleSyllables.has(count)
                            ? "var(--le-accent)"
                            : `color-mix(in srgb, var(--le-text-muted) 55%, transparent)`,
                          background: visibleSyllables.has(count)
                            ? `color-mix(in srgb, var(--le-accent) 10%, transparent)`
                            : undefined,
                          cursor: 'pointer',
                        }}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                )}
                {activeTab.vizMode === 'graph' && allSyllableCounts.length === 0 && <div />}
                <div className="flex items-center gap-1">
                  {activeTab.vizMode === 'graph' && (
                    <select
                      value={activeTab.graphLayout}
                      onChange={e => updateTab(activeTabId, () => ({ graphLayout: e.target.value as GraphLayout }))}
                      className="font-sans text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm cursor-pointer transition-colors duration-200 hover:brightness-150 mr-2"
                      style={{
                        color: `color-mix(in srgb, var(--le-text-muted) 55%, transparent)`,
                        background: `color-mix(in srgb, var(--le-text-muted) 6%, transparent)`,
                        border: `1px solid color-mix(in srgb, var(--le-text-muted) 12%, transparent)`,
                        outline: 'none',
                      }}
                    >
                      <option value="force">Force</option>
                      <option value="radial">Radial</option>
                      <option value="edge-bundle">Edge Bundle</option>
                    </select>
                  )}
                  {(['list', 'graph'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        if (mode === 'graph' && allSyllableCounts.length > 0) {
                          startGraphReveal(allSyllableCounts);
                        }
                        updateTab(activeTabId, () => ({ vizMode: mode }));
                      }}
                      className="font-sans text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors duration-200 hover:brightness-150"
                      style={{
                        color: activeTab.vizMode === mode
                          ? "var(--le-accent)"
                          : `color-mix(in srgb, var(--le-text-muted) 55%, transparent)`,
                        background: activeTab.vizMode === mode
                          ? `color-mix(in srgb, var(--le-accent) 10%, transparent)`
                          : undefined,
                        cursor: 'pointer',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
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
              className="font-sans text-sm pb-8"
              style={{ color: `color-mix(in srgb, var(--le-error) 70%, transparent)` }}
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
              className="font-display italic text-lg pb-8"
              style={{ color: `color-mix(in srgb, var(--le-text-muted) 40%, transparent)` }}
            >
              listening...
            </motion.p>
          )}
        </AnimatePresence>

        {activeTab.vizMode === 'list' ? (
          <>
            {/* Color map for all top-level expansion panels (keyed by word|relationType) */}
            {(() => {
              const topLevelColorMap = buildColorMap(Object.keys(activeTab.expansions));
              return (
                <>
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
                          onDismiss={handleDismissExpansion}
                          accentVar={topLevelColorMap[k]}
                        />
                      ))
                    }
                  </AnimatePresence>

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
                            topLevelColorMap={topLevelColorMap}
                            onContextMenu={handleContextMenu}
                            onRelationSelect={handleRelationSelect}
                            onDismissExpansion={handleDismissExpansion}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              );
            })()}
          </>
        ) : null}
      </main>

      {/* Graph - full width, outside the max-w container */}
      {activeTab.vizMode === 'graph' && activeTab.submittedWord && (
        <div className="relative z-10">
          <WordGraph
            submittedWord={activeTab.submittedWord}
            results={activeTab.results}
            expansions={activeTab.expansions}
            visibleSyllables={visibleSyllables}
            graphLayout={activeTab.graphLayout}
            onContextMenu={handleContextMenu}
            onDismissExpansion={handleGraphDismissExpansion}
          />
        </div>
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
  topLevelColorMap: Record<string, string>;
  onContextMenu: (e: React.MouseEvent, word: string, panelPath?: string[]) => void;
  onRelationSelect: (word: string, key: string, label: string) => void;
  onDismissExpansion: (panelPath: string[]) => void;
}

function SyllableSection({
  group,
  groupIdx,
  isCollapsed,
  onToggle,
  expansions,
  topLevelColorMap,
  onContextMenu,
  onRelationSelect,
  onDismissExpansion,
}: SyllableSectionProps) {
  const activeExpansions = group.words.filter((w) =>
    Object.keys(expansions).some(k => k.startsWith(w + '|'))
  );

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
        style={{ borderBottom: `1px solid color-mix(in srgb, var(--le-border) 18%, transparent)` }}
      >
        <span
          className="font-display italic text-xl transition-colors duration-300"
          style={{ color: `color-mix(in srgb, var(--le-text) 80%, transparent)` }}
        >
          {group.count} {group.count === 1 ? "syllable" : "syllables"}
        </span>
        <span
          className="font-sans text-[10px] uppercase tracking-widest"
          style={{ color: `color-mix(in srgb, var(--le-text-muted) 35%, transparent)` }}
        >
          {group.words.length}
        </span>
        <span
          className="ml-auto font-sans text-xs transition-colors duration-300"
          style={{ color: `color-mix(in srgb, var(--le-lavender) 50%, transparent)` }}
        >
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
            className="overflow-hidden pl-2"
          >
            {/* Word cloud */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 items-baseline">
              {group.words.map((word, wordIdx) => {
                const wordColors = Object.keys(expansions)
                  .filter(k => k.startsWith(word + '|'))
                  .map(k => topLevelColorMap[k]);
                return (
                  <WordChip
                    key={word}
                    word={word}
                    delay={groupIdx * 0.05 + wordIdx * 0.025}
                    chipColors={wordColors}
                    onContextMenu={onContextMenu}
                  />
                );
              })}
            </div>

            {/* Expansion panels */}
            <AnimatePresence>
              {activeExpansions.flatMap((word) =>
                Object.entries(expansions)
                  .filter(([k]) => k.startsWith(word + '|'))
                  .map(([k, exp]) => (
                    <InlineExpansion
                      key={k}
                      word={word}
                      expansion={exp}
                      panelPath={[k]}
                      onContextMenu={onContextMenu}
                      onDismiss={onDismissExpansion}
                      accentVar={topLevelColorMap[k]}
                    />
                  ))
              )}
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
  chipColors?: string[];  // one CSS var name per open top-level panel for this word
  onContextMenu: (e: React.MouseEvent, word: string, panelPath?: string[]) => void;
}

function WordChip({ word, delay = 0, chipColors = [], onContextMenu }: WordChipProps) {
  const hasExpansion = chipColors.length > 0;
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: hasExpansion ? 1 : 0.72 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ opacity: 1 }}
      onContextMenu={(e) => onContextMenu(e, word)}
      className="font-display text-sm cursor-context-menu word-glow select-none transition-all duration-300"
      style={{
        color: hasExpansion
          ? `color-mix(in srgb, var(${chipColors[0]}) 95%, transparent)`
          : "var(--le-text)",
        background: pillBackground(chipColors),
        borderRadius: hasExpansion ? "4px" : undefined,
        padding: hasExpansion ? "1px 6px" : undefined,
      }}
    >
      {word}
    </motion.span>
  );
}
