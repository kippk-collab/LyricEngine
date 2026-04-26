# LyricEngine - Workstreams

**Last updated:** 2026-04-24 (session 22 — added WS11 LLM relations + tier design)

## WS1: Project Setup
**Status:** Complete

## WS2: Database & Backend
**Status:** Complete

- [x] Datamuse service layer
- [x] Supabase project + migrations + seed
- [x] Cache-first service layer
- [x] Server-side API routes
- [x] JSON Lines logger
- [x] Usage metering + tier limits
- [x] STANDS4 Phrases API integration
- [x] RLS DELETE policies
- [x] Contraction rhyme fallback
- [x] slantRhyme flag threaded through
- [x] WS7-partial: RLS tightened to `auth.uid()` on user tables (migration 002)
- [x] WS7-partial: auth user provisioning trigger + seed user transition with FK cascade
- [x] WS7-partial: GDPR user deletion cascade trigger

## WS3: Core UI - List View
**Status:** Complete

(all list view features shipped in prior sessions)
- [ ] Long-press bottom sheet (mobile) - deferred

## WS4: Tab System
**Status:** Complete

## WS5: Graph Visualization
**Status:** In Progress (3 layouts working, dismiss popup needs more testing)

- [x] react-force-graph-2d integration, viz mode switcher, all three layouts, collision force, pinned root, pin-on-drop, engine-stop refit, drill color system
- [ ] Right-click hit detection - still occasionally requires multiple clicks (session 19/20 note, not addressed in 21)
- [ ] Graph positioning polish
- [ ] 3D mode - DEFERRED
- [ ] Cytoscape layouts - DEFERRED

## WS5.5: Background Animation
**Status:** Complete

## WS6: Workspaces & Sharing
**Status:** Not Started

- [ ] Auto-save tab state to Supabase (debounced)
- [ ] Workspace save/load
- [ ] Workspace naming
- [ ] Share token generation
- [ ] Shared read-only view (`/shared/{token}`)
- [ ] "Make this your own" CTA
- [ ] **Shared-view lockdown:** shared workspaces MUST render from cached data only — no LLM calls, no Datamuse calls, no usage counters incremented. Any uncached relation shows "not available in shared view" with a sign-up CTA. This is a hard rule (see WS11 deployment posture).

## WS7: Auth & Subscriptions
**Status:** In Progress

### Auth sub-workstream
- [x] Supabase email OTP passwordless login (session 21)
- [x] `@supabase/ssr` cookie-based sessions, proxy.ts token refresh (session 21)
- [x] AuthProvider context + LoginGate component (session 21)
- [x] User extraction in API routes, wordService refactor (session 21)
- [x] Scoped RLS policies (auth.uid() = id / user_id) (session 21)
- [x] User provisioning trigger with seed transition (session 21)
- [x] User settings page with sign out (session 21)
- [x] Account deletion (GDPR right-to-erasure) with cascade trigger (session 21)
- [x] User avatar dropdown in header (session 21)
- [x] Email templates customized with OTP code + link (session 21)
- [ ] **Custom SMTP (Resend)** - remove Supabase branding, lift 4/hour rate limit
- [ ] **Google OAuth** - free on Supabase, lowest friction for users
- [ ] **Apple/iCloud OAuth** - required for iOS if any social login is offered
- [ ] **Facebook OAuth**
- [ ] Display name editing in settings
- [ ] Email change flow (supabase.auth.updateUser)
- [ ] OAuth provider linking UI in settings (link/unlink)
- [ ] Session revocation endpoint (admin use)

### Subscriptions sub-workstream (Stripe)
- [ ] Stripe account setup + keys in env
- [ ] `stripe_customer_id` column on users table
- [ ] Stripe Checkout integration
- [ ] `/api/webhooks/stripe` endpoint for subscription events
- [ ] Tier update logic driven by webhook (active/canceled/past_due)
- [ ] Upgrade modal / pricing page
- [ ] Stripe Customer Portal link in settings
- [ ] Downgrade logic on subscription end
- **BLOCKED BY**: DB hosting evaluation (see "Cross-cutting" below). Stripe webhook + tier logic is DB-agnostic but the queries change.

### Tier gating (cross-cuts WS8)
- [ ] Theme access by tier (free/basic/pro theme subsets)
- [ ] API call limit enforcement UI (upgrade prompt when limit hit)

## WS8: Theming
**Status:** In Progress

