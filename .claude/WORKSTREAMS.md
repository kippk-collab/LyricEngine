# LyricEngine - Workstreams

**Last updated:** 2026-04-15 (session 21)

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

- [ ] Supabase `config` table
- [ ] Admin page (protected route)
- [ ] `is_admin` boolean column on users table
- [ ] Admin-only access check in layout
- [ ] DB-driven tier limits (replace env var limits)
- [ ] Admin-configurable default login theme
- [ ] Admin-configurable default new-user tier (currently hardcoded 'pro' in trigger)
- [ ] Seed default config rows
- [ ] Email template management (future - currently in Supabase dashboard)

## Cross-cutting / Not assigned to a workstream

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
