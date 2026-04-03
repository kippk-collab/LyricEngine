# LyricEngine — Workstreams

**Last updated:** 2026-04-03

## WS1: Project Setup
**Status:** Nearly Complete

- [x] Initialize local git repo
- [x] Add .gitignore
- [x] Create GitHub repo (kippk-collab/LyricEngine, public)
- [x] Push first commit to origin/main
- [x] Add CLAUDE.md to project root
- [x] Create vault strategy file (~/Vault/Projects/lyric-engine.md)
- [x] Full architecture spec written (Cowork session)
- [x] UI prototyped in Google Stitch
- [x] Install Frontend Design Skill (`npx skills add anthropics/skills@frontend-design --yes`)
- [ ] Scaffold Next.js project

## WS2: Database & Backend
**Status:** Not Started

- [ ] Create Supabase project
- [ ] Run migrations: `words`, `word_relations`, `word_fetch_log`, `users`, `user_activity`, `workspaces` tables
- [ ] Seed Kipp's user row (tier = 'pro') for MVP
- [ ] Build Datamuse service layer (`getRelations(word, relationType, userId)`)
- [ ] Build cache-first data flow (check fetch_log → return cache OR call API → write cache → log fetch)
- [ ] Build usage metering (increment counter, check limits before API calls)

## WS3: Core UI — List View
**Status:** Not Started

- [ ] Word input + search
- [ ] Fetch rhymes on submit
- [ ] Display results grouped by syllable count (collapsible groups)
- [ ] Clickable expand icons per word (synonyms / antonyms / other relationship types)
- [ ] Inline expansion of relationship results below word
- [ ] Right-click context menu (desktop) with all 15 Datamuse relationship types, grouped + scrollable
- [ ] Long-press bottom sheet (mobile)

## WS4: Tab System
**Status:** Not Started

- [ ] Named tabs (auto-name: `{word} - {YYYYMMDD-HHmmss}`)
- [ ] Tab bar UI
- [ ] Per-tab state isolation

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