- [x] CSS custom properties, ThemeProvider, ThemeSwitcher, 12 themes, bg opacity slider, canvas auto-invert, hydration fix
- [ ] Persist bg opacity to localStorage
- [ ] Tier gating (free/basic/pro theme access)
- [ ] Theme cascade (tab > workspace > user default > system default)
- [ ] Login screen theme polish

## WS9: Export
**Status:** Not Started

## WS10: Admin & Config
**Status:** Not Started
**Driving user story (Kipp, 2026-04-24):** "I wake up at 3am to an alert that LyricEngine has burned through my token allotment. I need to (1) know what happened, (2) stop the bleeding immediately, and (3) triage the offending user/pattern — all from my phone, in a foggy-headed state, without SSHing into Supabase or opening the Anthropic console."

This workstream has grown beyond just "config" — it's the operator-survival surface for running a paid-LLM-backed product. Closely coupled to WS11 abuse prevention; the admin screen is where the abuse-prevention controls actually get operated from.

### Observability dashboard
- [ ] Live LLM spend today (estimated USD, from logged call count × per-model cost)
- [ ] LLM calls per hour — last 24h sparkline, annotated with any threshold crossings
- [ ] Top queriers (last hour / 24h / week) — user email + call count + est. spend
- [ ] Top queried words (last hour / 24h) — spot scraper-like enumeration patterns
- [ ] Cache hit rate per relation type (% served from cache vs API)
- [ ] Anomaly flag list (users hitting limits, sudden spike patterns, flagged sessions from WS11 detection)
- [ ] Most recent 50 LLM calls — word, user, model, timestamp, source=api|cache

### Emergency controls (the "stop the bleeding" surface)
- [ ] **Global LLM kill switch** — one-click freeze on all LLM endpoints. Returns 503 with friendly message. Cached results still serve. Flip back to restore. MUST be reachable from phone.
- [ ] **Per-relation-type kill** — disable similes independently of metaphors, etc.
- [ ] **Per-user ban** — disable a specific user's LLM access without revoking their session
- [ ] **Per-IP block** — block an IP or range at the proxy layer
- [ ] **Daily spend freeze** — admin-settable ceiling (e.g. $5/day during testing, $50/day later). Auto-triggers global kill when crossed. Dashboard shows current spend vs ceiling.
- [ ] **Session revocation** — sign a specific user out of all devices (compromised-account triage)

### Alert channels (so the 3am wake-up actually happens)
- [ ] Admin email for all alerts — default channel
- [ ] **SMS (Twilio) for critical alerts** — spend threshold crossings, kill-switch trips, anomaly detections. Email alone may not wake him.
- [ ] Optional Slack webhook
- [ ] Alert thresholds configurable in admin UI: $ spend today, calls/hour, error rate, anomaly flag count
- [ ] Every alert includes a one-tap link back to the admin emergency-controls page (kill switch one tap away)
- [ ] Cross-reference link to console.anthropic.com/usage for Anthropic-side billing view (belt-and-suspenders)

### User administration
- [ ] Users table view: email, tier, signup date, last active, month usage, est. LLM spend
- [ ] Search users by email
- [ ] Per-user detail page: recent activity, expansion history, flag status, LLM call history
- [ ] Manual actions: bump or reset monthly counter, flip tier, ban, revoke sessions, force sign-out
- [ ] `is_admin` boolean column on users table
- [ ] Admin page route protected by is_admin check in layout (not just hidden in UI)

### Cache management
- [ ] View cached word_relations — searchable by word, relation_type, source (datamuse/llm_haiku/llm_opus)
- [ ] Invalidate specific (word, relation_type) entries — next user fetches fresh
- [ ] Bulk invalidate by source (e.g. "wipe all llm_haiku entries" after a prompt improvement) — critical when we tune prompts and want the next user to see the new output
- [ ] Bulk invalidate by age (e.g. "wipe all LLM entries older than 90 days")
- [ ] Fetch-log view: when each entry was fetched, which user triggered it

### Config table (Supabase-backed, replaces env vars where appropriate)
- [ ] `config` table for admin-adjustable settings
- [ ] Rows: `daily_spend_cap_usd`, `per_user_llm_calls_per_hour`, `per_ip_calls_per_minute`, `kill_switch_global`, `kill_switch_per_type`, `default_new_user_tier`, `default_login_theme`, `alert_email`, `alert_sms_number`, `alert_slack_webhook`, `alert_threshold_spend_usd`, `alert_threshold_calls_per_hour`
- [ ] Admin UI reads/writes config rows
- [ ] Service layer reads config on each LLM call (cached per-request) for gate checks
- [ ] Seed default config rows on migration

