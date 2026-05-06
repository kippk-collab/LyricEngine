# LyricEngine - Status

**Last updated:** 2026-05-04 (session 24 — slang relation type via Urban Dictionary)
**Branch:** main
**Last commit:** 5d4bb03 - LLM relations + graph drill-spine model + popup-based promotion (pushed)
**origin/main:** 5d4bb03
**Uncommitted work:** slang feature (session 24) — not yet committed

## Current State
WS11 v0 is functional: similes and metaphors via Anthropic Haiku 4.5, with weighted tails (0..1 model-supplied relevance). Cache-first, 1 LLM call = 1 API use against tier limits. Inline list view shows grouped `<word> like . . .` / `<word> as . . .` headers with tails indented in a 2-column grid. Graph view has a drill-spine model: cluster pills click-to-popup for explicit leaf promotion. **Session 24 added `slng` (Slang) as a new relation type** backed by Urban Dictionary (no API key). Slang definitions are stored as `related_word` text in the DB, cache-first. InlineExpansion renders slang as a numbered definition list rather than a word grid.

## What Was Done (2026-05-04, Session 24)

### Slang relation type (`slng`)
- New file `app/src/lib/slang.ts` — Urban Dictionary public API (`api.urbandictionary.com/v0/define`), no auth, no new env vars.
- STANDS4 slang endpoint (`/services/v2/slang.php`) returns 403 with current credentials — not included in plan tier. Switched to UD.
- UD no longer exposes vote counts in public API response (all return 0/0). Filter changed to: skip entries with definition < 15 chars, take top 10 from UD's pre-sorted list.
- `cleanUdText` strips `[bracket]` link markup and normalizes `\r\n`.
- **Cache model**: definition text stored directly in `related_word` column. `tail` column not needed. UNIQUE constraint on `(word_id, related_word, relation_type)` naturally deduplicates.
- `wordService.ts`: added `slng` branch in both cache-hit and cache-miss paths of `getRelations`. Cache-hit reads via normal `getCachedRelations` (returns definitions as `words[]`). Cache-miss calls `fetchSlang`, deduplicates on first 120 chars, stores via `writeToCache`. No new columns or migrations required.
- `InlineExpansion.tsx`: new render path when `expansion.label === 'Slang'` — numbered definition list (`1. / 2. / ...`) in body text size, hover highlight, no right-click context menu on definitions.
- `ContextMenu.tsx`: "Slang" added to the Meaning group (5th item, alongside Synonyms/Antonyms/Broader/Narrower terms).
- `LyricEngineApp.tsx`: no interface changes needed (definitions flow through standard `words[]` field).

### Frontend design skill
- Loaded at session start per new global hard rule.

## Known Bugs / Remaining Issues
- **WS11 still BLOCKED ON LOCKDOWN POSTURE for production deploy.** Full abuse-prevention checklist is the release gate.
- **Session 24 work is uncommitted** — commit before next session.
- **Old cached rows have weight = NULL** — popup falls back to insertion order for those. Search a fresh word to see weighted ranking.
- **No way to demote rhyme clusters from the graph** — rhyme clusters tied to syllable filter.
- **Usage limit counter not resetting monthly** (carryover) — deferred.
- **RLS anon DELETE** (carryover) — workaround: service role key.
- Right-click hit detection on graph word nodes occasionally requires multiple attempts (carryover).
- **UD content quality varies** — well-known slang words return good results; obscure words may return thin entries. No moderation layer yet.
- **STANDS4 slang 403** — the slang endpoint is restricted on current credentials. If STANDS4 slang is ever needed, it requires account upgrade.

## Key Decisions

### Slang (session 24)
- **Urban Dictionary over STANDS4** — STANDS4 slang blocked (403). UD free, no key, pre-sorted by internal relevance.
- **Definitions as `related_word`** — keeps the data model flat; no new column, no migration. Works with existing cache infrastructure.
- **No vote-count filtering** — UD public API no longer exposes thumbs_up/down. Pre-sorted list is the quality signal.
- **`label === 'Slang'` render branch** — cleaner than a separate `isGlossary` flag; label is user-visible and controlled by us.
- **Slang in Meaning group** — vs. a new "Voice" group. Will split out "Voice" if/when `def`, `ety`, or other register-oriented types are added.

