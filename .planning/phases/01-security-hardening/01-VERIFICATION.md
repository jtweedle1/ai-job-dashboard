---
phase: 01-security-hardening
verified: 2026-05-27T00:00:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "storage.rules is deployed and enforces that only the file owner's UID can read or write their files in Firebase Storage"
    status: failed
    reason: "storage.rules file exists at the project root with correct rule content, but the ROADMAP Success Criterion explicitly says 'is deployed' — the rules have not been deployed to the live Firebase Storage bucket. The PLAN and SUMMARY both acknowledge this: 'deployment requires firebase CLI authentication which is a human action'. The file in the repo is not active until deployed."
    artifacts:
      - path: "storage.rules"
        issue: "File exists with correct rules content, but Firebase Storage rules require deployment via 'firebase deploy --only storage' to take effect. The rules are not currently enforcing anything on the live bucket."
    missing:
      - "Run: firebase deploy --only storage (or deploy via Firebase Console > Storage > Rules) to make the rules active"
      - "Update REQUIREMENTS.md to check [x] SEC-05 once deployed"
      - "Update REQUIREMENTS.md to check [x] SEC-01 and SEC-02 (both are implemented in code but remain unchecked)"

human_verification:
  - test: "Confirm Firebase Storage rules are deployed and active"
    expected: "Firebase Console > Storage > Rules shows the owner-UID rules from storage.rules are live, not the default allow-all rules"
    why_human: "Cannot verify Firebase Console state programmatically — requires browser access to the Firebase project console or running firebase deploy --only storage to deploy and confirm"
---

# Phase 1: Security Hardening Verification Report

