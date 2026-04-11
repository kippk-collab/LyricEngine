# LyricEngine - Status

**Last updated:** 2026-04-11 (session 20)
**Branch:** main
**Last commit:** 5a9a0d8 - Graph layout selector (Force/Radial/Edge Bundle), auto-expand new clusters, dismiss popup for expansion clusters (pushed)
**origin/main:** 5a9a0d8 - about to push session 20

## Current State
WS1-WS4 complete. WS5 (graph viz) now has label-aware collision forces, pinned root, pin-on-drop drag behavior, and auto-refit on engine stop. WS3 gained a drill-color system: every drilled-into word gets a pill background whose color matches its child panel's left border, so the link between a word and its expansion is visually obvious. Words with multiple drills show split-pill stripes.

## What Was Done (2026-04-11, Session 20)

### Graph Word Brightness
- Bumped word node text alpha: rhymes 0.55 → 0.95, non-rhyme 0.4 → 0.75
- Readable on both light and dark themes without theme-specific branching

### Graph Cluster Label Color
- Cluster pill label ("rhyme (1 syl)", "Synonyms (word)", etc.) no longer uses the muted theme gold
- Now uses `#f0b428` sunlight yellow on dark themes, `#9a6a0a` darker amber on light themes
- Branching via new `hexLuminance` helper comparing `theme.colors.bg` luminance
- Pill background bumped 0.12/0.08 → 0.22/0.15 alpha of theme gold

### Graph Collide Force (Label-Aware)
- Added `forceCollide` from `d3-force-3d` (already in deps via react-force-graph)
- Offscreen canvas measures each node's rendered label width
- `_collideRadius` stashed on each node: `max(12, width * 0.55 + 4)`
- Collide force strength 0.75, iterations 2
- Long phrase labels (e.g. "so quiet one could hear a pin drop") no longer overlap with neighboring words

### Graph Drag Behavior
- Root node pinned at `fx=0, fy=0` in the force config effect
- Grabbing the root or having it pulled by link forces no longer drags the entire graph off-screen
- `onNodeDragEnd` now pins dropped nodes via `node.fx = node.x; node.fy = node.y;` so clusters stay where the user places them instead of snapping back
- `onEngineStop` triggers `zoomToFit(400, 60)` once simulation settles, so the camera reframes after any drag or layout change

### Drill Color System (NEW - InlineExpansion)
- New shared module `app/src/lib/pillColors.ts` exporting `PILL_COLORS` array, `buildColorMap`, and `pillBackground` helpers
- `PILL_COLORS` = `['--le-lavender', '--le-teal', '--le-copper', '--le-gold', '--le-rose', '--le-accent']` (6 distinct theme accents)
- Each drilled child of a panel gets assigned a color by insertion order, cycling through palette
- Drilled-into word in the parent list renders with a pill background in that color + matching text color
- Child panel's left border and background tint use the same color (`accentVar` prop on InlineExpansion)
- Pill fill alpha: 32%. Panel left border: 2px at 65% alpha. Panel bg tint: 7% alpha.
- Words with multiple drills get a horizontal-stripe gradient pill (hard stops) — one stripe per child color
- Text color follows the first child's color for legibility

### Drill Color System - Top Level (LyricEngineApp)
- Same system applied to top-level expansions (rendered outside any parent panel)
- `topLevelColorMap` built in LyricEngineApp from `Object.keys(activeTab.expansions)`
- Threaded through `SyllableSection` → `WordChip` and `InlineExpansion` calls
- `WordChip` (words in the syllable cloud) now renders a multi-color pill matching all open top-level panels for that word, replacing the old uniform underline
- `SyllableSection` accepts `topLevelColorMap` prop

## Known Bugs / Remaining Issues
- **Usage limit counter not resetting monthly** - deferred, not urgent (dev user is pro tier)
- **RLS anon DELETE** - per memory, `DELETE` returns 204 but does nothing; workaround: use service role key

## Key Decisions
- **Stack:** Next.js + Tailwind + shadcn/ui + Framer Motion + Supabase
- **App lives in `app/` subdirectory** (not repo root - name collision on scaffold)
- **Dev port: 4000** (3000 taken by another project)
- **Viz:** react-force-graph-2d (Force + dagMode=radialout + custom link painter for edge bundle). 3D deferred.
- **Rhyme engine:** Datamuse. Irreplaceable.
- **Graph physics:** label-aware collide force sized per node via offscreen canvas measurement. Root pinned. Drop-pin on drag end.
- **Drill color palette:** 6 theme accents cycled by insertion order. Stored in `app/src/lib/pillColors.ts`. Shared between `InlineExpansion` (nested children) and `LyricEngineApp` (top-level panels).
- **Multi-drill pills:** hard-stop linear gradient (one stripe per child). Not a soft blend — crisp segments so each is individually readable.
- **Graph cluster label color:** hardcoded sunlight yellow (dark bg) / dark amber (light bg). Theme gold was too muted on dark themes.
- **API:** Datamuse (free). Always include `md=s` for syllable counts.
- **Phrases API:** STANDS4 (free, 1000/day). HTML entities decoded.
- **Cache:** Supabase progressive cache. Empty cache bypassed for contractions.
- **Expansion key scheme:** `word|relationKey` (pipe separator)
- **Graph dismiss UX:** right-click cluster → small popup → click Dismiss
- **Theming:** 12 themes, CSS custom properties, SSR-safe localStorage

## What's Next (in order)
1. **WS8 continued** - tier gating, persist bg opacity to localStorage
2. **Workspaces + sharing (WS6)**
3. **Auth + subscriptions (WS7)**
4. **Export (WS9)**
5. **Admin & Config (WS10)**

## Deferred / Not Doing
- **3D graph mode** (react-force-graph-3d) - not needed for MVP
- **Cytoscape layouts** - looked wonky with our data shape
- **Tree TD/LR dagModes** - not useful for this data
- **Abstraction layer around rhyme engine** - Datamuse is irreplaceable
- **Long-press bottom sheet (mobile)** - low priority

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
Logs: `app/logs/YYYY-MM-DD.log`

## Key Files
- `app/src/lib/pillColors.ts` - shared drill-color palette + helpers (NEW session 20)
- `app/src/lib/wordService.ts` - cache-first service layer, contraction cache bypass, slantRhyme threading
- `app/src/lib/datamuse.ts` - Datamuse API wrapper with CONTRACTION_PROXY map; RhymeResult type
- `app/src/lib/phrases.ts` - STANDS4 Phrases API wrapper, decodeHtmlEntities exported
- `app/src/lib/graphUtils.ts` - buildGraphData with group field on GraphNode
- `app/src/app/api/rhymes/route.ts` - GET /api/rhymes
- `app/src/app/api/relations/route.ts` - GET /api/relations?word=&type=
- `app/src/components/LyricEngineApp.tsx` - main UI; builds topLevelColorMap and threads it through SyllableSection → WordChip + top-level InlineExpansion
- `app/src/components/InlineExpansion.tsx` - recursive panels with drill-color pills, accentVar prop for panel border
- `app/src/components/WordGraph.tsx` - 2D graph with collide force, pinned root, pin-on-drop, onEngineStop refit, luminance-branched cluster label color
- `app/src/components/BackgroundAnimation.tsx` - canvas animations
- `app/src/components/ThemeProvider.tsx` - SSR-safe theme context
- `supabase/migrations/001_initial_schema.sql` - DB schema + RLS + seed
- `app/.env.local` - Supabase URL + anon key + DEV_USER_ID + tier limits + Phrases API creds (gitignored)
