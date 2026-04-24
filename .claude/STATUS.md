# LyricEngine - Status

**Last updated:** 2026-04-15 (session 21)
**Branch:** main
**Last commit:** 6cfef0e - Email OTP auth, user settings, account deletion (GDPR) (pushed)
**origin/main:** 6cfef0e

## Current State
Email OTP authentication is fully live. Users sign in passwordlessly via a 6-8 digit code emailed by Supabase. Session persists via `@supabase/ssr` cookies (7-day refresh token, auto-refreshed by `proxy.ts` on every request). The hardcoded `DEV_USER_ID` is gone - API routes extract the real user from cookies, pass authenticated supabase client + userId through wordService, and RLS now enforces `auth.uid()` on user-scoped tables. User avatar dropdown in header opens Settings, where users can sign out or permanently delete their account (GDPR right-to-erasure). Account deletion cascades via DB trigger to `user_activity`, `workspaces`, and `users`.

## What Was Done (2026-04-11 through 2026-04-15, Sessions 20-21)

### Session 21 (this session): Auth end-to-end

#### Supabase client refactor
- Replaced singleton `app/src/lib/supabase.ts` with three factories under `app/src/lib/supabase/`:
  - `client.ts` - browser client (`createBrowserClient` from `@supabase/ssr`)
  - `server.ts` - server client for route handlers (`createServerClient`, `await cookies()` from `next/headers`)
  - `proxy.ts` - proxy client that reads request cookies and writes refreshed tokens to response
  - `types.ts` - moved `UserRow`, `WordRow`, `WordRelationRow`, `RelationType` here
- All types still re-exported via `wordService.ts` so existing imports keep working

#### Session refresh proxy
- `app/src/proxy.ts` (NOT middleware.ts - Next.js 16 renamed it to `proxy.ts` with `proxy` export)
- Calls `supabase.auth.getUser()` on every request to refresh tokens if needed
- Matcher excludes static assets, favicon, image files
- No auth redirects in the proxy - gating happens in `LoginGate` client-side and in API route handlers

