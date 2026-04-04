# LyricEngine — Workstreams

**Last updated:** 2026-04-03 (session 9)

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

- [x] Word input — now a single large blue Playfair italic input (merged with result title)
- [x] Ghost tagline before first search ("a word / is a door")
- [x] "rhymes & sound matches" subtitle fades in below input after first search
- [x] Fetch rhymes on submit — via `/api/rhymes`, cache-first, grouped by syllable count
- [x] Display results grouped by syllable count (staggered animation, indented under headers)
- [x] Collapsible groups (animated height transition)
- [x] Right-click context menu (glassmorphic, 5 groups, colored dots)
- [x] Explore / Explore (new tab) actions — both fully wired (new tab activates in WS4)
- [x] Inline expansion panel (blue left-border, real API results, animated in)
- [x] Loading states: "listening..." (italic Playfair)
- [x] Recursive right-click on expanded words
- [x] Words with active expansion get subtle blue underline
- [x] Inline error message for usage limit (soft red, below input)
- [ ] Long-press bottom sheet (mobile) — stubbed, not built (low priority)

## WS4: Tab System
**Status:** Complete

- [x] `Tab` interface with full per-tab state isolation (query, submittedWord, results, loading, errorMessage, expansions, collapsedGroups)
- [x] `tabs: Tab[]` + `activeTabId` replace individual state vars in LyricEngineApp
- [x] `updateTab(id, updater)` functional helper for all tab state mutations
- [x] Tab bar UI in sticky header
  - Italic font, active blue underline accent
  - × close button (hover only, visible when 2+ tabs)
  - + new tab button
  - Tab name updates to searched word on each submission
- [x] `addTab` — creates empty tab, activates it
- [x] `closeTab` — activates adjacent tab; last tab cannot be closed
- [x] Context menu closes on tab switch
- [x] "Explore (new tab)" fully enabled in ContextMenu (was stubbed)
  - Creates new tab, pre-sets submittedWord + loading, fires search immediately
  - Deduplication: activates existing tab if that word is already open

## WS5: Graph Visualization
**Status:** Not Started

- [ ] react-force-graph integration (2D mode)
- [ ] 3D mode toggle
- [ ] Cytoscape.js radial layout
- [ ] Cytoscape.js tree layout
- [ ] Viz mode switcher per tab

## WS6: Workspaces & Sharing
**Status:** Not Started

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
