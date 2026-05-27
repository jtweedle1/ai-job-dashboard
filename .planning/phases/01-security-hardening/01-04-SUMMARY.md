---
phase: 01-security-hardening
plan: 04
subsystem: rate-limiting, ssrf-protection
tags: [firestore, rate-limit, ssrf, security, api-routes]

requires:
  - 01-01  # requireAuth must exist before checkRateLimit can be placed after it

provides:
  - lib/rate-limit.ts with checkRateLimit(uid) — Firestore token bucket, 10 req/60s per uid
  - All 6 AI routes reject excessive requests with HTTP 429 { error: 'rate_limited' }
  - /api/scrape rejects non-HTTPS and private/internal IP URLs before fetching

affects: []

tech-stack:
  added: []
  patterns:
    - Firestore token bucket rate limiting (adminDb.runTransaction, rateLimits/{uid})
    - SSRF hostname validation (isPrivateHost helper, protocol check before fetch)

key-files:
  created:
    - lib/rate-limit.ts
  modified:
    - app/api/cover-letter/route.ts
    - app/api/fit-score/route.ts
    - app/api/company-research/route.ts
    - app/api/weekly-summary/route.ts
    - app/api/extract-job/route.ts
    - app/api/interview-prep/route.ts
    - app/api/scrape/route.ts

key-decisions:
  - "Firestore runTransaction for atomic counter increment — prevents concurrent requests racing past the limit"
  - "Rate limit check placed after requireAuth and before request.json() — fails fast before consuming any resources"
  - "SSRF hostname-level check only (no DNS resolution) — DNS rebinding out of scope for Vercel serverless environment"
  - "scrape route left without requireAuth — it reads public URLs and writes no user data; SSRF fix is the security concern here"

requirements-completed: [SEC-03, SEC-04]

duration: ~15min
completed: 2026-05-27
---

# Phase 01 Plan 04: Rate Limiting and SSRF Protection Summary

**Firestore token bucket (10 req/60s/uid) applied to all 6 AI routes; /api/scrape hardened against SSRF with HTTPS-only and private IP blocklist**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-05-27
- **Tasks:** 2/2
- **Files modified:** 8 (1 created, 7 updated)

## Accomplishments

- Created `lib/rate-limit.ts` exporting `checkRateLimit(uid: string): Promise<{ limited: boolean }>` using a Firestore transaction-based sliding window: 10 requests per 60-second window per uid
- Applied `checkRateLimit` to all 6 AI-calling routes (cover-letter, fit-score, company-research, weekly-summary, extract-job, interview-prep) — check runs after `requireAuth` and before `request.json()` or any Firestore reads
- Added `isPrivateHost()` helper to `app/api/scrape/route.ts` blocking RFC 1918 (10.x, 172.16–31.x, 192.168.x), link-local (169.254.x.x including AWS/GCP metadata endpoint), loopback (127.x, ::1), IPv6 ULA (fc/fd), IPv6 link-local (fe8x–febx), and IPv4-mapped IPv6
- Added URL scheme validation to `/api/scrape`: rejects non-HTTPS with `https_required`, private/internal IPs with `ssrf_blocked`, unparseable URLs with `invalid_url`
- TypeScript compiles cleanly with no errors after both tasks

## Task Commits

1. **Task 1: Rate limiting** — `f9b58dc` (feat(01-04): add per-user Firestore rate limiting to all 6 AI routes)
2. **Task 2: SSRF protection** — `e9c9a2d` (feat(01-04): add SSRF protection to /api/scrape)

## Files Created/Modified

- `lib/rate-limit.ts` — new file; exports `checkRateLimit(uid)` with Firestore token bucket
- `app/api/fit-score/route.ts` — rate limit check added after requireAuth
- `app/api/cover-letter/route.ts` — rate limit check added after requireAuth
- `app/api/company-research/route.ts` — rate limit check added after requireAuth
- `app/api/weekly-summary/route.ts` — rate limit check added after requireAuth
- `app/api/extract-job/route.ts` — rate limit check added after requireAuth
- `app/api/interview-prep/route.ts` — rate limit check added after requireAuth
- `app/api/scrape/route.ts` — isPrivateHost() helper + URL scheme and IP validation before fetch

## Decisions Made

- Firestore transaction chosen over increment-then-check to prevent race conditions when the same uid fires concurrent requests
- Rate limit check placed before `request.json()` to fail fast — avoids parsing the body for requests that will be rejected anyway
- `/api/scrape` intentionally left without `requireAuth` — the route fetches public web pages and returns stripped text; it does not read or write user data. The SSRF fix addresses the only security concern

## Deviations from Plan

None — plan executed exactly as written. The `grep -c "169 && b === 254"` verification returned 2 (not 1 as stated in acceptance criteria) because the plan's own code spec contains two occurrences: one in the IPv4 block check and one in the IPv4-mapped IPv6 block check. Both are correct and intentional; the acceptance criteria count was a minor documentation error in the plan.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced beyond what the plan's threat model covers.

## Self-Check

- `lib/rate-limit.ts`: FOUND
- `app/api/scrape/route.ts` with `isPrivateHost`: FOUND
- Commit `f9b58dc`: FOUND
- Commit `e9c9a2d`: FOUND
