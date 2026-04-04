# LyricEngine — Status

**Last updated:** 2026-04-03 (session 9)
**Branch:** main
**Last commit:** b772cb3 — UI polish (tighten spacing, merge input/title, match expansion font)

## Current State
Next.js app fully wired to real Datamuse API with Supabase cache layer. WS1, WS2, WS3, and WS4 are all complete. Tab system is live — named tabs, per-tab state isolation, "Explore (new tab)" wired and active. UI has been significantly polished this session.

## What Was Done (2026-04-03, Session 9)

### WS4: Tab System (rebuilt from scratch — lost to context limit in a prior session)
- Extracted all per-tab state into `Tab` interface: `id`, `name`, `query`, `submittedWord`, `results`, `loading`, `errorMessage`, `expansions`, `collapsedGroups`
- `LyricEngineApp` now holds `tabs: Tab[]` + `activeTabId` (contextMenu stays top-level)
- `updateTab(id, updater)` helper handles all functional tab state updates
- Tab bar in sticky header: italic Playfair tab names, active blue underline accent, × close button (hover, 2+ tabs only), + new tab button
- Tab auto-names to searched word on first/each submission
- `handleExploreNewTab`: creates new tab with `loading: true` + `submittedWord` pre-set, fires search immediately
- Deduplication: "Explore (new tab)" on a word that already has an open tab activates that tab instead of duplicating
- `closeTab`: activates adjacent tab (next, fallback prev); last tab cannot be closed
- Context menu closes on tab switch
- Enabled "Explore (new tab)" in `ContextMenu` (was disabled/stubbed) — added `onExploreNewTab` prop

**Files modified:**
- `app/src/components/LyricEngineApp.tsx` — full restructure
- `app/src/components/ContextMenu.tsx` — added `onExploreNewTab` prop, enabled button

### UI Polish
- **Merged redundant input + h2**: The large blue Playfair `h2` (submittedWord) and small italic input were saying the same thing. Collapsed into a single large blue Playfair input (`font-size: 3.5rem`) that is always editable. Subtitle "rhymes & sound matches" fades in below it once a word is searched.
- **Tightened spacing** (two passes):
  - Groups: `space-y-16` → `space-y-6`
  - Word chip gaps: `gap-x-9 gap-y-4` → `gap-x-4 gap-y-1.5`
  - Syllable header margin: `mb-7 pb-3` → `mb-3 pb-1`
  - Input area padding: `pt-16 pb-12` → `pt-12 pb-4`
  - Subtitle margin: `mb-9` → `mb-5`
- **Syllable headers**: `text-2xl` → `text-xl` (two passes down, one back up — landed at `text-xl`)
- **Word chips**: `text-xl` → `text-sm`
- **Results indented**: `pl-4` added to content wrapper inside `SyllableSection`
- **Margins**: `px-8` → `px-4` (shrunk across two passes)
- **InlineExpansion**: expanded words matched to main chip size (`text-sm`, `gap-x-4 gap-y-1.5`); loading/empty state also `text-sm`

## Key Decisions
- **Stack:** Next.js + Tailwind + shadcn/ui + Framer Motion + Supabase
- **App lives in `app/` subdirectory** (not repo root - name collision on scaffold)
- **Dev port: 4000** (3000 taken by another project)
- **Viz:** react-force-graph (2D/3D/VR) + Cytoscape.js (radial/tree)
- **API:** Datamuse (free, no key). Always include `md=s` for syllable counts. Fetch on-demand only.
- **Cache:** Supabase progressive cache. Global shared cache. Cache hits are free.
- **Auth:** Supabase Auth, OAuth only (Google + Apple). Encapsulated `AuthService` interface.
- **Product name:** TBD. Frontrunners: Wordverse, WordDrift, Wordy.
- **Git repo name stays:** `lyric-engine` regardless of final product name.
- **Tab deduplication:** "Explore (new tab)" activates existing tab if `submittedWord` matches — no duplicate tabs for the same word.
- **Tab state:** `contextMenu` is top-level (not per-tab); all word data state is per-tab.
- **Merged input/title:** Single large blue Playfair input replaces redundant h2 + small input. Always editable.
- **Loading copy:** "listening..." in italic Playfair — consistent for both main rhyme fetch and expansion fetches
- **Service layer is server-side** (API routes) so logs go to the server, not the browser
- **Logging format:** JSON Lines (`app/logs/YYYY-MM-DD.log`), daily rotation, swappable transports
- **Dev user UUID:** `00000000-0000-0000-0000-000000000001` in `.env.local` — swap to real auth.uid() in WS7
- **ensureWord uses select-then-insert** (not upsert) — upsert triggers UPDATE which RLS blocks
- **Usage metering is non-atomic** (read-then-write) for MVP; TODO(WS7) to replace with Postgres RPC for atomic increment when multi-user auth lands
- **Upgrade modal deferred to WS7** — inline error message used now; full modal makes more sense once auth exists

## What's Next (in order)
1. **Graph visualization (WS5)** — react-force-graph 2D, then 3D + Cytoscape layouts
2. **Workspaces + sharing (WS6)**
3. **Auth + subscriptions (WS7)** — Supabase Auth, real `auth.uid()`, tighten RLS, atomic usage increment, upgrade modal
4. **Theming (WS8)** — 6 prebuilt themes, tier-gated
5. **Export (WS9)**

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
Logs: `app/logs/YYYY-MM-DD.log`

## Key Files
- `app/src/lib/wordService.ts` — cache-first service layer + usage metering
- `app/src/lib/datamuse.ts` — Datamuse API wrapper
- `app/src/lib/supabase.ts` — Supabase client + TypeScript types
- `app/src/lib/logger.ts` — console + daily file logger
- `app/src/app/api/rhymes/route.ts` — GET /api/rhymes?word=
- `app/src/app/api/relations/route.ts` — GET /api/relations?word=&type=
- `app/src/components/LyricEngineApp.tsx` — main UI component (tabs + all state)
- `app/src/components/ContextMenu.tsx` — right-click menu
- `app/src/components/InlineExpansion.tsx` — inline relation expansion panel
- `supabase/migrations/001_initial_schema.sql` — full DB schema + RLS + seed
- `app/.env.local` — Supabase URL + anon key + DEV_USER_ID (gitignored, backed up to OneDrive)