**Phase Goal:** Every API route verifies caller identity server-side, the app fails fast on misconfiguration, rate limiting protects each user's Anthropic quota, SSRF is blocked in /api/scrape, and Firebase Storage has deployed access rules
**Verified:** 2026-05-27
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A request to any AI API route with a known uid but no valid Firebase ID token is rejected with HTTP 401 — the uid from the request body is ignored | VERIFIED | All 7 routes import and call `requireAuth(request)` before any business logic. `lib/auth-server.ts` verifies Firebase ID token via `getAuth().verifyIdToken()`, returns 401 on missing/invalid token. No route reads uid from body or query string. |
| 2 | Deploying without ENCRYPTION_SECRET or a required FIREBASE_* env var causes an immediate startup error with a descriptive message | VERIFIED | `lib/encryption.ts` throws at module load if `KEY.length !== 32`. `lib/firebase-admin.ts` loops over FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY at module level and throws descriptive errors. PEM header check and try/catch on `initializeApp` also present. |
| 3 | A user who fires the same AI endpoint repeatedly in a tight loop receives HTTP 429 after hitting the per-UID limit — other users are unaffected | VERIFIED | `lib/rate-limit.ts` exports `checkRateLimit(uid)` using Firestore transaction-based token bucket (10 req / 60s / uid). All 6 AI routes call `checkRateLimit(uid)` after `requireAuth` and before `request.json()`. Rate counters are keyed by uid in `rateLimits/{uid}`. |
| 4 | A request to /api/scrape with an RFC 1918 or link-local URL (e.g., http://169.254.169.254/) is rejected with an error — only public HTTPS URLs are fetched | VERIFIED | `app/api/scrape/route.ts` contains `isPrivateHost()` helper blocking 10.x, 172.16-31.x, 192.168.x, 169.254.x (link-local), 127.x, 0.0.0.0, ::1, IPv6 ULA/link-local, IPv4-mapped IPv6. Protocol check rejects non-HTTPS with `https_required`. Private IPs rejected with `ssrf_blocked`. |
| 5 | storage.rules is deployed and enforces that only the file owner's UID can read or write their files in Firebase Storage | FAILED | `storage.rules` file exists at project root with correct default-deny + owner-UID + 5 MB cap rules. However, the rules have NOT been deployed to Firebase. The PLAN explicitly deferred deployment as a human action, and the SUMMARY includes a "User Setup Required" section with the deploy command. The rules file in the repo has no effect until deployed. |

**Score:** 4/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/auth-server.ts` | requireAuth helper — verifies Firebase ID token | VERIFIED | Exports `requireAuth(request): Promise<NextResponse \| { uid: string }>`. Reads Authorization header, calls `getAuth().verifyIdToken()`, returns 401 or `{ uid }`. Never throws. |
| `lib/encryption.ts` | AES-256-GCM encrypt/decrypt with startup assertion | VERIFIED | Module-level `if (KEY.length !== 32) throw` present. Error message contains "64-character hex string". `encrypt()` and `decrypt()` functions unchanged. |
| `lib/firebase-admin.ts` | Firebase Admin init with env var validation and error boundary | VERIFIED | Presence loop for all 3 env vars, PEM header check, `initializeApp` wrapped in try/catch. Uses pre-processed `privateKey` variable. |
| `storage.rules` | Firebase Storage security rules — owner-only read/write | PARTIAL | File exists with correct content: default-deny, `request.auth.uid == uid` checks, 5 MB resume cap, deploy comment. Not deployed to Firebase. |
| `lib/api-client.ts` | authedFetch(url, options) — wraps fetch with Authorization header | VERIFIED | Exports `authedFetch`. Calls `auth.currentUser.getIdToken()`, sets `Authorization: Bearer` header, preserves all other options. Never includes uid. |
| `lib/rate-limit.ts` | Per-uid Firestore token bucket rate limiter | VERIFIED | Exports `checkRateLimit(uid: string): Promise<{ limited: boolean }>`. Uses `adminDb.runTransaction`, `WINDOW_SECONDS = 60`, `MAX_REQUESTS = 10`, `Timestamp` from `firebase-admin/firestore`. |
| `app/api/fit-score/route.ts` | Fit score route using requireAuth + checkRateLimit | VERIFIED | Imports `requireAuth` and `checkRateLimit`. Auth check before `request.json()`. Rate limit after auth, before body parse. No uid from body. |
| `app/api/scrape/route.ts` | Scrape route with SSRF protection | VERIFIED | Contains `isPrivateHost()` helper. Validates HTTPS protocol. Blocks 169.254.x.x (link-local/AWS metadata), RFC 1918, loopback. Returns `ssrf_blocked` and `https_required` before any fetch. |
| `app/settings/page.tsx` | Settings page using authedFetch, no uid in requests | VERIFIED | Imports `authedFetch`. GET call: `authedFetch("/api/settings/api-key")` — no uid query param. POST: body contains only `{ apiKey }`. DELETE: body is `{}`. |
| `components/AddJobModal.tsx` | AddJobModal using authedFetch for extract-job — no uid in body | VERIFIED | Imports `authedFetch`. `/api/extract-job` call uses `authedFetch` with body `{ text: jdText.trim() }` — no uid. `/api/scrape` remains as plain `fetch` (correct — scrape has no auth). |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| all 7 route.ts files | lib/auth-server.ts | `import { requireAuth }` | WIRED | Confirmed via grep: 7 files match in `app/api/`. Settings route includes GET, POST, DELETE handlers. |
| lib/auth-server.ts | firebase-admin/auth | `getAuth().verifyIdToken(token)` | WIRED | `lib/auth-server.ts` line 24: `const decoded = await getAuth().verifyIdToken(token)` |
| all 6 AI routes | lib/rate-limit.ts | `import { checkRateLimit }` | WIRED | Grep confirms 6 files (excludes settings/api-key — correct, it does not call AI). Order verified: after requireAuth, before request.json(). |
| lib/rate-limit.ts | adminDb (Firestore) | `adminDb.collection('rateLimits').doc(uid)` | WIRED | `lib/rate-limit.ts` line 8: exact pattern present. Uses `adminDb.runTransaction` for atomicity. |
| app/api/scrape/route.ts | URL validation | `isPrivateHost()` + protocol check | WIRED | Function defined at module level (lines 3–52), called at lines 81–83. Both `ssrf_blocked` and `https_required` responses confirmed. |
| all client pages | lib/api-client.ts | `import { authedFetch }` | WIRED | Grep confirms 7 tsx files: settings, AddJobModal, applications/[jobId], companies/[companyId], cover-letters, interview-prep, weekly-review. |
| lib/api-client.ts | firebase/auth (getIdToken) | `auth.currentUser.getIdToken()` | WIRED | `lib/api-client.ts` line 12: `const idToken = await auth.currentUser.getIdToken()` |
| storage.rules | Firebase Storage paths | `match /{uid}/{allPaths=**}` | NOT_DEPLOYED | Rules file has correct `request.auth.uid == uid` pattern but is not deployed to the Firebase project. |

---

## Data-Flow Trace (Level 4)

Not applicable for this phase — phase delivers security infrastructure (auth helpers, rate limiters, validation functions) rather than components that render dynamic data. No data-flow trace required.

---

## Behavioral Spot-Checks

Step 7b: SKIPPED for server-side checks requiring a running dev server with valid Firebase credentials. Cannot execute Firebase token verification checks without a live Firebase project connection.

Static code analysis confirms:
- `requireAuth` returns 401 for missing/invalid Authorization header before any other logic runs
- `checkRateLimit` returns `{ limited: true }` path triggers `return NextResponse.json({ error: "rate_limited" }, { status: 429 })` in all 6 AI routes
- `isPrivateHost("169.254.169.254")` would return `true` (a=169, b=254 matches the link-local check on line 20)
- `parsedUrl.protocol !== "https:"` check blocks `http://` before `isPrivateHost` is even called

---

## Probe Execution

No probes declared or found. Phase did not include probe scripts.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 01-01, 01-03 | Firebase ID token verification on all API routes | SATISFIED | `requireAuth` in all 7 server routes; `authedFetch` on all 7 client callers; no uid from body/query anywhere in API routes |
| SEC-02 | 01-02 | Startup fail-fast on missing/malformed env vars | SATISFIED | Module-level assertions in `lib/encryption.ts` and `lib/firebase-admin.ts` confirmed in code |
| SEC-03 | 01-04 | Per-user rate limiting on AI-calling endpoints | SATISFIED | `checkRateLimit` confirmed in all 6 AI routes; Firestore token bucket keyed by uid |
| SEC-04 | 01-04 | /api/scrape SSRF protection | SATISFIED | `isPrivateHost()` + HTTPS-only check confirmed in `app/api/scrape/route.ts` |
| SEC-05 | 01-02 | Firebase Storage security rules deployed | BLOCKED | `storage.rules` file is correct but not deployed — Firebase Storage currently running without owner-UID enforcement |

**Note on REQUIREMENTS.md status:** REQUIREMENTS.md shows SEC-01, SEC-02, and SEC-05 as `[ ]` (unchecked/Pending) despite SEC-01 and SEC-02 being fully implemented in code. SEC-03 and SEC-04 are correctly checked `[x]`. The Traceability table also still shows these as "Pending." This is a documentation inconsistency — the implementation is correct but the requirements tracker was not updated for SEC-01 and SEC-02.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | - | - | - | - |

No TBD, FIXME, XXX, or placeholder patterns found in any modified files. No empty return stubs. No hardcoded empty data passed to renderers.

---

## Human Verification Required

### 1. Deploy Firebase Storage Rules

**Test:** Run `firebase deploy --only storage` from the project root with valid Firebase CLI credentials, then navigate to Firebase Console > Storage > Rules and confirm the deployed rules match `storage.rules` (default-deny, owner-UID read/write, 5 MB resume cap).

**Expected:** Firebase Console shows the new rules are live. An authenticated user can read/write only under their own UID path. Unauthenticated or cross-user access is denied.

**Why human:** Firebase Storage rule deployment requires firebase CLI authentication and a live Firebase project. Cannot be verified by static code analysis. The rules file is correct — only the deployment step is outstanding.

---

## Gaps Summary

One gap blocks full goal achievement:

**SEC-05 — Storage rules not deployed.** The `storage.rules` file at the project root contains correct, complete security rules (default-deny, owner-UID access, 5 MB resume cap). However, the ROADMAP Success Criterion 5 states the rules must be "deployed." The PLAN acknowledged this gap explicitly, deferring it as a human action requiring Firebase CLI. Until `firebase deploy --only storage` is run, Firebase Storage is operating without owner-UID enforcement — any authenticated Firebase user could potentially read another user's stored files.

**Resolution:** One command: `firebase deploy --only storage`. After deploying, update REQUIREMENTS.md to check [x] SEC-05 (and also [x] SEC-01, [x] SEC-02 which are implemented but unchecked).

**All other security controls are fully implemented and wired:**
- SEC-01: All 7 server routes verified server-side via Firebase ID token; all 7 client callers use authedFetch
- SEC-02: Both lib/encryption.ts and lib/firebase-admin.ts throw descriptive errors at module load for missing/malformed env vars
- SEC-03: Firestore token bucket rate limiting (10 req/60s/uid) applied to all 6 AI routes
- SEC-04: SSRF and HTTPS enforcement confirmed in /api/scrape

---

_Verified: 2026-05-27_
_Verifier: Claude (gsd-verifier)_
