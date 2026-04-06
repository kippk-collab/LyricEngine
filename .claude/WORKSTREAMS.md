# LyricEngine - Workstreams

**Last updated:** 2026-04-06 (session 15)

## WS1: Project Setup
**Status:** Complete

- [x] Initialize local git repo
- [x] Add .gitignore (+ .DS_Store and *.zip exclusions)
- [x] Create GitHub repo (kippk-collab/LyricEngine, public)
- [x] Push first commit to origin/main
- [x] Add CLAUDE.md to project root
- [x] Create vault strategy file (~/Vault/Projects/lyric-engine.md)
- [x] Full architecture spec written (Cowork session)
- [x] UI prototyped in Google Stitch
- [x] Stitch export committed (UX experiments/stitch 4-3-26/)
- [x] Install Frontend Design Skill globally (`npx skills add anthropics/skills@frontend-design --yes --global`)
- [x] Set git global user.name and user.email
- [x] Scaffold Next.js project (Next.js 16 + Tailwind v4 + shadcn/ui + Framer Motion, in `app/` subdir)
  - Dark mode forced, Playfair Display loaded, port 4000
  - Run: `cd app && npm run dev`

## WS2: Database & Backend
**Status:** Complete

- [x] Build Datamuse service layer (`app/src/lib/datamuse.ts`)
- [x] Create Supabase project (`ycxihwnuooxfbetymntk.supabase.co`)
- [x] Run migrations: `words`, `word_relations`, `word_fetch_log`, `users`, `user_activity`, `workspaces` tables
- [x] Seed Kipp's user row (UUID `00000000-0000-0000-0000-000000000001`, tier = 'pro')
- [x] Build cache-first service layer (`app/src/lib/wordService.ts`)
- [x] Server-side API routes (`GET /api/rhymes`, `GET /api/relations`)
- [x] Structured server-side logger (JSON Lines at `app/logs/YYYY-MM-DD.log`)
- [x] Build usage metering
  - `TIER_LIMITS`: free=20/mo, basic=100/mo, pro=unlimited
  - `checkUsageLimit` / `incrementUsage` (non-atomic MVP, TODO WS7: Postgres RPC)
  - `UsageLimitError` → 429 → inline client error message
- [x] Fix usage limit bug (nullish coalescing on null pro limit fell through to free=20)
- [x] Move tier limits to env vars (`TIER_LIMIT_FREE`, `TIER_LIMIT_BASIC`, `TIER_LIMIT_PRO`)

## WS3: Core UI - List View
**Status:** Complete

- [x] Word input - single large blue Playfair italic input (merged with result title)
- [x] Ghost tagline before first search ("a word / is a door")
- [x] Intro animation - tagline blur-materializes per line, input fades in with glisten sweep
- [x] "rhymes & sound matches" subtitle fades in below input after first search
- [x] Fetch rhymes on submit - via `/api/rhymes`, cache-first, grouped by syllable count
- [x] Display results grouped by syllable count (staggered animation, indented under headers)
- [x] Collapsible groups (animated height transition)
- [x] Right-click context menu (glassmorphic, 5 groups, colored dots)
- [x] Right-click on search input (triggers context menu for the searched word)
- [x] Explore / Explore (new tab) actions - both fully wired
- [x] Inline expansion panel (blue left-border, real API results, animated in)
- [x] Expansion panels for searched word (multiple panels above syllable results, one per relation picked)
- [x] Stacking InlineExpansion drill-down (right-click word inside panel → new child panel below; unlimited depth; multiple children per panel)
- [x] Expansion panel collapse toggle (▸/▾ on header, animated height, data preserved)
- [x] Expansion panel dismiss button (× removes panel and all children)
- [x] Loading states: "listening..." (italic Playfair)
- [x] Recursive right-click on expanded words
- [x] Words with active expansion/children get subtle blue underline
- [x] Inline error message for usage limit (soft red, below input)
- [x] UI control colors: copper arrow, lavender syllable toggle, teal panel collapse, rose panel dismiss
- [ ] Placeholder intro brightness effect - CSS animation not visually effective; needs different approach
- [ ] Long-press bottom sheet (mobile) - stubbed, not built (low priority)
- [ ] Search input descender clipping fix - swap `<input>` to contentEditable div

## WS4: Tab System
**Status:** Complete

- [x] `Tab` interface with full per-tab state isolation (query, submittedWord, customName, results, loading, errorMessage, expansions, collapsedGroups, vizMode)
- [x] `tabs: Tab[]` + `activeTabId` replace individual state vars in LyricEngineApp
- [x] `updateTab(id, updater)` functional helper for all tab state mutations
- [x] `getTabDisplayName(tab, allTabs)` - computes display: `word`, `word [label]`, or `word [2]` for unnamed dupes
- [x] Tab bar UI in sticky header
  - Italic font, active blue underline accent
  - × close button (hover only, visible when 2+ tabs)
  - + new tab button
  - Double-click tab name to rename (edits `customName` label only; word always leads)
  - Tooltip: "Double click to add a label"