### Tier/limits (move out of env vars)
- [ ] DB-driven tier limits (replace `TIER_LIMIT_FREE` / `TIER_LIMIT_BASIC` / `TIER_LIMIT_PRO` env vars with config table rows)
- [ ] Admin-configurable per-tier LLM call limits (separate from existing Datamuse limits)

### Email template management
- [ ] (Future) Pull OTP email templates out of Supabase dashboard into the admin UI

### Minimum viable admin for the "3am wake-up" scenario
If forced to ship a minimum subset before opening LLM endpoints to any non-Kipp user, this is the must-have:
1. **Spend dashboard** — today's $ and calls-per-hour sparkline
2. **Global LLM kill switch** — reachable from phone, one tap
3. **Daily spend freeze** — admin-set ceiling, auto-trips kill switch
4. **Email + SMS alerts** on spend threshold + kill-switch trips
5. **Recent-activity log** — who called what, when, from where

Everything else (user admin, cache management, config table) is iterative — important but not blocking the first friends-testing widening.

## WS11: LLM-Powered Relations (MasterWriter gap closure)
**Status:** Not Started — BLOCKED ON LOCKDOWN POSTURE
**Rationale:** Datamuse and STANDS4 cover rhymes + statistical co-occurrence but cannot produce curated figurative language. MasterWriter's main differentiators (idioms, similes, metaphors, allusions, pop-culture refs, word families) require either licensed corpora or an LLM. Going the LLM route: no licensing, infinite vocabulary coverage, quality improves with model upgrades.

**Deployment posture (hard rule, no exceptions):** For now, LyricEngine exposes nothing that an agent, crawler, browser extension, or automated tool can use. This means:
- **No public / unauthenticated LLM endpoints, ever.** Not even rate-limited. Not even for demos. Not for marketing screenshots.
- **No guest mode, no anonymous browsing** of the app (already decided — Kipp wants visibility into every user).
- **No shared-workspace view that triggers LLM calls.** Shared/read-only views (WS6) render ONLY cached data; any word or relation type not in cache renders as "not available in shared view" — the shared view never triggers a paid call.
- **Friends-testing stays invite-only / email-allowlisted** until the full abuse-prevention checklist (both bot and browser-extension threat classes) is shipped and tested.
- **No public API documentation.** No OpenAPI spec, no "how to integrate" page, no SDK. The API is an internal implementation detail of the UI, not a product surface.
- **No marketing landing page that links to the app** without the app itself being fully locked down. OK to have a landing page that says "coming soon / request access" with an email form; NOT OK to have a "Try it now" button that reaches an LLM-backed endpoint.
- **Every new feature added to WS11 or any other workstream** must pass a release gate: "can an agent/extension/crawler invoke this, even once, without a human clicking? If yes, not ready to deploy." See the abuse-prevention checklist below.

**Model strategy:**
- Default **Haiku 4.5** for all new relation types initially (~$0.004/first-hit, $0 on cache)
- **Opus 4.7** reserved for generation-heavy types (similes, metaphors, allusions, curated word families) where cliché-avoidance matters - gated to higher tier, see tier design below
- Per-word results cached in `word_relations` exactly like Datamuse results - second user to query a word pays $0

### Infrastructure
- [ ] Add `@anthropic-ai/sdk` to `app/package.json`
- [ ] `ANTHROPIC_API_KEY` env var (server-only, no `NEXT_PUBLIC_` prefix)
- [ ] New `llmService.ts` - cached-first wrapper mirroring wordService pattern
- [ ] Extend `word_relations.source` to accept `'llm_haiku' | 'llm_opus'`
- [ ] Extend `word_fetch_log.relation_type` enum with new LLM type codes
- [ ] `max_tokens` hard cap (1000) per call as runaway guard
- [ ] Prompt-cache system prompts where beneficial
- [ ] Usage metering: count LLM calls against tier limits, cache hits free (same rule as Datamuse)

### Abuse prevention (MUST-HAVE before any LLM key is live in prod)
**Threat model:** every LLM call costs real money. Bots, scrapers, or a malicious user with a script could drain the Anthropic wallet in minutes. Cache protects against repeat queries but NOT against a bot enumerating a dictionary of unique words. Defense-in-depth required.

