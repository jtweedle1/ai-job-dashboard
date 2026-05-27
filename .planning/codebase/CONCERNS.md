# Concerns

**Analysis Date:** 2026-05-27

---

## Security

**[HIGH] API routes accept a client-supplied `uid` with no server-side identity verification**
- All seven API routes (`/api/cover-letter`, `/api/fit-score`, `/api/company-research`, `/api/weekly-summary`, `/api/extract-job`, `/api/interview-prep`, `/api/settings/api-key`) read a `uid` from the request body or query string and use it directly to read/write Firestore via the Admin SDK.
- Files: `app/api/cover-letter/route.ts`, `app/api/fit-score/route.ts`, `app/api/company-research/route.ts`, `app/api/weekly-summary/route.ts`, `app/api/extract-job/route.ts`, `app/api/interview-prep/route.ts`, `app/api/settings/api-key/route.ts`
- Impact: Any caller who knows a victim's Firebase UID can read their encrypted API key status, trigger AI calls billed to the victim's Anthropic key, generate and persist content to the victim's account, and delete stored API keys. Firebase UIDs are not secret — they appear in client-side tokens.
- Fix: Pass the Firebase ID token in an `Authorization: Bearer <idToken>` header, call `adminAuth.verifyIdToken(token)` in each route handler, and derive `uid` from the verified claim rather than accepting it as input.

**[HIGH] `ENCRYPTION_SECRET` missing at module load silently produces a zero-length key**
- `lib/encryption.ts` line 3: `const KEY = Buffer.from(process.env.ENCRYPTION_SECRET ?? "", "hex")`. If the env var is absent, `KEY` is a 0-byte buffer. `createCipheriv("aes-256-gcm", KEY, iv)` will throw at runtime rather than at startup — a misconfigured deployment appears healthy until the first encrypt/decrypt call.
- Fix: Add a startup assertion: `if (KEY.length !== 32) throw new Error("ENCRYPTION_SECRET must be a 64-char hex string")`. Fail fast at cold start.

**[MEDIUM] `middleware.ts` is a no-op — all routes are publicly reachable**
- `middleware.ts` calls `NextResponse.next()` unconditionally and its matcher explicitly excludes `/api/*`. The `/api/settings/api-key` endpoint (GET, POST, DELETE) is reachable without any session check.
- Fix: Enforce authentication in the middleware or in each route handler via token verification.

**[MEDIUM] `/api/scrape` fetches arbitrary user-supplied URLs from the server (SSRF)**
- `app/api/scrape/route.ts` performs a server-side `fetch(url)` for any URL the client sends, with no allowlist or blocklist.
- Impact: An attacker can probe internal cloud metadata endpoints (e.g., `http://169.254.169.254/`), internal VPC services, or use the server as an open HTTP proxy.
- Fix: Validate that the URL uses `https:` and resolves to a public IP (reject RFC 1918, link-local, and loopback ranges).

**[MEDIUM] PDF files uploaded to Firebase Storage without server-side validation**
- `app/resumes/page.tsx` uploads directly from the browser with only a client-side MIME type check. No file-size cap is enforced before upload.
- Fix: Add a client-side size cap (e.g., 5 MB) and enforce a matching Storage Security Rule.

**[LOW] No Firebase Storage Security Rules file in the repo**
- `firestore.rules` is present. No `storage.rules` file exists.
- Fix: Add `storage.rules` locking reads/writes to `request.auth.uid`.

**[LOW] Resume text (PII) stored as plain text in Firestore**
- Full resume strings containing names, addresses, and employment history are stored unencrypted.
- Current mitigation: Firestore rules restrict access to the owner UID.

---

## Missing / Incomplete Features

**[HIGH] No rate limiting on any AI-calling endpoint**
- Files: all `app/api/` AI routes
- Impact: A single user can hammer endpoints in a tight loop, exhausting their Anthropic quota in seconds.
- Fix: Implement per-UID rate limiting (Upstash/Redis token bucket or Firestore counter with TTL).

**[HIGH] Deleting a job does not cascade-delete related documents**
- `lib/jobs.ts` `deleteJob` deletes only the parent job document. Cover letters, interview preps, and debriefs referencing `jobId` are left orphaned.
- Fix: Write a server-side delete route or Firebase Function trigger that batch-deletes child documents.

**[MEDIUM] No input length cap on job description or resume text sent to AI**
- `app/api/cover-letter/route.ts`, `app/api/fit-score/route.ts`, `app/api/extract-job/route.ts` pass full text into AI prompts with no truncation.
- Impact: Hits model context limits with no user-facing feedback.
- Fix: Truncate at a safe character ceiling (e.g., 30 000 chars) and surface a warning.

**[MEDIUM] `max_tokens: 1024` is shared across all AI calls regardless of task**
- `lib/ai.ts` uses a single hardcoded `max_tokens: 1024`. Company research and interview prep routinely need more, causing JSON to be cut off and `parse_failed` errors.
- Fix: Accept an optional `maxTokens` parameter in `callAI` and pass task-appropriate values at each call site.

**[LOW] No account deletion or data export feature**
- Users can remove their API key but cannot delete their account or export their data — a GDPR/CCPA compliance gap.

---

## Performance

**[MEDIUM] `callAI` creates a new `Anthropic` client instance on every invocation**
- `lib/ai.ts` line 28: `const client = new Anthropic({ apiKey })` — a new SDK client per request, losing connection pooling benefits.
- Fix: Cache a client instance keyed by a hash of the API key with a small LRU/TTL.

**[MEDIUM] `/api/fit-score` performs up to three sequential Firestore reads before the AI call**
- In the cold path (no `activeResumeId`), three round-trips occur before the AI call, adding 300–600 ms on Firestore cold start.
- Fix: Ensure `activeResumeId` is always populated when the first resume is created.

