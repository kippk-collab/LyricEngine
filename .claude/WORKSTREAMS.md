# LyricEngine — Workstreams

**Last updated:** 2026-04-04 (session 11)

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

## WS3: Core UI — List View
**Status:** Complete

- [x] Word input — single large blue Playfair italic input (merged with result title)
- [x] Ghost tagline before first search ("a word / is a door")
- [x] "rhymes & sound matches" subtitle fades in below input after first search
- [x] Fetch rhymes on submit — via `/api/rhymes`, cache-first, grouped by syllable count
- [x] Display results grouped by syllable count (staggered animation, indented under headers)
- [x] Collapsible groups (animated height transition)
- [x] Right-click context menu (glassmorphic, 5 groups, colored dots)
- [x] Right-click on search input (triggers context menu for the searched word)
- [x] Explore / Explore (new tab) actions — both fully wired
- [x] Inline expansion panel (blue left-border, real API results, animated in)
- [x] Expansion panels for searched word (multiple panels above syllable results, one per relation picked)
- [x] Stacking InlineExpansion drill-down (right-click word inside panel → new child panel below; unlimited depth; multiple children per panel)
- [x] Loading states: "listening..." (italic Playfair)
- [x] Recursive right-click on expanded words
- [x] Words with active expansion/children get subtle blue underline
- [x] Inline error message for usage limit (soft red, below input)
- [ ] Long-press bottom sheet (mobile) — stubbed, not built (low priority)

## WS4: Tab System
**Status:** Complete

- [x] `Tab` interface with full per-tab state isolation (query, submittedWord, customName, results, loading, errorMessage, expansions, collapsedGroups)
- [x] `tabs: Tab[]` + `activeTabId` replace individual state vars in LyricEngineApp
- [x] `updateTab(id, updater)` functional helper for all tab state mutations
- [x] `getTabDisplayName(tab, allTabs)` — computes display: `word`, `word [label]`, or `word [2]` for unnamed dupes
- [x] Tab bar UI in sticky header
  - Italic font, active blue underline accent
  - × close button (hover only, visible when 2+ tabs)
  - + new tab button
  - Double-click tab name to rename (edits `customName` label only; word always leads)
  - Tooltip: "Double click to add a label"
- [x] `addTab` — creates empty tab, activates it
- [x] `closeTab` — activates adjacent tab; last tab cannot be closed
- [x] Context menu closes on tab switch
- [x] "Explore (new tab)" always opens fresh tab — no deduplication
  - Duplicate words auto-numbered: `love`, `love [1]`, `love [2]`
- [x] Workspace auto-save decided — will be implemented in WS6

## WS5: Graph Visualization
**Status:** Not Started

- [ ] react-force-graph integration (2D mode)
- [ ] 3D mode toggle
- [ ] Cytoscape.js radial layout
- [ ] Cytoscape.js tree layout
- [ ] Viz mode switcher per tab

## WS6: Workspaces & Sharing
**Status:** Not Started

- [ ] Auto-save tab state to Supabase on change (debounced) — includes customName, query, expansions, collapsedGroups
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
**Status:** Not Started

- [ ] CSS custom properties theming system
- [ ] 6 prebuilt themes: Dracula, Catppuccin Mocha, Nord, Tokyo Night, Solarized, Gruvbox
- [ ] Tier gating (free: default only; basic: 3 themes; pro: all + per-tab override)
- [ ] Theme cascade: tab > workspace > user default

## WS9: Export
**Status:** Not Started

- [ ] Print (CSS @media print — all tiers)
- [ ] CSV export (all tiers)
- [ ] PDF export via html2pdf.js (Basic+)
- [ ] Excel export via SheetJS (Basic+)

## WS10: Admin & Config
**Status:** Not Started

- [ ] Supabase `config` table (key-value, typed) — tier limits, feature flags, etc.
- [ ] Admin page (protected route) — CRUD for config entries
- [ ] Replace env-var tier limits with DB-driven config (read on startup / cache with TTL)
- [ ] Seed default config rows in migration
