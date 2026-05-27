---
phase: 01-security-hardening
plan: "03"
subsystem: auth
tags: [firebase-auth, fetch, id-token, api-client]

requires:
  - phase: 01-01
    provides: requireAuth server helper that verifies Firebase ID token from Authorization header

provides:
  - authedFetch helper (lib/api-client.ts) that attaches Firebase ID token to every API request
  - All 7 client pages and components updated to use authedFetch instead of sending uid in body

affects:
  - Phase 2 (smart weekly review) — any new client→API calls should use authedFetch
  - Phase 3 (AI quality) — same authedFetch pattern applies to any new routes

tech-stack:
  added: []
  patterns:
    - "authedFetch: replace fetch('/api/...') with authedFetch('/api/...') in all client components calling AI routes"
    - "No uid in request body: auth derives uid server-side from Firebase ID token"

key-files:
  created:
    - lib/api-client.ts
  modified:
    - app/applications/[jobId]/page.tsx
    - app/companies/[companyId]/page.tsx
    - app/cover-letters/page.tsx
    - app/interview-prep/page.tsx
    - app/weekly-review/page.tsx
    - app/settings/page.tsx
    - components/AddJobModal.tsx

key-decisions:
  - "authedFetch uses auth.currentUser.getIdToken() — auto-refreshes expiring tokens without extra logic"
  - "lib/api-client.ts is a plain TS module (no 'use client') — safe to import from any client component"
  - "Settings GET /api/settings/api-key no longer takes uid query param — auth header only"

patterns-established:
  - "authedFetch pattern: all client→AI-route calls go through authedFetch, never plain fetch"
  - "No uid in body: uid is derived server-side from verified Firebase ID token"

requirements-completed:
  - SEC-01

duration: ~20min
completed: "2026-05-27"
---

# Plan 01-03: Client Auth Migration Summary

**authedFetch helper created and deployed across all 7 client callers — no uid in API request bodies**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-27
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `lib/api-client.ts` with `authedFetch(url, options)` — wraps fetch with a fresh Firebase ID token in the `Authorization: Bearer` header
- Updated all 7 client pages/components (settings, AddJobModal, applications, companies, cover-letters, interview-prep, weekly-review) to use authedFetch
- Removed `uid` from every API request body — server derives uid from verified token
- Settings GET endpoint no longer uses `?uid=` query param — header-only auth

## Task Commits

1. **Task 1: Create lib/api-client.ts** — `a2cd1ee` (feat)
2. **Task 2: Update all client callers** — `4e2618a` (feat)
3. **ROADMAP update** — `37831ed` (docs)

## Files Created/Modified

- `lib/api-client.ts` — authedFetch helper: gets ID token, sets Authorization header, proxies all other options
- `app/settings/page.tsx` — 3 calls (GET, POST, DELETE) converted; GET no longer uses uid query param
- `app/applications/[jobId]/page.tsx` — fit-score call converted
- `app/companies/[companyId]/page.tsx` — company-research call converted
- `app/cover-letters/page.tsx` — cover-letter call converted
- `app/interview-prep/page.tsx` — interview-prep call converted
- `app/weekly-review/page.tsx` — weekly-summary call converted
- `components/AddJobModal.tsx` — extract-job call converted; /api/scrape left as plain fetch (no auth needed)

## Decisions Made

- `auth.currentUser` used directly (not via `useAuth` hook) so the helper works as a plain module outside React
- `/api/scrape` intentionally left as plain `fetch` — it does not access user data and has no auth requirement

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Client auth migration complete; all AI routes are now end-to-end authenticated
- Plan 01-04 (rate limiting + SSRF) can proceed — it uses `requireAuth`'s `uid` output, which is now always server-verified

---
*Phase: 01-security-hardening*
*Completed: 2026-05-27*