#### AuthProvider + LoginGate
- `AuthProvider.tsx` - React context (same pattern as ThemeProvider), exposes `user`, `loading`, `signInWithOtp(email)`, `verifyOtp(email, token)`, `signOut()`
- `LoginGate.tsx` - two-phase inline form (email -> code), loading state, error handling, resend code, use different email
- Wired into `layout.tsx` as `<ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>`
- `page.tsx` wraps `<LyricEngineApp />` in `<LoginGate>`
- Login UI supports OTP codes up to 8 digits (matches Supabase's default OTP length)
- Added `autoComplete="one-time-code"` to suppress iCloud Passwords popup

#### API routes
- `/api/rhymes` and `/api/relations`: extract user via `supabase.auth.getUser()`, return 401 if unauthenticated, pass `user.id` to wordService
- `/api/account` DELETE: new endpoint. Verifies user session, then uses service role client to call `auth.admin.deleteUser(user.id)`. The on_auth_user_deleted trigger cascades to public tables.

#### wordService refactor
- Removed `DEV_USER_ID` constant entirely
- All functions (`getRhymes`, `getRelations`, and internal helpers `ensureWord`, `isCached`, `getCachedRelations`, `writeToCache`, `checkUsageLimit`, `incrementUsage`, `logActivity`) take `supabase: SupabaseClient` as first param
- Authed client flows through, so RLS is respected for user-scoped queries

#### UserMenu + Settings page
- `UserMenu.tsx`: lavender circle with first initial of email, dropdown with Settings / Sign out, outside-click dismissal
- Slotted into the header next to ThemeSwitcher
- `/settings` route: profile section (avatar, email, joined date), Account section (email + sign-in method), Sign out button (rose), Delete account button (muted text that expands to confirmation on click)
- Redirect to `/` handled in `useEffect` (not during render - avoids Next.js 16 "setState during render" error)

#### Database migrations (both applied)
- `002_auth_trigger_and_rls.sql`:
  - FK cascades on `ON UPDATE` for `user_activity.user_id` and `workspaces.user_id` (so trigger UUID update cascades)
  - `handle_new_user()` trigger: on `auth.users` INSERT, UPDATE existing row by email if seed exists, else INSERT new row with `default_tier := 'pro'`
  - Tightened RLS: `users` -> `auth.uid() = id`, `user_activity` -> `auth.uid() = user_id`, `workspaces` -> `auth.uid() = user_id` + `is_public = true` for shared
  - Cache tables (`words`, `word_relations`, `word_fetch_log`) stay open by design
- `003_user_deletion_cascade.sql`:
  - `handle_user_deleted()` BEFORE DELETE trigger on `auth.users`
  - Cascades deletion to `user_activity`, `workspaces`, `users` in that order
  - Powers both Supabase dashboard deletion and API-driven GDPR deletion

#### Email templates
- Updated "Confirm sign up" and "Magic link" templates in Supabase dashboard
- Both now include `{{ .Token }}` for the OTP code AND `{{ .ConfirmationURL }}` link - user can use either
- `{{ .ConfirmationURL }}` is the canonical full URL; `.SiteURL + .TokenHash` is unnecessary manual reconstruction

#### Supabase dashboard config (done by Kipp)
- Email provider enabled
- OTP length: 8 digits (UI accommodates this; 6-digit minimum for verify button)
- OTP expiration: 3600s
- Password-related settings ignored (never used - our code only calls OTP methods)

#### Fixes during integration
- Pre-existing `d3-force-3d` type error blocking build - added `app/src/d3-force-3d.d.ts` declaration
- Settings page redirect was firing during render - moved `router.push("/")` into `useEffect`

### Session 20: Drill color + graph physics (context)
Drill color pill system, label-aware collide force, pinned root, pin-on-drop drag, cluster label luminance branching. Committed as 47a52ef.

## Known Bugs / Remaining Issues
- **Usage limit counter not resetting monthly** - deferred, not urgent
- **RLS anon DELETE** - per memory, `DELETE` returns 204 but does nothing; workaround: service role key
- Right-click on graph word nodes still occasionally requires multiple attempts (flagged session 19, not revisited)
- Supabase Pro tier rate-limits built-in email to ~4/hour on free tier; fine for friends testing but needs custom SMTP (Resend, Postmark) before broader launch

## Key Decisions

### Stack
- **Next.js 16.2.2** with Turbopack. `proxy.ts` (not `middleware.ts`). Node.js runtime for proxy (not edge).
- **Supabase** for Postgres + Auth. `@supabase/ssr` 0.10.2 for cookie-based Next.js integration.
- **Dev port: 4000**

### Auth
- **Passwordless email OTP only** for now. No passwords, no OAuth yet. Supabase's default Email provider covers both password and OTP - password settings are inert because our code only calls `signInWithOtp` and `verifyOtp`.
- **Session model**: cookies via `@supabase/ssr`. Proxy refreshes tokens on every request. No localStorage tokens.
- **Anonymous browsing: NOT supported**. All usage requires email. Decision: Kipp wants visibility into who uses it and how much.
- **User provisioning**: DB trigger on `auth.users` INSERT. Handles seed user transition via email match + UUID update + FK cascades.
- **Default tier for new users: `'pro'`** during friends-testing phase. One-line change to `'free'` in the trigger when going to production.
- **GDPR deletion**: self-service button in settings, service-role-key-backed API, DB cascade trigger.

### Wordservice signature change
- All public and private wordService functions now take `supabase: SupabaseClient` as first param
- `userId` is required (no defaults) - route handlers extract and pass it
- This makes the layer portable: swap Supabase for another Postgres provider without changing the SQL

### Login UI
- Two-phase inline form on the same page (not a separate route)
- Styled with existing CSS variables / Tailwind - inherits current theme
- Login screen styling/theme polish is on the backlog

## What's Next (in order)

1. **Backend DB hosting evaluation** - critical to decide BEFORE Stripe locks in more Supabase surface area. Compare MySQL-on-Hostinger (included in existing plan) vs continuing Supabase ($25/mo Pro when needed). Prototype wordService against MySQL to gauge rewrite effort.
2. **OAuth providers** - Google, Apple/iCloud, Facebook. All free on Supabase. Google first (lowest friction).
3. **Custom SMTP** (Resend) - remove Supabase branding from emails, remove 4/hour rate limit.
4. **Login screen polish** - styling/theming, product name (TBD: wordshroom, wordkife, lyricspawn, lyrifier, rubicword, wordy, diddlizer, wordilizer, wordmuck, wordcramps).
5. **WS8** - persist bg opacity to localStorage, tier gating, theme cascade (tab > workspace > user default > system default).
6. **WS10 (Admin)** - config table, is_admin flag on users, admin page with system defaults (login theme, default tier).
7. **WS6 (Workspaces & Sharing)** - auto-save tab state, share tokens.
8. **WS7 (Stripe)** - subscription billing, webhook handler, tier management. Full workstream. Gated behind DB hosting decision.
9. **WS9 (Export)** - Print/CSV/PDF/Excel.

## Deferred / Not Doing
- 3D graph mode, Cytoscape layouts, Tree TD/LR dagModes, long-press bottom sheet, abstraction layer around rhyme engine (see prior status).
- Anonymous-to-authenticated upgrade path (Supabase supports it, but Kipp chose gated-only).

## Run the app
`cd /Users/kippkoenig/Dev/LyricEngine/app && npm run dev`
Dev server: http://localhost:4000 (kill stuck processes with `lsof -ti:4000 | xargs kill -9`)
Logs: `app/logs/YYYY-MM-DD.log`

## Environment (`app/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - secret, server-only, used for account deletion endpoint (NO `NEXT_PUBLIC_` prefix)
- `TIER_LIMIT_FREE=20`, `TIER_LIMIT_BASIC=100`, `TIER_LIMIT_PRO` (empty=unlimited)
- `PHRASES_API_UID`, `PHRASES_API_TOKEN` - STANDS4 Phrases API
- `NEXT_PUBLIC_DEV_USER_ID` - no longer read by code, safe to remove

## Key Files (new/changed this session)
- `app/src/lib/supabase/client.ts` - browser client factory
- `app/src/lib/supabase/server.ts` - server client factory (async `cookies()`)
- `app/src/lib/supabase/proxy.ts` - proxy client factory
- `app/src/lib/supabase/types.ts` - DB row types (moved from old supabase.ts)
- `app/src/proxy.ts` - session refresh on every request
- `app/src/components/AuthProvider.tsx` - auth context + useAuth hook
- `app/src/components/LoginGate.tsx` - two-phase OTP login form
- `app/src/components/UserMenu.tsx` - header avatar dropdown
- `app/src/app/settings/page.tsx` - user settings + delete account
- `app/src/app/api/account/route.ts` - DELETE endpoint using service role key
- `app/src/app/api/rhymes/route.ts` - now extracts user from cookies
- `app/src/app/api/relations/route.ts` - same
- `app/src/lib/wordService.ts` - DEV_USER_ID removed, supabase client param required
- `supabase/migrations/002_auth_trigger_and_rls.sql` - trigger, RLS, FK cascades
- `supabase/migrations/003_user_deletion_cascade.sql` - deletion cascade trigger
- `app/src/d3-force-3d.d.ts` - type declaration fix
