# LyricEngine — Status

**Last updated:** 2026-04-04 (session 11)
**Branch:** main
**Last commit:** c9831f7 — Stacking InlineExpansion (pushed)
**origin/main:** c9831f7 — fully in sync, nothing local-only

## Current State
WS1–WS4 complete. Session 11 finished the InlineExpansion drill-down system — replaced the single-panel replacement model with full recursive stacking. All expansion behavior (word chips, search term, words inside panels) now supports multiple simultaneous child panels. WS5 (graph viz) is next.

## What Was Done (2026-04-04, Session 11)

### Stacking InlineExpansion (replaces 5ac4c55 drill-down)
The prior local-only commit (5ac4c55) replaced a panel's content on drill-down. That approach was scrapped in favor of proper stacking:

**Data model:**
- `Expansion` interface gains `children?: Record<string, Expansion>` — a sub-map keyed by the word right-clicked inside this panel
- `panelKey?: string` in `ContextMenuState` replaced by `panelPath?: string[]` — a path array like `["dove"]` or `["dove", "pigeon"]` representing the route from root to the triggering panel
- `setExpansionAtPath(expansions, path, word, newExp)` — recursive helper that navigates the tree and inserts at the right depth

**Behavior:**
- Right-click any word inside a panel → new child panel appears below, keyed by that word
- Multiple words in the same panel can each have their own open child panel simultaneously
- Unlimited nesting depth
- Words with open child panels get the blue underline indicator (same as top-level)
- `InlineExpansion` is now recursive — renders `expansion.children` entries as nested `InlineExpansion` panels after its word list

**Search-term stacking:**
- Right-clicking the big blue search input now supports multiple panels too
- Each relation picked for the searched word stores at `expansions["love|rel_syn"]` (using `word|relationKey` as key) so synonyms, antonyms, etc. coexist as separate panels above the syllable results
- The sentinel `panelPath = ['__search_term__']` is passed when the search input fires `handleContextMenu`; `handleRelationSelect` detects this to use the `word|relationKey` key scheme

**Cosmetic polish (same commit):**
- Main top padding: `pt-12` → `pt-5`
- Expansion panel spacing: `mt-6 py-4 pl-5` → `mt-4 py-3 pl-4`
- Expansion word font: `text-sm` (14px) → `text-[11px]`, opacity `/55` → `/70` (bumped up from initial `/55` after user feedback), hover `/85` → `/95`
- Gap between words in panels: `gap-x-4 gap-y-1.5` → `gap-x-3 gap-y-1`
- Subtle background added to panels: `rgba(172, 199, 251, 0.025)` with `rounded-sm`
- "listening..." and "no results" text in panels also scaled to `text-[11px]`

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
- **Tab customName:** user-set label only; searched word always leads in display
- **Tab dedup removed:** always open new tab; auto-number duplicates as `word [1]`, `word [2]`
- **Rename UX:** double-click to edit inline; tooltip "Double click to add a label"
- **Workspace auto-save:** tab state (including customName) will be auto-saved to Supabase in WS6
- **Expansion stacking model:** unlimited depth, multiple children per panel, no replacement
- **Search-term expansion key scheme:** `word|relationKey` (pipe separator) so multiple picks coexist; pipe never appears in English words so no collision with word-chip keys
- **panelPath sentinel:** `['__search_term__']` signals search-input origin in handleRelationSelect
- **Expansion panel style:** 11px font, subtle blue-tinted bg `rgba(172,199,251,0.025)`, nested panels layer on top of parent bg naturally
- **Loading copy:** "listening..." in italic Playfair — consistent for both main rhyme fetch and expansion fetches
- **Service layer is server-side** (API routes) so logs go to the server, not the browser
- **Logging format:** JSON Lines (`app/logs/YYYY-MM-DD.log`), daily rotation, swappable transports
- **Dev user UUID:** `00000000-0000-0000-0000-000000000001` in `.env.local` — swap to real auth.uid() in WS7
- **ensureWord uses select-then-insert** (not upsert) — upsert triggers UPDATE which RLS blocks
- **Usage metering is non-atomic** (read-then-write) for MVP; TODO(WS7) to replace with Postgres RPC for atomic increment when multi-user auth lands
- **Upgrade modal deferred to WS7** — inline error message used now; full modal makes more sense once auth exists

## What's Next (in order)
1. **Graph visualization (WS5)** — react-force-graph 2D first, then 3D + Cytoscape layouts
2. **Workspaces + sharing (WS6)** — auto-save tab state to Supabase (debounced), workspace save/load, share tokens, read-only shared view
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
- `app/src/components/InlineExpansion.tsx` — recursive inline relation expansion panel
- `supabase/migrations/001_initial_schema.sql` — full DB schema + RLS + seed
- `app/.env.local` — Supabase URL + anon key + DEV_USER_ID (gitignored, backed up to OneDrive)
