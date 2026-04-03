# LyricEngine — Status

**Last updated:** 2026-04-03
**Branch:** main

## Current State
Next.js app scaffolded and running. Full list view UI built and wired to real Datamuse API. Mock data is gone. Explore action works. App is functionally live for the list view phase.

## What Was Done (2026-04-03, Session 5)

### Real Datamuse API Wired (WS2/WS3 - partial)
- Created `app/src/lib/datamuse.ts` — service layer with two functions:
  - `fetchRhymes(word)` — calls `rel_rhy` with `md=s`, groups results by `numSyllables`, returns sorted `SyllableGroup[]`
  - `fetchRelations(word, relationType)` — fetches any Datamuse relation key, returns `string[]`
- All mock data removed from `LyricEngineApp.tsx`
- `handleSubmit` is now async — calls `fetchRhymes`, shows "listening..." during load
- `handleRelationSelect` is now async — calls `fetchRelations`, shows "listening..." in expansion panel during load
- Loading states added: main view shows italic "listening..." while rhymes fetch; expansion panel shows "listening..." while relation fetch is in flight

### Explore / Explore (new tab) Actions (WS3)
- Added two action buttons at the top of the context menu, above the relation groups, separated by a divider
- **Explore** — right-click any word → Explore → that word becomes the new root query. Triggers full `fetchRhymes`, clears expansions, updates query field.
- **Explore (new tab)** — stubbed, dimmed, `cursor-not-allowed`, tooltip says "Coming soon — requires tab system". Will activate when WS4 is built.
- Both use blue (#acc7fb) dot to visually distinguish from the colored relation-group dots below
- `onExplore` prop added to `ContextMenu` component and wired through `LyricEngineApp`

**Files modified:**
- `app/src/lib/datamuse.ts` (new)
- `app/src/components/LyricEngineApp.tsx` — mock data removed, async API calls, loading state, Explore handler, onExplore prop passed to ContextMenu
- `app/src/components/ContextMenu.tsx` — Explore/Explore (new tab) buttons added, onExplore prop
- `app/src/components/InlineExpansion.tsx` — loading?: boolean added to Expansion type, "listening..." shown during fetch

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
- **Context menu actions:** "Explore" (search here) and "Explore (new tab)" (stub until WS4)
- **Loading copy:** "listening..." in italic Playfair — consistent for both main rhyme fetch and expansion fetches

## What's Next (in order)
1. Create Supabase project + run migrations (WS2)
2. Build Datamuse service layer cache-first data flow (check fetch_log → return cache OR call API → write cache → log fetch) (WS2)
3. Build usage metering (WS2)
4. Tab system — activate "Explore (new tab)" (WS4)
5. Graph visualization - react-force-graph (WS5)
6. Workspaces + sharing (WS6)
7. Auth + subscriptions (WS7)
8. Theming (WS8)
9. Export (WS9)

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
