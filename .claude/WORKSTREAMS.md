# LyricEngine — Workstreams

**Last updated:** 2026-04-03

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
**Status:** Partially started (Datamuse service layer built, no Supabase yet)

- [x] Build Datamuse service layer (`app/src/lib/datamuse.ts`)
  - `fetchRhymes(word)` — groups by syllable count, real API
  - `fetchRelations(word, relationType)` — any Datamuse relation key
- [ ] Create Supabase project
- [ ] Run migrations: `words`, `word_relations`, `word_fetch_log`, `users`, `user_activity`, `workspaces` tables
- [ ] Seed Kipp's user row (tier = 'pro') for MVP
- [ ] Build cache-first data flow (check fetch_log → return cache OR call API → write cache → log fetch)
- [ ] Build usage metering (increment counter, check limits before API calls)

## WS3: Core UI — List View
**Status:** Complete (real API, loading states, Explore action)

- [x] Word input (italic Playfair, bottom-bar style, glows blue on focus)
- [x] Ghost tagline before first search ("a word / is a door")
- [x] Submitted word shown large in dusty blue with subtitle
- [x] Fetch rhymes on submit — real Datamuse API, grouped by syllable count
- [x] Display results grouped by syllable count (staggered animation in)
- [x] Collapsible groups (animated height transition)
- [x] Right-click context menu (desktop) — glassmorphic, 5 groups, colored dots
- [x] Explore / Explore (new tab) actions at top of context menu
  - Explore: sets word as new root query, fetches rhymes, clears expansions
  - Explore (new tab): stubbed, dimmed — activates in WS4
- [x] Inline expansion panel (blue left-border, real API results, animated in)
- [x] Loading states: "listening..." (italic Playfair) for both main fetch and expansion fetches
- [x] Expanded words are also right-clickable (recursive)
- [x] Words with active expansion get subtle blue underline
- [ ] Long-press bottom sheet (mobile) — stubbed, not built
- [ ] Wire real rhymes into Supabase cache (depends on WS2)

## WS4: Tab System
**Status:** Not Started

- [ ] Named tabs (auto-name: `{word} - {YYYYMMDD-HHmmss}`)
- [ ] Tab bar UI
- [ ] Per-tab state isolation
- [ ] Activate "Explore (new tab)" in context menu

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
- [ ] Subscription tier enforcement in service layer
- [ ] Upgrade modal on usage limit
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
