# LyricEngine — Status

**Last updated:** 2026-04-03
**Branch:** main

## Current State
Architecture fully specced (see `~/Vault/Projects/lyric-engine.md`). UI prototyped in Google Stitch. No application code yet — ready to scaffold.

## What Was Done (2026-04-03)

### CC Session (repo setup)
- Created GitHub repo `kippk-collab/LyricEngine` (public)
- First commit (`.gitignore`) pushed to `origin/main`
- Added `CLAUDE.md` to project root, pointed to `~/Vault/Projects/lyric-engine.md`
- Confirmed `/save` and `/resume` are global — no project-level setup needed

### Cowork Session (architecture)
- Full product architecture specced — stack, data model, auth, subscriptions, sharing, theming, viz modes
- UI prototyped in Google Stitch ("The Midnight Lyricist" dark aesthetic). Screenshots in `Vault/Stitch/`
- Interactive force-graph prototype saved to `Vault/lyric-engine-graph-prototype.html`

## Key Decisions
- **Stack:** Next.js + Tailwind + shadcn/ui + Framer Motion + Supabase
- **Viz:** react-force-graph (2D/3D/VR) + Cytoscape.js (radial/tree)
- **API:** Datamuse (free, no key). Always include `md=s` for syllable counts. Fetch on-demand only — no bulk calls.
- **Cache:** Supabase progressive cache. Global shared cache. Cache hits are free and don't count against usage limits.
- **Auth:** Supabase Auth, OAuth only (Google + Apple). Encapsulated `AuthService` interface — provider-agnostic.
- **Product name:** TBD. Brainstorm in lyric-engine.md. Frontrunners: Wordverse, WordDrift, Wordy.
- **Git repo name stays:** `lyric-engine` regardless of final product name.

## What's Next (in order)
1. ~~Install Frontend Design Skill~~ - Done. (`npx skills add anthropics/skills@frontend-design --yes`)
2. Scaffold Next.js project
3. Set up Supabase project and run migrations (full schema in lyric-engine.md)
4. Build API service layer (Datamuse abstraction)
5. Build list view UI with syllable groupings
6. Build context menu (desktop right-click + mobile bottom sheet)
7. Build tab system
8. Build graph visualization (react-force-graph)
9. Wire up progressive cache layer
