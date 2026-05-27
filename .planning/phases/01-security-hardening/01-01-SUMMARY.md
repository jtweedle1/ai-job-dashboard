---
phase: 01-security-hardening
plan: 01
subsystem: auth
tags: [firebase, firebase-admin, jwt, auth, server-side]

requires: []
provides:
  - lib/auth-server.ts with requireAuth() — extracts and verifies Firebase ID token from Authorization header
  - All 7 API routes derive uid from verified token, never from request body or query string

affects: [01-03, 01-04]

tech-stack:
  added: []
  patterns: [requireAuth return-based pattern (NextResponse | { uid }), Authorization Bearer header verification]

key-files:
  created: [lib/auth-server.ts]
  modified:
    - app/api/cover-letter/route.ts
    - app/api/fit-score/route.ts
    - app/api/company-research/route.ts
    - app/api/weekly-summary/route.ts
    - app/api/extract-job/route.ts
    - app/api/interview-prep/route.ts
    - app/api/settings/api-key/route.ts

key-decisions:
  - "requireAuth returns NextResponse | { uid } (never throws) — callers check instanceof NextResponse"
  - "uid is derived from Firebase ID token only — request body/query string uid is never read"

patterns-established:
  - "requireAuth pattern: const authResult = await requireAuth(request); if (authResult instanceof NextResponse) return authResult; const { uid } = authResult;"

requirements-completed: [SEC-01]

duration: ~20min
completed: 2026-05-27
---

# Plan 01-01 Summary

**Firebase ID token verification via `requireAuth()` — all 7 API routes now reject uid-from-body and derive identity from a server-verified token**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-05-27
- **Tasks:** 2/2
- **Files modified:** 8 (1 created, 7 updated)

## Accomplishments
- Created `lib/auth-server.ts` exporting `requireAuth(request)` that reads `Authorization: Bearer <token>`, calls `getAuth().verifyIdToken()`, and returns `NextResponse(401)` or `{ uid: string }`
- Updated all 7 API routes: uid is no longer accepted from request body or query params — always derived from verified token
- `app/api/settings/api-key/route.ts` GET handler: removed `?uid=` query param; POST/DELETE: removed uid from body
- TypeScript compiles cleanly with no new errors

## Task Commits

1. **Task 1: Create lib/auth-server.ts** — `1ad9646` (feat: create lib/auth-server.ts — requireAuth server-side helper)
2. **Task 2: Update all 7 API routes** — `45e8ff7` (feat: update all 7 API routes to use requireAuth)

## Files Created/Modified
- `lib/auth-server.ts` — new file; exports `requireAuth(request): Promise<NextResponse | { uid: string }>`
- `app/api/fit-score/route.ts` — uid from token, jobId from body
- `app/api/cover-letter/route.ts` — uid from token, other fields from body
- `app/api/company-research/route.ts` — uid from token
- `app/api/weekly-summary/route.ts` — uid from token
- `app/api/extract-job/route.ts` — uid from token
- `app/api/interview-prep/route.ts` — uid from token
- `app/api/settings/api-key/route.ts` — GET/POST/DELETE all use token; query param removed

## Decisions Made
- Return-based pattern chosen over throw-based: avoids wrapping every route handler in try/catch for auth errors
- Imported `adminDb` from `@/lib/firebase-admin` in auth-server.ts to guarantee Admin SDK initialization before `getAuth()` is called

## Deviations from Plan
None — plan executed exactly as written. Task 2 was committed by orchestrator (subagent lacked Bash permissions for git), but all file changes were written by the subagent.

## Issues Encountered
Subagent lacked Bash permissions so could not `git add` / `git commit` Task 2. Orchestrator verified the changes (correct pattern in all 7 files, TypeScript clean) and committed Task 2 manually.

## Next Phase Readiness
- Wave 2 plans (01-03, 01-04) can now proceed — they depend on requireAuth being available server-side
- 01-03 (client side) must update all client callers to send `Authorization: Bearer` header instead of uid in body
- 01-04 (rate limiting) can call `checkRateLimit(uid)` immediately after `requireAuth`

---
*Phase: 01-security-hardening*
*Completed: 2026-05-27*
