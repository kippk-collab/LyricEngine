# LyricEngine - Workstreams

**Last updated:** 2026-04-11 (session 20)

## WS1: Project Setup
**Status:** Complete

- [x] Initialize local git repo
- [x] Add .gitignore
- [x] Create GitHub repo (kippk-collab/LyricEngine, public)
- [x] Push first commit
- [x] Add CLAUDE.md to project root
- [x] Create vault strategy file
- [x] Full architecture spec written (Cowork session)
- [x] UI prototyped in Google Stitch
- [x] Install Frontend Design Skill globally
- [x] Scaffold Next.js project (Next.js 16 + Tailwind v4 + shadcn/ui + Framer Motion, in `app/` subdir)

## WS2: Database & Backend
**Status:** Complete

- [x] Datamuse service layer (`app/src/lib/datamuse.ts`) - now with contraction fallback and RhymeResult type
- [x] Supabase project + migrations + seed
- [x] Cache-first service layer (`app/src/lib/wordService.ts`)
- [x] Server-side API routes (`/api/rhymes`, `/api/relations`)
- [x] JSON Lines logger
- [x] Usage metering + tier limits in env vars
- [x] STANDS4 Phrases API integration + dedup + English-only filter + word-boundary + HTML entity decoding
- [x] RLS DELETE policies (cache clearing via anon key works)
- [x] Relation results sorted by syllable count
- [x] Contraction rhyme fallback (vowel-matched proxy map in datamuse.ts)
- [x] slantRhyme flag threaded through API path

## WS3: Core UI - List View
**Status:** Complete

- [x] Word input (contentEditable div with italic Playfair - fixes descender clipping)
- [x] Ghost tagline with staggered intro animation
- [x] Intro animation - tagline blur-materializes, indented, glisten sweep, delayed cursor blink
- [x] "rhymes & sound matches" subtitle (or "slant rhymes & near matches" for contractions)
- [x] Fetch rhymes on submit via /api/rhymes, grouped by syllable count, cache-first
- [x] Display grouped results with staggered animation
- [x] Collapsible groups
- [x] Right-click context menu (glassmorphic, 5 groups, colored dots)
- [x] Right-click on search input
- [x] Explore / Explore (new tab) actions
- [x] Inline expansion panel
- [x] Expansion panels for searched word
- [x] Stacking InlineExpansion drill-down (unlimited depth, multiple children per panel)
- [x] Expansion panel collapse toggle
- [x] Expansion panel dismiss button (x)
- [x] Loading state ("listening...")
- [x] Recursive right-click on expanded words
- [x] Blue underline on words with active expansion
- [x] Inline error for usage limit
- [x] UI control colors (copper/lavender/teal/rose)
- [x] Placeholder brightness fixed at 60%
- [x] Phrase word splitting (individually right-clickable)
- [x] Search input descender clipping fix (contentEditable swap)
- [x] HTML entity decoding in phrases
- [x] Contraction rhyme fallback with "slant rhymes" subtitle
- [x] Drill color system - drilled word pill + matching child panel border (shared 6-color palette)
- [x] Drill color system extended to top-level panels (WordChip multi-stripe pill)
- [ ] Long-press bottom sheet (mobile) - deferred, low priority

## WS4: Tab System
**Status:** Complete

- [x] Tab interface with full per-tab state isolation (now includes slantRhyme + graphLayout)
- [x] tabs: Tab[] + activeTabId
- [x] updateTab functional helper
- [x] getTabDisplayName (word | word [label] | word [2])
- [x] Tab bar UI in sticky header
- [x] addTab / closeTab
- [x] Double-click to rename (customName label)
- [x] "Explore (new tab)" always opens fresh tab, auto-numbered duplicates
- [x] Workspace auto-save decided (WS6)

## WS5: Graph Visualization
**Status:** In Progress (3 layouts working, dismiss popup needs more testing)

