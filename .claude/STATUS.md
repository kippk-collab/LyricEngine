# LyricEngine - Status

**Last updated:** 2026-04-06 (session 15)
**Branch:** main
**Last commit:** ff84324 - Background animation (Sgr A* orbits + tidal disruption) + graph hit area fix (pushed)
**origin/main:** ff84324 - fully in sync

## Current State
WS1-WS4 complete. WS5 (graph viz) has collapsible cluster model working - graph cluster click hit area fixed this session. WS8 (theming) CSS custom property system built, ThemeProvider working, hydration fix applied. New this session: BackgroundAnimation component with two canvas-based physics simulations (Sagittarius A* S-star orbits and tidal disruption event) behind the app content, mode-linked to list/graph view.

## What Was Done (2026-04-06, Session 15)

### Background Animation (new component)
- Created `BackgroundAnimation.tsx` - full-screen fixed canvas behind all content
- Two animation modes ported from Cowork's `lyric-engine-bg-demo.html` (in ~/Vault):
  - **Sagittarius A* orbits:** 12 S-stars with real Keplerian mechanics, trails, BH glow. 17% opacity, 0.2x speed.
  - **Tidal Disruption Event:** star on bound orbit partially stripped each periapsis pass, particle stream. 3% opacity.
- Mode tied to vizMode: Sgr A* plays behind list view, TDE plays behind graph view
- 3-second crossfade on view switch
- Canvas uses `clearRect` (transparent) so page background/theme colors show through
- `pointerEvents: 'none'`, `zIndex: 1` - sits between bg and content

### Z-index stacking fix
- Content was disappearing behind the canvas
- Fixed: `<main>` gets `relative z-10`, graph wrapped in `relative z-10` div
- Header already had `z-40`, context menu at `z-1000`

### Graph cluster click hit area fix
- `paintNodeArea` was using wrong font size (10 vs 11) and smaller padding than the rendered pill
- Fixed to match `paintNode` exactly: italic font, fontSize 11, padX 6 / padY 3

### Placeholder brightness animation (partial - needs tuning)
- Added CSS keyframe animation on `input::placeholder` to glow brighter then settle
- Delayed to start after Framer Motion fade-in completes
- Not visually effective yet - the Framer opacity animation masks the brightness change
- Left as TODO: may need to use a visible overlay div instead of placeholder pseudo-element

## Known Bugs
- **Search input descender clipping** - italic Playfair at 3.5rem clips bottom of g/y/p/q. Root cause: `<input>` elements have built-in overflow clipping. Fix: swap to `contentEditable` div (decided, not yet implemented).
- **Usage limit counter not resetting monthly** - `api_uses_this_month` needs manual reset or scheduled job (WS7/WS10)
- **Placeholder intro brightness** - CSS animation on ::placeholder not producing visible effect; needs different approach

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
- **Background animation:** Sgr A* behind list view (17% opacity, 0.2x speed), TDE behind graph view (3% opacity), crossfade on switch
- **Background canvas stacking:** zIndex 1, content at z-10, header at z-40, context menu at z-1000

## What's Next (in order)
1. **Placeholder intro brightness** - rethink approach (overlay div instead of ::placeholder animation?)
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
- `app/src/lib/graphUtils.ts` - buildGraphData() derives nodes/links from tab state
- `app/src/lib/themes.ts` - theme definitions + applyThemeToDocument()
- `app/src/lib/supabase.ts` - Supabase client + TypeScript types
- `app/src/lib/logger.ts` - console + daily file logger
- `app/src/app/api/rhymes/route.ts` - GET /api/rhymes?word=
- `app/src/app/api/relations/route.ts` - GET /api/relations?word=&type=
- `app/src/components/LyricEngineApp.tsx` - main UI component (tabs + all state)
- `app/src/components/BackgroundAnimation.tsx` - canvas physics animations (Sgr A* + TDE)
- `app/src/components/ContextMenu.tsx` - right-click menu
- `app/src/components/InlineExpansion.tsx` - recursive inline relation expansion panel (with collapse/dismiss)
- `app/src/components/WordGraph.tsx` - 2D force graph visualization (collapsible clusters)
- `app/src/components/ThemeProvider.tsx` - theme context provider (SSR-safe localStorage)
- `app/src/components/ThemeSwitcher.tsx` - theme selection UI component
- `supabase/migrations/001_initial_schema.sql` - full DB schema + RLS + seed
- `app/.env.local` - Supabase URL + anon key + DEV_USER_ID + tier limits (gitignored)