**[LOW] No pagination on any Firestore collection reads**
- `lib/jobs.ts` `getJobs` and all other `getXs` functions fetch entire collections with no `limit`.
- Fix: Add `limit(50)` with cursor-based pagination for list views.

---

## Error Handling

**[HIGH] `lib/encryption.ts` throws uncaught exceptions on malformed ciphertext**
- `decrypt` does not validate that the ciphertext contains exactly three `:` segments before splitting. A `null` or partial stored value causes an unhandled exception, producing a confusing `500` instead of a clean `401 / no_key`.
- Fix: Validate ciphertext format before decrypting and return a typed `DecryptError`.

**[MEDIUM] Sign-in failure on the landing page shows no user-facing error**
- `app/page.tsx`: the catch block resets the spinner but shows no error message.
- Fix: Add an error state string that renders below the sign-in button.

**[MEDIUM] Goals save failure is silently swallowed**
- `app/settings/page.tsx`: `// silently fail — goals are non-critical`. The user sees the spinner stop with no feedback.
- Fix: Show a toast/error message even for non-critical saves.

**[LOW] `console.error` is the only observability mechanism across all API routes**
- Logs appear in Vercel function logs but are not aggregated, searchable beyond the retention window, or alertable.
- Fix: Integrate Sentry (`@sentry/nextjs`) or emit structured JSON logs.

---

## Code Quality

**[MEDIUM] Duplicated JSON-strip boilerplate across four route handlers**
- The regex strip + `JSON.parse` pattern is copy-pasted verbatim in `fit-score`, `company-research`, `interview-prep`, and `extract-job` routes.
- Fix: Extract to a shared `parseAIJson<T>(raw: string): T` utility in `lib/ai.ts` or `lib/parseAIResponse.ts`.

**[MEDIUM] Firestore document data cast with `as Record<string, unknown>` then re-cast per field with `as string`**
- `lib/jobs.ts` lines 19–37, `lib/companies.ts` lines 19–35: a missing or wrongly-typed field silently produces `undefined` cast to `string`, showing `"undefined"` in the UI.
- Fix: Use Zod (already a transitive dependency) or manual validation helpers at the Firestore boundary.

**[LOW] Cover letter system prompt contains personal career history**
- `app/api/cover-letter/route.ts` lines 10–15 include a real cover letter referencing specific employers and communities, shipping personal career details in every API request.
- Fix: Replace with a clearly fictional example.

**[LOW] `lib/firebase.ts` unconditionally imports `getStorage` for all pages**
- Adds bundle weight even for pages that never upload files.
- Fix: Lazy-import `getStorage` only inside `app/resumes/page.tsx`.

---

## Infrastructure Gaps

**[HIGH] No environment variable validation at startup**
- None of `ENCRYPTION_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, or `NEXT_PUBLIC_FIREBASE_*` are checked for presence before the application boots.
- Impact: A misconfigured deployment boots silently and fails only on the first affected request.
- Fix: Add a `lib/env.ts` that validates required env vars at module initialization using Zod or explicit checks.

**[HIGH] No test suite**
- Zero `.test.ts` / `.spec.ts` files; no `test` script in `package.json`.
- Impact: No automated verification of encryption, AI response parsing, or Firestore data mapping. Regressions only surface in production.
- Fix: Add Vitest unit tests for `lib/encryption.ts`, `lib/ai.ts`, and AI JSON parsing helpers.

**[MEDIUM] `firebase-admin` initialized at module import time with no error boundary**
- If `FIREBASE_PRIVATE_KEY` is malformed, the error is thrown at import time, crashing the route worker.
- Fix: Wrap initialization in try/catch and throw a descriptive startup error.

**[MEDIUM] No `next.config.ts` — no security headers, no image domain allowlist**
- No `Content-Security-Policy`, `X-Frame-Options`, or `images.remotePatterns` for `lh3.googleusercontent.com` (used for Google profile photos).
- Fix: Add a minimal `next.config.ts` with security headers and image domain configuration.

**[LOW] No CI pipeline**
- `package.json` has `"lint": "eslint"` but no CI workflow file exists.
- Fix: Add a GitHub Actions workflow that runs `npm run lint` and `npm run build` on pull requests.

---

## Summary

Top 5 concerns to address, in priority order:

1. **Unauthenticated API routes (Security — HIGH).** Every API endpoint accepts a client-supplied `uid` with no token verification, allowing any caller to impersonate any user, consume their Anthropic quota, and read or delete their data. Fix: verify a Firebase ID token server-side in all seven routes.

2. **No rate limiting on AI endpoints (Missing Feature — HIGH).** Even after fixing authentication, nothing prevents a user from hammering requests. Add per-UID rate limiting before any public release.

3. **No test suite (Infrastructure — HIGH).** The encryption, AI response parsing, and Firestore mapping code have zero automated coverage. A one-line change to `lib/encryption.ts` could silently break all AI features for all users. Add Vitest unit tests for the critical path.

4. **SSRF via `/api/scrape` (Security — MEDIUM).** The server fetches arbitrary user-supplied URLs, opening a path to cloud metadata endpoints. Apply URL validation (HTTPS-only, block RFC 1918/link-local ranges).

5. **`max_tokens: 1024` too low for multi-field AI responses (Missing Feature — MEDIUM).** Company research and interview prep responses routinely exceed 1 024 tokens, causing silent JSON truncation that surfaces as `parse_failed` 500 errors. Pass task-appropriate token limits through `callAI`.

---

*Concerns analysis: 2026-05-27*