### Stack (unchanged from session 23)
- Next.js 16.2.2 (Turbopack, `proxy.ts` not `middleware.ts`), Supabase + `@supabase/ssr`, Anthropic SDK.
- Dev port: 4000.

### LLM relations (unchanged)
- **Haiku 4.5 default** (`claude-haiku-4-5-20251001`) for all new types. Opus 4.7 reserved for premium-tier generation-heavy types.
- v0 ships sim + met only. Idioms covered by STANDS4 phrases.
- **Per-tail weight** required by prompt (0..1, spread across range). Stored in `word_relations.weight`.

### Graph (unchanged)
- **Drill-spine model**: root + explicitly-promoted leaves + drilled-into leaves. Cluster pills click-to-popup.
- `promotedLeaves` is `WordGraph`-local state; resets on word change.

## What's Next (in order)

1. **Commit session 24 work** (slang feature — `app/src/lib/slang.ts` + modifications).
2. **Test slang on a few words** — "fire", "sick", "goat", "love" are good UD candidates. Check definition quality and cache behavior.
3. **Test WS11 v0 with fresh words** — volume + ranking quality on unfamiliar words.
4. **WS10 admin MVP subset** — gates friends-testing widening: spend dashboard, global LLM kill switch, daily spend freeze, email + SMS alerts, recent-activity log.
5. **WS11 abuse prevention checklist** (13 controls + 9 browser-extension class) — production deploy gate.
6. **Tier × capability matrix** — blocks WS7 (Stripe).
7. **Backend DB hosting decision** (MySQL on Hostinger vs Supabase) — also blocks WS7.
8. **WS11 v0.1**: more LLM types (allusions, pop-culture, oxymorons, alliterations, intensifiers, word families), "More similes" load-more, multi-call fan-out for >80 volume.
9. **List ↔ graph promoted-leaf marking** (deferred from session 23).
10. **Free Dictionary API for `def`** — zero credentials, solid data, already on WS11 backlog.
11. **WS7 Auth tail** — Custom SMTP (Resend), Google/Apple/Facebook OAuth.
12. **WS8 / WS6 / WS9 / WS5** carryovers.

## Deferred / Not Doing
- 3D graph mode, Cytoscape layouts, Tree TD/LR dagModes, long-press bottom sheet (carryover).
- Anonymous-to-authenticated upgrade path (intentional gating).
- Glosses on similes/metaphors (deferred to backlog).
- STANDS4 slang endpoint (403 on current credentials — account upgrade required).
- Era/regional sub-selector for slang (Kipp confirmed top-voted contemporary is good enough for v0).
- Mobile responsive layout — flagged as its own future workstream.

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000. Kill stuck processes: `lsof -ti:4000 | xargs kill -9`.

## Environment (`app/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TIER_LIMIT_FREE=20`, `TIER_LIMIT_BASIC=100`, `TIER_LIMIT_PRO` (empty=unlimited)
- `PHRASES_API_UID`, `PHRASES_API_TOKEN` (STANDS4 — phrases only; slang endpoint 403)
- **`ANTHROPIC_API_KEY`** — server-only, used by `lib/anthropic.ts`. NO `NEXT_PUBLIC_` prefix.
- **No new env vars for slang** — Urban Dictionary is unauthenticated.

## Key Files (new/changed session 24)
**Created:**
- `app/src/lib/slang.ts` — Urban Dictionary API wrapper

**Modified:**
- `app/src/lib/wordService.ts` — `slng` handling in cache-hit + cache-miss paths of `getRelations`
- `app/src/components/InlineExpansion.tsx` — numbered definition list render path for `label === 'Slang'`
- `app/src/components/ContextMenu.tsx` — "Slang" added to Meaning group
- `app/src/components/LyricEngineApp.tsx` — no interface change (definitions flow through standard `words[]`)

## Memory cross-references (auto-memory store)
- `project_llm_relations.md` — Haiku default, Opus reserved for premium tier
- `feedback_llm_abuse_prevention.md` — hard lockdown posture, release gate for every feature
- `project_admin_scenario.md` — WS10 driving "3am wake-up" user story
