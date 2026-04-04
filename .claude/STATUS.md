# LyricEngine — Status

**Last updated:** 2026-04-03
**Branch:** main

## Current State
Next.js app fully wired to real Datamuse API with Supabase cache layer. All data fetches now go through server-side API routes (`/api/rhymes`, `/api/relations`), which log to daily rotating files at `app/logs/YYYY-MM-DD.log`. Cache is live and working — second search for same word returns from DB, no API call.

## What Was Done (2026-04-03, Session 6)

### Supabase Setup (WS2 - partial)
- Created Supabase project (URL: `ycxihwnuooxfbetymntk.supabase.co`)
- Wrote `supabase/migrations/001_initial_schema.sql` with all 6 tables + RLS policies + seed row
- Ran migration in Supabase SQL editor - all tables live
- Installed `@supabase/supabase-js`, created `app/src/lib/supabase.ts` (client + TypeScript types)
- Created `app/.env.local` (gitignored) with Supabase URL + anon key + dev user UUID
- Kipp's seed row: UUID `00000000-0000-0000-0000-000000000001`, tier = pro

### Cache-First Service Layer (WS2 - partial)
- Created `app/src/lib/wordService.ts`:
  - `getRhymes(word, userId)` — checks fetch_log → returns from word_relations cache OR calls Datamuse → writes to cache → logs fetch
  - `getRelations(word, relationType, userId)` — same cache-first pattern
  - `ensureWord()` — select-first, insert-if-missing (avoids upsert UPDATE which hits RLS)
  - `writeToCache()` — writes word_relations rows + fetch_log entry (even for empty results)
  - `logActivity()` — writes user_activity row, fire-and-forget
  - All cache writes are fire-and-forget (don't block the response)
- Fixed RLS bug: original `upsert` triggered UPDATE which had no policy → changed to select-then-insert

### Server-Side Logging (WS2 - partial)
- Created `app/src/lib/logger.ts`:
  - Console transport (always on)
  - File transport: appends JSON Lines to `app/logs/YYYY-MM-DD.log`, daily rotation
  - Both transports in `TRANSPORTS[]` array — add new ones without changing call sites
  - `logs/` added to `.gitignore`
- Created API routes (moves service layer server-side):
  - `app/src/app/api/rhymes/route.ts` — `GET /api/rhymes?word=`
  - `app/src/app/api/relations/route.ts` — `GET /api/relations?word=&type=`
  - Both log errors server-side
- Updated `LyricEngineApp.tsx` to call API routes via `fetch()` instead of importing service directly

### RLS Policies in Migration
- Cache tables (words, word_relations, word_fetch_log): SELECT + INSERT open to all (no UPDATE policy needed — code never updates, only inserts)
- User tables (users, user_activity, workspaces): MVP "allow all" bypass with TODO(WS7) comments to tighten when auth is live

**Files created/modified this session:**
- `supabase/migrations/001_initial_schema.sql` (new)
- `app/src/lib/supabase.ts` (new)
- `app/src/lib/wordService.ts` (new)
- `app/src/lib/logger.ts` (new)
- `app/src/app/api/rhymes/route.ts` (new)
- `app/src/app/api/relations/route.ts` (new)
- `app/src/components/LyricEngineApp.tsx` — import swapped to API fetch calls
- `app/.env.local` (new, gitignored)
- `app/.env.local.example` (new)
- `app/.gitignore` — added `/logs/`

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
- **Service layer is server-side** (API routes) so logs go to the server, not the browser
- **Logging format:** JSON Lines (`app/logs/YYYY-MM-DD.log`), daily rotation, swappable transports
- **Dev user UUID:** `00000000-0000-0000-0000-000000000001` in `.env.local` — swap to real auth.uid() in WS7
- **ensureWord uses select-then-insert** (not upsert) — upsert triggers UPDATE which RLS blocks

## What's Next (in order)
1. Usage metering — `checkUsageLimit()` in service layer, increment `api_uses_this_month` on API calls (WS2)
2. Tab system — activate "Explore (new tab)" (WS4)
3. Graph visualization - react-force-graph (WS5)
4. Workspaces + sharing (WS6)
5. Auth + subscriptions (WS7) — wire real Supabase Auth, tighten RLS policies
6. Theming (WS8)
7. Export (WS9)

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000
Logs: `app/logs/YYYY-MM-DD.log`