- [ ] **Hard global daily spend cap** — circuit breaker: track `sum(llm_calls_today × est_cost)` in a `daily_spend` row, refuse all LLM calls above ceiling (e.g. $5/day during friends testing, scale later). Returns friendly error, logs event, emails Kipp.
- [ ] **Per-user rate limit** — independent of tier quota: max N LLM calls per minute and per hour per user (e.g. 10/min, 60/hour for Pro; tighter for Free). Burst protection against scripted clients holding a valid session.
- [ ] **Per-IP rate limit** — at the proxy.ts layer, before auth check: max requests/min per IP regardless of user. Stops credential-stuffed botnets where each bot has a fresh account.
- [ ] **Signup friction** — require email verification (already have via OTP) but ADD: block disposable email domains (mailinator, guerrillamail, 10minutemail, etc.), and add a hCaptcha/Turnstile challenge on signup.
- [ ] **New-account LLM cooldown** — new accounts cannot make LLM calls for first N minutes/hours after signup (even on Pro). Bots often signup-and-burn immediately.
- [ ] **Anomaly detection** — flag accounts that call LLM relations faster than a human could click (e.g. >1 call/sec sustained). Auto-throttle or soft-lock pending review.
- [ ] **Dictionary enumeration detection** — if a user queries 50+ unique words in an hour with no repeat pattern typical of exploration, flag as suspected scraper.
- [ ] **Honeypot relation types** — add fake relation type codes to the API that real UI never sends. Any request using them auto-bans the user.
- [ ] **API route is auth-ONLY** — LLM endpoints MUST 401 on missing/invalid session, no exceptions, no guest access, no "public demo mode" without rate-limited stub data.
- [ ] **Pre-flight cost estimate** — llmService computes expected max cost per call before dispatching; rejects if call would push today past the cap.
- [ ] **Observable spend dashboard** — admin route (WS10) surfaces real-time LLM spend, top queriers, any anomaly flags.
- [ ] **Anthropic org-level budget alerts** — set in Anthropic console as belt-and-suspenders (cannot be bypassed by app-level bugs).
- [ ] **robots.txt + X-Robots-Tag** — deny crawling of the app surface (app is interactive, not content — nothing to index). Different story if a marketing landing page is later added.

### Browser-extension / in-page AI assistant abuse (distinct threat class)
**Threat model:** extensions like Playwrite, Glasp, Claude-for-browser, ChatGPT sidebar, Perplexity, Merlin, Harpa, HyperWrite, Grammarly AI, etc. run inside a legitimately logged-in user's tab. Auth cookie is valid, session is real, but the extension silently calls app APIs on the human's behalf — potentially at machine speed against any endpoint it discovers. Bot/captcha defenses don't help because the user is real. Per-user rate limits help but an extension making "normal-looking" calls at slightly-above-human pace across many users is a real drain.

- [ ] **Click-signed tokens on LLM routes** — every LLM relation call requires a short-lived HMAC token minted by the UI at the moment of user click (right-click menu selection). Token encodes `{userId, word, relationType, timestamp, nonce}`, server verifies, single-use, ~5s TTL. Extensions cannot forge tokens without replaying the UI interaction.
- [ ] **Content Security Policy** — strict CSP blocking inline scripts from unknown origins, frame-ancestors deny, object-src none. Reduces extensions' ability to hook into app internals (doesn't stop them reading the DOM but limits deeper injection).
- [ ] **Origin + Referer enforcement** — API routes reject requests where Origin/Referer don't match the app's own domain. Extensions that proxy calls through their own servers get blocked; in-page calls still work.
- [ ] **Human-gesture verification** — server requires that LLM calls correlate with recent `mousedown`/`touchstart` events reported by the client. Stored per-session, short window. An extension firing without a human gesture gets rejected.
- [ ] **Request cadence fingerprinting** — real human clicking has jittered inter-call timing (0.5-20s gaps, variance). Extensions often produce suspiciously regular or burst patterns. Flag and soft-throttle sessions whose timing histogram looks non-human.
- [ ] **No public / unauthenticated demo endpoint that hits LLM** — any "try it without signing up" mode must return stub/cached data only. Extensions scrape what they can see; don't give them a free endpoint.
- [ ] **Per-session LLM budget** — beyond per-user rate limit, a hard per-session ceiling (e.g. 50 LLM calls per browser session). Forces re-auth after hitting it, which kills zombie extension-driven sessions.
- [ ] **User-visible recent-activity log in Settings** — users can see their own LLM call history. If an extension is siphoning calls, the user notices "I didn't search 80 words yesterday" and can report / revoke sessions. Cheap transparency, strong deterrent.
- [ ] **Terms of Service clause** — automated access, browser extensions, and AI-assistant tools prohibited from calling the app's LLM endpoints. Gives legal cover to ban offending accounts and (if needed) pursue extension vendors who deliberately target the app.

