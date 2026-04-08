# LyricEngine - Status

**Last updated:** 2026-04-07 (session 16)
**Branch:** main
**Last commit:** 5472993 - Light themes, background opacity slider, canvas invert for light mode, phrases dedup (pushed)
**origin/main:** 5472993 - fully in sync

## Current State
WS1-WS4 complete. WS5 (graph viz) has collapsible cluster model working but has a known expansion overwrite bug. WS8 (theming) has CSS custom property system, ThemeProvider, 7 dark themes + 5 light themes, background opacity slider. BackgroundAnimation auto-inverts on light themes. STANDS4 Phrases API integrated for idioms.

## What Was Done (2026-04-07, Session 16)

### STANDS4 Phrases API Integration
- Created `app/src/lib/phrases.ts` - fetches idioms/phrases from STANDS4 API
- API requires User-Agent header (403 without it)
- API returns `term` field (not `phrase` as docs suggest)
- Results filtered to only include phrases containing the searched word
- Results deduplicated (API returns duplicates that cause React key warnings)
- Routed through existing `wordService.getRelations` - `phrases` type dispatches to Phrases API instead of Datamuse
- Added "Idioms & phrases" to context menu under Association group
- Same cache-first pattern as all Datamuse relations
- Credentials in `.env.local` as `PHRASES_API_UID` and `PHRASES_API_TOKEN`

### Placeholder Brightness Fix
- Removed non-functional CSS keyframe animation on `input::placeholder`
- Placeholder starts at 25% opacity during Framer Motion fade-in, transitions to 60% over 1.5s when `introPlayed` flips true

### 5 Light Themes
- Solarized Light, Morning Fog, Botanical, Peach Sky, Ocean Breeze
- All use lighter bg/surface colors with appropriate text contrast

### Background Opacity Slider
- Slider in header (left of theme switcher), always visible
- Range: 0% (invisible) to 100% (full brightness)
- Default: 25%
- Slider directly sets canvas globalAlpha (replaces hardcoded SGR_OPACITY/SOLAR_OPACITY)
- Subtle appearance: track + thumb at 35% opacity, brightens to 75% on hover
- "BG" label appears on hover

### Canvas Invert for Light Themes
- Detects light/dark via luminance check on theme bg color (threshold 140)
- Light themes get `filter: invert(1) hue-rotate(180deg)` on the canvas element
- Stars and trails render as dark on light backgrounds - looks great

### Sgr A* Opacity
- Base constant bumped from 17% to 27% (largely superseded by slider control now)

## Known Bugs
- **Graph expansion overwrite** - picking a second relation type on the same word in graph view overwrites the first expansion instead of keeping both. Fix: use pipe-separator key scheme (`word|relationKey`) like search-term expansions.
- **Search input descender clipping** - italic Playfair at 3.5rem clips bottom of g/y/p/q. Fix: swap to `contentEditable` div (decided, not yet implemented)
- **Usage limit counter not resetting monthly** - `api_uses_this_month` needs manual reset or scheduled job (WS7/WS10)

## Key Decisions
- **Stack:** Next.js + Tailwind + shadcn/ui + Framer Motion + Supabase
- **App lives in `app/` subdirectory** (not repo root - name collision on scaffold)
- **Dev port: 4000** (3000 taken by another project)
- **Viz:** react-force-graph (2D/3D/VR) + Cytoscape.js (radial/tree)
- **API:** Datamuse (free, no key). Always include `md=s` for syllable counts. Fetch on-demand only.
- **Phrases API:** STANDS4 (free, 1000/day). Requires User-Agent header. Returns `term` field. Filtered to word-containing results, deduplicated.
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
- **Background animation:** Sgr A* behind list view, solar system behind graph view, crossfade on switch
- **Background opacity:** slider-controlled (0-100%), default 25%, stored as component state (localStorage persistence deferred)
- **Background canvas stacking:** zIndex 1, content at z-10, header at z-40, context menu at z-1000
- **Light theme canvas invert:** `filter: invert(1) hue-rotate(180deg)` when bg luminance > 140
- **Tidal disruption code removed** - replaced by solar system; TDE still available in ~/Vault/lyric-engine-bg-demo.html if needed later
- **User preferences (theme, bg opacity)** - localStorage for now, migrate to Supabase user_preferences table in WS7

## What's Next (in order)
1. **Graph expansion overwrite bug** - use `word|relationKey` keying so multiple relation types coexist per word
2. **Descender clipping fix** - swap search input to contentEditable div
3. **Graph polish (WS5 continued)** - test collapsible clusters, positioning, then add graph type selector (2D/3D/radial/tree)
4. **WS8 continued** - ThemeSwitcher UI integration, tier gating, persist bg opacity to localStorage
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
