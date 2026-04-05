# LyricEngine - Status

**Last updated:** 2026-04-04 (session 13)
**Branch:** main
**Last commit:** 921e6d3 - Collapsible graph clusters, expansion panel controls, margin + color polish (pushed)
**origin/main:** 921e6d3 - fully in sync

## Current State
WS1-WS4 complete. WS5 (graph viz) has collapsible cluster model working - clusters start collapsed, click to expand. Expansion panels now have collapse/dismiss controls. UI control colors added (copper, lavender, teal, rose). Descender clipping on search input still unresolved. WS10 (Admin & Config) on the roadmap.

## What Was Done (2026-04-04, Session 13)

### Collapsible Graph Clusters (WS5 continued)
- Cluster labels changed from "1 syl" to "rhyme (1 syl)", "rhyme (2 syl)", etc.
- Expansion drill-downs create cluster nodes: "synonyms (grime)", "triggers (filth)", etc.
- All clusters start **collapsed** - only cluster label visible, no child words
- Click a cluster to expand/collapse, revealing orbiting words
- Collapsed clusters show a count badge (e.g. "8") indicating how many words inside
- Cluster nodes rendered with subtle gold pill background (brighter when expanded)
- `buildGraphData()` now accepts `expandedClusters: Set<string>` parameter
- `GraphNode` interface extended with `childCount` and `isExpanded` fields
- Graph container height increased from `calc(100vh - 200px)` to `calc(100vh - 150px)`
- Zoom-to-fit padding reduced from 60px to 20px (fills more screen)

### Expansion Panel Controls
- **Collapse toggle**: click the panel header (▸/▾) to collapse/expand content. Data preserved, just hidden. Word count badge shown when collapsed.
- **Dismiss button**: × to remove the panel entirely (and all children)
- `removeExpansionAtPath()` helper added for recursive state deletion
- `onDismiss` callback threaded through InlineExpansion → SyllableSection → LyricEngineApp

### UI Control Colors
- Search submit arrow: copper `#c4956a` (70% rest, 100% hover)
- Syllable collapse triangle: lavender `#a78bba` (50% rest, 80% hover)
- Panel collapse ▸/▾: teal `#6ea8a0` (60% rest, 90% hover)
- Panel × dismiss: rose `#b8697a` (50% rest, 85% hover)

### Margin Adjustments
- Reduced horizontal padding from `px-4` to `px-3` on header and main containers
- Reduced syllable content indentation from `pl-4` to `pl-2`
- Input line-height changed from 1 to 1.25 (descender fix attempt - not fully working)

## Known Bugs
- **Search input descender clipping** - italic Playfair at 3.5rem clips bottom of g/y/p/q. `lineHeight: 1.25` didn't fully fix. Root cause: `<input>` elements have built-in overflow clipping. Fix: swap to `contentEditable` div.
- **Usage limit counter not resetting monthly** - `api_uses_this_month` needs manual reset or scheduled job (WS7/WS10)

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

## What's Next (in order)
1. **Descender clipping fix** - swap search input to contentEditable div
2. **Graph polish (WS5 continued)** - test collapsible clusters, positioning, then add graph type selector (2D/3D/radial/tree)
3. **Workspaces + sharing (WS6)**
4. **Auth + subscriptions (WS7)**
5. **Theming (WS8)**
6. **Export (WS9)**
7. **Admin & Config (WS10)** - DB-driven tier limits, feature flags, admin page

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
Logs: `app/logs/YYYY-MM-DD.log`

## Key Files
- `app/src/lib/wordService.ts` - cache-first service layer + usage metering
- `app/src/lib/datamuse.ts` - Datamuse API wrapper
- `app/src/lib/graphUtils.ts` - buildGraphData() derives nodes/links from tab state
- `app/src/lib/supabase.ts` - Supabase client + TypeScript types
- `app/src/lib/logger.ts` - console + daily file logger
- `app/src/app/api/rhymes/route.ts` - GET /api/rhymes?word=
- `app/src/app/api/relations/route.ts` - GET /api/relations?word=&type=
- `app/src/components/LyricEngineApp.tsx` - main UI component (tabs + all state)
- `app/src/components/ContextMenu.tsx` - right-click menu
- `app/src/components/InlineExpansion.tsx` - recursive inline relation expansion panel (with collapse/dismiss)
- `app/src/components/WordGraph.tsx` - 2D force graph visualization (collapsible clusters)
- `supabase/migrations/001_initial_schema.sql` - full DB schema + RLS + seed
- `app/.env.local` - Supabase URL + anon key + DEV_USER_ID + tier limits (gitignored)
