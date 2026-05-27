---
phase: 01-security-hardening
plan: 02
subsystem: infra
tags: [encryption, firebase-admin, firebase-storage, startup-assertions, security-rules, aes-256-gcm]

# Dependency graph
requires: []
provides:
  - lib/encryption.ts throws descriptive error at module load if ENCRYPTION_SECRET is missing or invalid
  - lib/firebase-admin.ts validates all three required Firebase Admin env vars and PEM key format before initializeApp
  - storage.rules enforces owner-UID-only access with 5 MB resume write cap
affects: [02-smart-weekly-review, any phase importing lib/encryption.ts or lib/firebase-admin.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level startup assertion pattern for env var validation (fail fast before any request)
    - PEM header check for private key validation
    - Firebase Storage security rules with default-deny + owner-UID access + size cap

key-files:
  created:
    - storage.rules
  modified:
    - lib/encryption.ts
    - lib/firebase-admin.ts

key-decisions:
  - "Startup assertions at module load time (not inside request handlers) so cold starts with broken config fail immediately with descriptive errors"
  - "PEM header check validates FIREBASE_PRIVATE_KEY format before initializeApp to catch malformed keys that would produce cryptic SDK errors"
  - "storage.rules uses /{uid}/... path convention consistent with Firestore users/{uid}/... pattern; more-specific /resumes/ rule takes precedence for size cap"
  - "storage.rules not deployed in this plan — firebase CLI auth is a human action; file ready for manual or CI deployment"

patterns-established:
  - "Fail-fast env validation: validate presence, then validate format, before any SDK init"
  - "Wrap third-party SDK init in try/catch re-throwing a descriptive Error with troubleshooting context"

requirements-completed: [SEC-02, SEC-05]

# Metrics
duration: 8min
completed: 2026-05-27
---

# Phase 01 Plan 02: Security Hardening — Startup Assertions and Storage Rules Summary

**AES-256-GCM and Firebase Admin SDK now fail fast at cold start with descriptive errors; Firebase Storage secured with default-deny owner-UID rules and 5 MB resume cap**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-27T16:04:00Z
- **Completed:** 2026-05-27T16:12:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments

- lib/encryption.ts: module-level assertion throws `"ENCRYPTION_SECRET env var is missing or invalid. Expected a 64-character hex string (32 bytes)..."` before any encrypt/decrypt call can run
- lib/firebase-admin.ts: validates FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY presence, checks PEM header on processed key, wraps initializeApp in try/catch with descriptive error
- storage.rules: created at project root — default-deny, owner-UID read/write under /{uid}/..., 5 MB write cap on /{uid}/resumes/{fileName}; ready for `firebase deploy --only storage`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add startup assertions to lib/encryption.ts and lib/firebase-admin.ts** - `56d8ace` (feat)
2. **Task 2: Create storage.rules — owner-UID access restriction** - `4ef9d0c` (feat)

**Plan metadata:** (committed after SUMMARY creation)

## Files Created/Modified

- `lib/encryption.ts` - Added module-level KEY.length assertion; throws descriptive error before any encrypt/decrypt if ENCRYPTION_SECRET absent or invalid
- `lib/firebase-admin.ts` - Added env var presence loop + PEM header check + try/catch wrapping initializeApp; uses pre-processed privateKey variable
- `storage.rules` - New file at project root; default-deny, owner-UID read/write, 5 MB resume cap; deploy comment included

## Decisions Made

- Startup assertions placed at module level (not inside function calls) so they fire at cold start before any request handler runs — this is the key SEC-02 requirement
- PEM header check accepts both `-----BEGIN RSA PRIVATE KEY-----` and `-----BEGIN PRIVATE KEY-----` formats (RSA and PKCS#8 are both valid Firebase service account key formats)
- storage.rules uses `/{uid}/...` root-level path convention (not `users/{uid}/...`) matching Firebase Storage defaults; comment added to flag if app uses a different prefix
- More-specific `/{uid}/resumes/{fileName}` rule takes precedence over broad `/{uid}/{allPaths=**}` rule, enforcing the 5 MB cap on resume writes without capping other file types

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript strict mode passed with no errors after both changes.

## Known Stubs

None.

## Threat Flags

No new security-relevant surface introduced beyond what is described in the plan's threat model. All T-02-0x mitigations implemented.

## User Setup Required

**Storage rules require manual deployment:**
```
firebase deploy --only storage
```
Or via Firebase Console: Storage > Rules.

No new environment variables required — this plan hardens existing env var handling.

## Next Phase Readiness

- SEC-02 and SEC-05 requirements complete
- Misconfigured deployments will now fail fast with actionable error messages
- Firebase Storage access is gated by owner-UID rules once deployed
- storage.rules ready for deployment via Firebase CLI or CI pipeline

---
*Phase: 01-security-hardening*
*Completed: 2026-05-27*

## Self-Check: PASSED

- lib/encryption.ts: FOUND
- lib/firebase-admin.ts: FOUND
- storage.rules: FOUND
- 01-02-SUMMARY.md: FOUND
- Commit 56d8ace: FOUND
- Commit 4ef9d0c: FOUND