- [x] react-force-graph-2d integration
- [x] Viz mode switcher per tab (list/graph toggle)
- [x] Graph data derivation (`buildGraphData` with group field)
- [x] Collapsible cluster nodes
- [x] Cluster labels ("rhyme (N syl)" / "label (word)")
- [x] Cluster pill backgrounds (gold tinted)
- [x] Count badge on collapsed clusters
- [x] Syllable filter pills in subtitle bar
- [x] Auto zoom-to-fit on data/layout change
- [x] Right-click word nodes → context menu (cluster nodes excluded)
- [x] Graph renders full-width outside max-w container
- [x] Cluster click hit area (paintNodeArea)
- [x] Graph layout compaction in graph mode (smaller input, hidden subtitle)
- [x] Expansion overwrite bug fixed (word|relationKey keying)
- [x] Auto-expand first syllable cluster on entry
- [x] Auto-expand newly visible syllable clusters (when pill toggled on)
- [x] Auto-expand newly added expansion clusters (from context menu)
- [x] Graph layout selector (Force / Radial / Edge Bundle)
- [x] Radial layout (dagMode=radialout)
- [x] Edge Bundle layout (quadratic Bezier curves through root)
- [x] Dismiss popup for expansion clusters (right-click → floating Dismiss button)
- [x] Larger hit areas on word nodes for easier right-click (8px padding)
- [x] Hover brightness + cursor pointer on all graph controls
- [x] Word node brightness bump (rhymes 0.95, non-rhyme 0.75)
- [x] Cluster label color — sunlight yellow on dark, amber on light (luminance-branched)
- [x] Label-aware collide force via `forceCollide` + offscreen canvas measurement
- [x] Root node pinned at `fx=0, fy=0`
- [x] Drag-end pins dropped position (`node.fx = node.x`)
- [x] `onEngineStop` re-fits viewport after simulation settles
- [ ] **Test right-click hit detection further** - still occasionally requires multiple clicks
- [ ] Graph positioning polish (verify it's not too low on screen)
- [ ] 3D mode (react-force-graph-3d) - DEFERRED
- [ ] Cytoscape layouts (cluster/arc/chord/circle-pack) - DEFERRED (wonky with our data)

## WS5.5: Background Animation
**Status:** Complete

- [x] Canvas-based BackgroundAnimation
- [x] Sagittarius A* S-star orbits with BH warm amber glow
- [x] Solar system behind graph view
- [x] 3-second crossfade on view mode switch
- [x] Transparent canvas
- [x] Z-index stacking

## WS6: Workspaces & Sharing
**Status:** Not Started

- [ ] Auto-save tab state to Supabase (debounced)
- [ ] Workspace save/load
- [ ] Workspace naming
- [ ] Share token generation
- [ ] Shared read-only view (`/shared/{token}`)
- [ ] "Make this your own" CTA → OAuth signup → workspace copy

## WS7: Auth & Subscriptions
**Status:** Not Started

- [ ] Supabase Auth (Google OAuth)
- [ ] Apple OAuth
- [ ] AuthService abstraction layer
- [ ] Tighten RLS policies
- [ ] Atomic Postgres RPC for usage
- [ ] Upgrade modal
- [ ] Stripe integration (Phase 2)

## WS8: Theming
**Status:** In Progress

- [x] CSS custom properties system
- [x] ThemeProvider with localStorage (SSR-safe)
- [x] ThemeSwitcher component
- [x] 12 themes (7 dark, 5 light)
- [x] Background opacity slider
- [x] Canvas auto-invert for light themes
- [x] Hydration mismatch fix
- [ ] Persist bg opacity to localStorage
- [ ] Tier gating (free/basic/pro theme access)
- [ ] Theme cascade (tab > workspace > user default)

## WS9: Export
**Status:** Not Started

- [ ] Print (CSS @media print)
- [ ] CSV export
- [ ] PDF export (html2pdf.js)
- [ ] Excel export (SheetJS)

## WS10: Admin & Config
**Status:** Not Started

- [ ] Supabase `config` table
- [ ] Admin page (protected route)
- [ ] DB-driven tier limits
- [ ] Seed default config rows