### New relation types (all via Haiku 4.5 initially)
- [ ] `idm` - Idioms / fixed phrases containing the word
- [ ] `sim` - Similes for/with the word
- [ ] `met` - Metaphors for/with the word
- [ ] `all` - Allusions (literary, mythological, historical, cultural)
- [ ] `pop` - Pop culture references (songs, films, catchphrases)
- [ ] `ono` - Onomatopoeia related to the word
- [ ] `oxy` - Oxymorons featuring the word
- [ ] `alit` - Alliterative phrases with the word
- [ ] `intf` - Intensifiers (avoid collision with existing `int` if used)
- [ ] `def` - Definitions (evaluate free dictionary API as cheaper alternative)
- [ ] `wfam` - Curated "Word Families" expansion (songwriter-relevant associations)

### UI surface
- [ ] Extend context menu with new groupings - likely "Figurative" (sim/met/all/pop) and expanded "Sound" (ono/alit/oxy)
- [ ] Visual indicator on LLM-sourced entries (subtle, to distinguish from Datamuse)
- [ ] Inline expansion: **"lead + tails" grouped display** — prompt returns `[{lead, tails[]}]` structure; UI shows `smile like . . .` as a section header with the varying tails indented below. Avoids repeating the subject word on every line. Applies to similes, metaphors, and any other type where the phrase has a natural template prefix (allusions, pop-culture, idioms once added).
- [ ] **Reconsider glosses** (deferred from v0): currently shipping without short explanations of each simile/metaphor. If users struggle to interpret obscure entries (especially Haiku-generated allusions), add gloss support — likely as tooltip-on-hover rather than stacked-below text so the scanning experience stays clean.
- [ ] Tooltip/badge showing which model produced the result (Haiku vs Opus) for Pro-tier transparency
- [ ] **List ↔ graph promoted-leaf marking** (backlog, deferred from session 23): when a leaf is promoted to the graph via the leaf popup, mark it visually in the InlineExpansion list view so the user can see which leaves are already on the graph. Two-way state sync (graph.promotedLeaves ↔ list-view highlight) — needs lifting promotedLeaves out of WordGraph to the tab/expansion level.
- [ ] **Graph leaf-popup polish:**
  - Persist promotedLeaves across viz-mode toggles within a session (currently lifted to WordGraph, resets on word change only — fine for now, but should survive list↔graph round-trips once #3 lands).
  - Multi-call fan-out for >80 simile volume (currently capped by single-call max_tokens=2500).
  - "More similes" load-more pagination once popup is in steady use and the bottom of the list feels short.

### Tier design (must resolve before shipping WS11)
- [ ] Map each relation type × tier to access matrix (Free / Basic / Pro)
- [ ] Decide: Opus-routed types as Pro-only upgrade, OR Opus as an opt-in "premium quality" per-type toggle for Pro users
- [ ] Cost ceiling per tier to protect against runaway spend
- [ ] Decide where LLM calls count in usage metering (likely 1 LLM call = 1 API use)

## Cross-cutting / Not assigned to a workstream

### Full tier × capability matrix (pending)
- [ ] Define full feature matrix across all workstreams: Datamuse relations, LLM relations (Haiku vs Opus), themes, workspaces, sharing, export, graph modes
- [ ] Resolve before Stripe integration (WS7) so pricing page can reference real gates
- [ ] See WS11 tier design for LLM-specific piece

### Backend DB hosting decision (MUST resolve before Stripe)
- [ ] Evaluate MySQL on Hostinger (included in existing plan) vs continuing Supabase ($25/mo Pro)
- [ ] Check Hostinger MySQL version, connection limits, bandwidth
- [ ] Prototype wordService queries against MySQL
- [ ] Decision point before Stripe integration locks in more Supabase surface area
- See memory: `project_db_hosting.md`

### Hosting deployment (Hostinger)
- [ ] Verify HTTPS cert setup
- [ ] Supabase auth cookie Secure flag behavior in production
- [ ] Supabase Site URL + redirect URLs updated to production domain
- [ ] CORS / CSP headers if needed
- See memory: `project_hosting_ssl.md`

### Product naming
- [ ] Pick a product name (currently "LyricEngine" / "The Midnight Lyricist")
- Candidates: wordshroom, wordkife, lyricspawn, lyrifier, rubicword, wordy, diddlizer.com, wordilizer.com, wordmuck.com, wordcramps.com
- Affects: page title, header brand, email templates, domain
- See memory: `project_name_candidates.md`
