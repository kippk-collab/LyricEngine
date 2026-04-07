# LyricEngine - Status

**Last updated:** 2026-04-07 (session 16)
**Branch:** main
**Last commit:** 33f5ffd - Add Phrases API integration (idioms & phrases) + placeholder brightness fix (pushed)
**origin/main:** 33f5ffd - fully in sync

## Current State
WS1-WS4 complete. WS5 (graph viz) has collapsible cluster model working - Kipp noticed some graph issues during testing but hasn't specified them yet. WS8 (theming) CSS custom property system built, ThemeProvider working. BackgroundAnimation component with two canvas-based physics simulations: Sagittarius A* S-star orbits (list view) and solar system (graph view). New this session: STANDS4 Phrases API integration for idioms/phrases, placeholder brightness smoothing.

## What Was Done (2026-04-07, Session 16)

### STANDS4 Phrases API Integration
- Created `app/src/lib/phrases.ts` - fetches idioms/phrases from STANDS4 API
- API requires User-Agent header (403 without it)
- API returns `term` field (not `phrase` as docs suggest)
- Results filtered to only include phrases containing the searched word (API returns fuzzy/thematic matches otherwise)
- Routed through existing `wordService.getRelations` - `phrases` type dispatches to Phrases API instead of Datamuse
- Added "Idioms & phrases" to context menu under Association group
- Same cache-first pattern as all Datamuse relations
- API free tier: ~1000 queries/day; cache makes this a non-issue
- Credentials stored in `.env.local` as `PHRASES_API_UID` and `PHRASES_API_TOKEN`

### Placeholder Brightness Fix
- Removed non-functional CSS keyframe animation on `input::placeholder`
- Placeholder now starts at 25% opacity during Framer Motion fade-in, transitions to 60% over 1.5s when `introPlayed` flips true
- Eliminates the jarring brightness pop at end of intro animation

## Known Bugs
- **Graph issues** - Kipp noticed some problems during graph testing but hasn't specified them yet (next session)
- **Search input descender clipping** - italic Playfair at 3.5rem clips bottom of g/y/p/q. Fix: swap to `contentEditable` div (decided, not yet implemented)
- **Usage limit counter not resetting monthly** - `api_uses_this_month` needs manual reset or scheduled job (WS7/WS10)

## Key Decisions
- **Stack:** Next.js + Tailwind + shadcn/ui + Framer Motion + Supabase
- **App lives in `app/` subdirectory** (not repo root - name collision on scaffold)
- **Dev port: 4000** (3000 taken by another project)
- **Viz:** react-force-graph (2D/3D/VR) + Cytoscape.js (radial/tree)
- **API:** Datamuse (free, no key). Always include `md=s` for syllable counts. Fetch on-demand only.
- **Phrases API:** STANDS4 (free, 1000/day). Requires User-Agent header. Returns `term` field. Filtered to word-containing results only.
- **Cache:** Supabase progressive cache. Global shared cache. Cache hits are free.
- **Auth:** Supabase Auth, OAuth only (Google + Apple). Encapsulated `AuthService` interface.
- **Product name:** TBD. Frontrunners: Wordverse, WordDrift, Wordy.
- **Git repo name stays:** `lyric-engine` regardless of final product name.
- **Tab customName:** user-set label only; searched word always leads in display
- **Tab dedup removed:** always open new tab; auto-number duplicates as `word [1]`, `word [2]`
- **Rename UX:** double-click to edit inline; tooltip "Double click to add a label"
- **Workspace auto-save:** tab state (including customName) will be auto-saved to Supabase in WS6
- **Expansion stacking model:** unlimited depth, multiple children per panel, no replacement
- **Search-term expansion key scheme:** `word|relationKey` (pipe separator) so multiple picks coexist
- **panelPath sentinel:** `['__search_term__']` signals search-input origin in handleRelationSelect
- **Expansion panel style:** 11px font, subtle blue-tinted bg, nested panels layer naturally
- **Loading copy:** "listening..." in italic Playfair
- **Service layer is server-side** (API routes) so logs go to the server
- **Logging format:** JSON Lines (`app/logs/YYYY-MM-DD.log`), daily rotation
- **Dev user UUID:** `00000000-0000-0000-0000-000000000001` in `.env.local`
- **ensureWord uses select-then-insert** (not upsert)
- **Usage metering is non-atomic** (read-then-write) for MVP; TODO(WS7) for Postgres RPC
- **Upgrade modal deferred to WS7**
- **Tier limits in env vars** - stepping stone to DB-driven config (WS10)
- **Graph collapsible clusters** - all clusters start collapsed, click to expand
- **Graph cluster labels:** "rhyme (N syl)" for rhymes, "type (word)" for explorations
- **Graph relation labels:** shown under each node (not on link lines)
- **UI control colors:** copper (arrow), lavender (syllable toggle), teal (panel collapse), rose (panel dismiss)
- **Descender fix approach:** swap `<input>` to `contentEditable` div (decided but not yet implemented)
- **Theming:** CSS custom properties (--le-* namespace), ThemeProvider with localStorage, SSR-safe (defer localStorage read to useEffect)
- **Hydration fix pattern:** never read localStorage in useState initializer; always use useEffect for client-only state
- **Background animation:** Sgr A* behind list view (17%, 0.2x speed), solar system behind graph view (7.5%, 0.6x speed), crossfade on switch
- **Background canvas stacking:** zIndex 1, content at z-10, header at z-40, context menu at z-1000
- **Tidal disruption code removed** - replaced by solar system; TDE still available in ~/Vault/lyric-engine-bg-demo.html if needed later