- [x] `addTab` - creates empty tab, activates it
- [x] `closeTab` - activates adjacent tab; last tab cannot be closed
- [x] Context menu closes on tab switch
- [x] "Explore (new tab)" always opens fresh tab - no deduplication
  - Duplicate words auto-numbered: `love`, `love [1]`, `love [2]`
- [x] Workspace auto-save decided - will be implemented in WS6

## WS5: Graph Visualization
**Status:** In Progress (collapsible clusters implemented, click hit area fixed, needs testing + graph type selector)

- [x] react-force-graph-2d integration (2D mode)
- [x] Viz mode switcher per tab (list/graph toggle)
- [x] Graph data derivation from expansions + results (`buildGraphData`)
- [x] Collapsible cluster nodes - all start collapsed, click to expand
- [x] Cluster labels: "rhyme (N syl)" for rhymes, "type (word)" for expansions
- [x] Cluster pill backgrounds (gold, brighter when expanded)
- [x] Count badge on collapsed clusters
- [x] Syllable filter pills (default: 1+2 syl; toggle others on/off)
- [x] Auto zoom-to-fit on data change (20px padding)
- [x] Right-click nodes opens context menu (cluster nodes excluded)
- [x] Graph renders full-width outside max-w container
- [x] Cluster click hit area matched to rendered pill size (paintNodeArea fix)
- [ ] Graph type selector UI (2D, 3D, radial, tree)
- [ ] 3D mode (react-force-graph-3d)
- [ ] Cytoscape.js radial layout
- [ ] Cytoscape.js tree layout
- [ ] Graph positioning polish (verify it's not too low on screen)

## WS5.5: Background Animation
**Status:** Complete (initial implementation)

- [x] BackgroundAnimation component (canvas-based, fixed position behind content)
- [x] Sagittarius A* S-star orbits (Keplerian mechanics, 12 stars, trails, BH glow)
- [x] Tidal disruption event (bound orbit, multi-pass stripping, particle stream, EHT-style BH)
- [x] Sgr A* behind list view (17% opacity, 0.2x speed), TDE behind graph view (3% opacity)
- [x] 3-second crossfade on view mode switch
- [x] Transparent canvas (clearRect) - theme colors show through
- [x] Z-index stacking: canvas z-1, content z-10, header z-40, context menu z-1000
- [x] TDE auto-resets when animation completes (all particles consumed or 3 orbits)

## WS6: Workspaces & Sharing
**Status:** Not Started

- [ ] Auto-save tab state to Supabase on change (debounced) - includes customName, query, expansions, collapsedGroups
- [ ] Workspace save/load (JSON state blob in Supabase)
- [ ] Workspace naming
- [ ] Share token generation
- [ ] Shared/frozen read-only view (`/shared/{token}`)
- [ ] "Make this your own" CTA → OAuth signup → workspace copy

## WS7: Auth & Subscriptions
**Status:** Not Started

- [ ] Supabase Auth (Google OAuth)
- [ ] Apple OAuth
- [ ] AuthService abstraction layer
  - Replace hardcoded `DEV_USER_ID` in `.env.local` with real `auth.uid()`
- [ ] Tighten RLS policies (TODO(WS7) markers already in migration)
- [ ] Replace `incrementUsage` with atomic Postgres RPC
- [ ] Upgrade modal on usage limit (replace inline message)
- [ ] Stripe integration (Phase 2)

## WS8: Theming
**Status:** In Progress (CSS variable system built, colors converted, hydration fix applied)

- [x] CSS custom properties theming system (--le-* namespace in globals.css)
- [x] ThemeProvider with localStorage persistence (SSR-safe - defers to useEffect)
- [x] ThemeSwitcher component
- [x] All hardcoded colors converted to CSS variables (ContextMenu, InlineExpansion, LyricEngineApp, WordGraph, globals.css)
- [x] Hydration mismatch fix (never read localStorage in useState initializer)
- [ ] 6 prebuilt themes: Dracula, Catppuccin Mocha, Nord, Tokyo Night, Solarized, Gruvbox
- [ ] ThemeSwitcher integrated into main UI
- [ ] Tier gating (free: default only; basic: 3 themes; pro: all + per-tab override)
- [ ] Theme cascade: tab > workspace > user default

## WS9: Export
**Status:** Not Started

- [ ] Print (CSS @media print - all tiers)
- [ ] CSV export (all tiers)
- [ ] PDF export via html2pdf.js (Basic+)
- [ ] Excel export via SheetJS (Basic+)

## WS10: Admin & Config
**Status:** Not Started

- [ ] Supabase `config` table (key-value, typed) - tier limits, feature flags, etc.
- [ ] Admin page (protected route) - CRUD for config entries
- [ ] Replace env-var tier limits with DB-driven config (read on startup / cache with TTL)
- [ ] Seed default config rows in migration