## What's Next (in order)
1. **Graph issues** - Kipp to specify what he noticed; track down and fix
2. **Descender clipping fix** - swap search input to contentEditable div
3. **Graph polish (WS5 continued)** - test collapsible clusters, positioning, then add graph type selector (2D/3D/radial/tree)
4. **WS8 continued** - theme presets (Dracula, Catppuccin, Nord, etc.), ThemeSwitcher UI integration, tier gating
5. **Workspaces + sharing (WS6)**
6. **Auth + subscriptions (WS7)**
7. **Export (WS9)**
8. **Admin & Config (WS10)** - DB-driven tier limits, feature flags, admin page

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
Logs: `app/logs/YYYY-MM-DD.log`

## Key Files
- `app/src/lib/wordService.ts` - cache-first service layer + usage metering
- `app/src/lib/datamuse.ts` - Datamuse API wrapper
- `app/src/lib/phrases.ts` - STANDS4 Phrases API wrapper (idioms & phrases)
- `app/src/lib/graphUtils.ts` - buildGraphData() derives nodes/links from tab state
- `app/src/lib/themes.ts` - theme definitions + applyThemeToDocument()
- `app/src/lib/supabase.ts` - Supabase client + TypeScript types
- `app/src/lib/logger.ts` - console + daily file logger
- `app/src/app/api/rhymes/route.ts` - GET /api/rhymes?word=
- `app/src/app/api/relations/route.ts` - GET /api/relations?word=&type=
- `app/src/components/LyricEngineApp.tsx` - main UI component (tabs + all state)
- `app/src/components/BackgroundAnimation.tsx` - canvas physics animations (Sgr A* + solar system)
- `app/src/components/ContextMenu.tsx` - right-click menu
- `app/src/components/InlineExpansion.tsx` - recursive inline relation expansion panel (with collapse/dismiss)
- `app/src/components/WordGraph.tsx` - 2D force graph visualization (collapsible clusters)
- `app/src/components/ThemeProvider.tsx` - theme context provider (SSR-safe localStorage)
- `app/src/components/ThemeSwitcher.tsx` - theme selection UI component
- `supabase/migrations/001_initial_schema.sql` - full DB schema + RLS + seed
- `app/.env.local` - Supabase URL + anon key + DEV_USER_ID + tier limits + Phrases API creds (gitignored)
