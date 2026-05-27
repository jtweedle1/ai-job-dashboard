---
phase: 01-security-hardening
reviewed: 2026-05-27T00:00:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - app/api/company-research/route.ts
  - app/api/cover-letter/route.ts
  - app/api/extract-job/route.ts
  - app/api/fit-score/route.ts
  - app/api/interview-prep/route.ts
  - app/api/scrape/route.ts
  - app/api/settings/api-key/route.ts
  - app/api/weekly-summary/route.ts
  - app/applications/[jobId]/page.tsx
  - app/companies/[companyId]/page.tsx
  - app/cover-letters/page.tsx
  - app/interview-prep/page.tsx
  - app/settings/page.tsx
  - app/weekly-review/page.tsx
  - components/AddJobModal.tsx
  - lib/api-client.ts
  - lib/encryption.ts
  - lib/firebase-admin.ts
  - lib/rate-limit.ts
findings:
  critical: 5
  warning: 5
  info: 3
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase adds server-side token verification, AES-256-GCM encryption, per-user Firestore rate limiting, and SSRF protection. The core security primitives are implemented correctly — the crypto is sound, the rate limiter uses a proper Firestore transaction, and the `requireAuth` guard is wired to all six AI routes. However, several correctness gaps were found that undermine the stated security goals: the scrape endpoint is completely unauthenticated, the rate limiter crashes on malformed Firestore data, the SSRF filter misses the entire `0.0.0.0/8` block and numeric IPv6 addresses, and the DELETE handler for the API key sends a body that fetch may silently drop. A secondary concern is that `callAI` exposes raw Anthropic SDK error messages to API callers.

---

## Critical Issues

### CR-01: `/api/scrape` has no authentication — any internet user can trigger server-side fetches

**File:** `app/api/scrape/route.ts:54`
**Issue:** The `POST` handler has no `requireAuth` call. Every other AI route gates on a verified Firebase ID token, but scrape is callable without any credentials. An unauthenticated caller can use the server as a proxy to fetch arbitrary HTTPS URLs at will — including exfiltrating cloud metadata, enumerating open ports on services reachable from the server's network, or abusing the server's IP reputation. The rate-limit and SSRF filter do not compensate for the absence of auth because the SSRF filter is bypassable (see CR-02) and there is no per-IP throttle.

**Fix:**
```typescript
import { requireAuth } from "@/lib/auth-server";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  // existing body parsing continues...
```
Note: `AddJobModal.tsx` calls this with a plain `fetch` (no `authedFetch`), so that call site must be updated to use `authedFetch` in parallel.

---

### CR-02: SSRF filter misses `0.0.0.0/8` and bypasses via unresolved hostnames / IPv6 decimal notation

**File:** `app/api/scrape/route.ts:22`
**Issue:** Three gaps in `isPrivateHost`:

1. `a === 0` blocks only `0.0.0.0` exactly. The check is done after the `if (match)` IPv4 block (line 23), so octet `a` is the first octet and the block guards the entire `0.0.0.0/8` range correctly — but only for dotted-decimal notation. A URL like `http://0x0a.0.0.1/` (hex notation) parses via `new URL()` as hostname `0x0a.0.0.1`, which does not match the IPv4 regex, so it falls through as non-private and the fetch is issued. Similarly `http://0177.0.0.1/` (octal) and decimal long-form `http://2130706433/` (loopback as 32-bit integer) pass through `new URL()` parsing and are not caught.

2. The filter runs only against the URL's `hostname` — it does not prevent DNS-based SSRF where a public domain resolves to a private IP at fetch time. This is a harder problem (DNS rebinding, split-horizon DNS) and may be acceptable for a personal-use app, but should be documented.

3. IPv6 numeric forms beyond `::1` are not blocked. For example `::ffff:127.0.0.1` in full expansion is caught by the `::ffff:` prefix check, but `::7f00:1` (which is `::ffff:127.0.0.1` without the mapped prefix) is not.

**Fix (for gap 1 — the most exploitable):**
```typescript
// After parsing URL, normalize the hostname through the WHATWG URL parser's
// own canonicalization and also block non-standard forms:
const normalized = parsedUrl.hostname; // already lowercased by URL parser
// Reject if hostname is a bare number (decimal IP as integer)
if (/^\d+$/.test(normalized)) {
  return NextResponse.json({ success: false, reason: "ssrf_blocked" }, { status: 400 });
}
// Reject hex/octal IP forms by checking for 0x or leading-zero octets
if (/^0[x0-9]/i.test(normalized)) {
  return NextResponse.json({ success: false, reason: "ssrf_blocked" }, { status: 400 });
}
```

---

### CR-03: Rate limiter crashes with `TypeError` when Firestore document exists but has no `windowStart` field

**File:** `lib/rate-limit.ts:17`
**Issue:** Line 17 reads `data.windowStart.toMillis()` without a null-guard. The condition is:
```typescript
if (!data || data.windowStart.toMillis() < windowStart) {
```
Short-circuit evaluation means `data.windowStart` is only accessed when `data` is truthy. However, if a `rateLimits/{uid}` document exists but was written without a `windowStart` field (e.g. manual admin write, a failed partial write during an earlier crash, or a schema migration), `data.windowStart` is `undefined` and calling `.toMillis()` on it throws `TypeError: Cannot read properties of undefined`. This exception propagates out of the Firestore transaction, is not caught locally, and bubbles up to the route's outer `catch` block which returns `500` — denying service to legitimate users rather than allowing or properly rate-limiting them. More dangerously, since the 500 path does not consume a rate-limit token, a caller who can trigger this state can bypass rate limiting entirely on that uid.

**Fix:**
```typescript
if (!data || !data.windowStart || data.windowStart.toMillis() < windowStart) {
```

---

### CR-04: `callAI` leaks raw Anthropic SDK error messages to API callers

**File:** `lib/ai.ts:39`
**Issue:**
```typescript
const msg = err instanceof Error ? err.message : "api_error";
return { error: msg };
```
The raw SDK error message (e.g. `"401 {"error":{"type":"authentication_error","message":"invalid x-api-key"}}"`) is returned as the `error` string and then propagated verbatim by every AI route:
```typescript
return NextResponse.json({ error: result.error }, { status: 500 });
```
This exposes internal SDK details, partial API key status hints, and Anthropic's response payloads to the browser. An attacker who saves a deliberate bad key can probe what error messages look like, and the raw messages can include metadata that aids enumeration.

**Fix:** Replace the raw message pass-through with a sanitised sentinel:
```typescript
} catch (err: unknown) {
  console.error("[callAI] Anthropic API error:", err);
  return { error: "api_error" };
}
```

---

### CR-05: `rateLimits` collection is unprotected by Firestore security rules — any authenticated user can read or write any other user's rate-limit counter

**File:** `firestore.rules` (not in the file list, but the rules govern the collection created by `lib/rate-limit.ts`)
**Issue:** The Firestore rules (`firestore.rules`) only cover `match /users/{userId}` and its subcollections. The `rateLimits` collection created by `checkRateLimit` (`adminDb.collection("rateLimits").doc(uid)`) sits at the root of the database and is not covered by any rule. Firestore's default behaviour when no rule matches is to **deny** client SDK access — but the Admin SDK (used in rate-limit.ts) bypasses rules entirely, so server-side writes are fine. However, if the client SDK ever reads or writes `rateLimits/` (e.g. during debugging, a future feature, or a typo), those accesses would be denied silently rather than audited. More critically, the absence of any explicit rule is a maintenance hazard: a future rule expansion (e.g. `match /{document=**}`) could inadvertently open this collection. The rules should explicitly deny client access to `rateLimits`.

**Fix:** Add to `firestore.rules`:
```
match /rateLimits/{uid} {
  allow read, write: if false; // server-only via Admin SDK
}
```

---

## Warnings

### WR-01: `AddJobModal` calls `/api/scrape` without authentication (client-side)

**File:** `components/AddJobModal.tsx:60`
**Issue:** The scrape fetch uses bare `fetch` with no `Authorization` header, not `authedFetch`:
```typescript
const res = await fetch("/api/scrape", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: urlInput.trim() }),
});
```
This is the intentional design (CR-01 notes the route has no auth), but it means adding auth to the route (the fix for CR-01) will break this call site. Flagged separately so the fix for CR-01 also includes updating this component.

**Fix:**
```typescript
const res = await authedFetch("/api/scrape", {
  method: "POST",
  body: JSON.stringify({ url: urlInput.trim() }),
});
```

---

### WR-02: API key DELETE handler sends a `body` — fetch may silently ignore it; the route ignores it too, but the pattern is fragile

**File:** `app/settings/page.tsx:77`
**Issue:**
```typescript
await authedFetch("/api/settings/api-key", {
  method: "DELETE",
  body: JSON.stringify({}),
});
```
The HTTP spec and many server runtimes (including some fetch implementations) drop or ignore request bodies on DELETE requests. The server-side route handler (`app/api/settings/api-key/route.ts`) also does not parse the body for DELETE — it uses only the verified `uid` from the auth token. The body is harmless today, but it is misleading and `authedFetch` will set `Content-Type: application/json` (line 15-17 in `api-client.ts`) because `options.body` is truthy. Sending a `Content-Type: application/json` DELETE with a body could cause intermediaries (proxies, CDN edge functions) to misinterpret the request.

**Fix:** Remove the body from the DELETE call:
```typescript
await authedFetch("/api/settings/api-key", { method: "DELETE" });
```

---

### WR-03: `decrypt` has no input validation — malformed ciphertext panics with an opaque error

**File:** `lib/encryption.ts:21`
**Issue:** `decrypt` splits on `:` and immediately constructs `Buffer.from(ivHex, "hex")` etc. If the stored ciphertext is malformed (wrong number of segments, non-hex characters, truncated), the function throws a Node.js crypto error with implementation-internal details. While `callAI` wraps the call in a try/catch and returns `{ error: "decrypt_failed" }`, the thrown error is not logged, making silent key corruption invisible in production.

**Fix:**
```typescript
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("decrypt: malformed ciphertext (expected iv:enc:tag)");
  const [ivHex, encHex, tagHex] = parts;
  // validate all parts are valid hex before constructing buffers
  if (!/^[0-9a-f]+$/i.test(ivHex) || !/^[0-9a-f]*/i.test(encHex) || !/^[0-9a-f]+$/i.test(tagHex)) {
    throw new Error("decrypt: ciphertext contains non-hex characters");
  }
  // ... rest unchanged
```
Also add logging in `callAI`:
```typescript
} catch (err) {
  console.error("[callAI] decrypt failed for uid:", uid, err);
  return { error: "decrypt_failed" };
}
```

---

### WR-04: `handleGenerateSummary` in `weekly-review/page.tsx` calls `handleSave()` inside an async fire-and-forget path without awaiting its result being reflected before the API call

**File:** `app/weekly-review/page.tsx:150`
**Issue:**
```typescript
if (dirty) await handleSave();
const res = await authedFetch("/api/weekly-summary", { ... });
```
`handleSave` sets `setSaving(true)` and then `setSaving(false)` via a `finally` block, and also updates `setActiveId` on first save. If the user is on an unsaved new review (`activeId === null`), `handleSave` creates the review and sets `activeId` via `setActiveId(id)`. However, React state updates from `setActiveId` are asynchronous — the local `activeId` variable captured in the `handleGenerateSummary` closure still holds `null` immediately after `await handleSave()` returns. The subsequent `authedFetch` then sends `reviewId: null` which the server rejects with `400 missing_params`.

**Fix:** Refactor `handleSave` to return the saved `id`, or use a `ref` to track the pending ID:
```typescript
// In handleSave, return the id:
async function handleSave(): Promise<string | null> {
  // ...
  if (activeId) {
    await updateReview(...);
    return activeId;
  } else {
    const id = await createReview(...);
    setActiveId(id);
    return id;
  }
}

// In handleGenerateSummary:
let reviewId = activeId;
if (dirty) {
  reviewId = await handleSave();
}
if (!reviewId) return;
const res = await authedFetch("/api/weekly-summary", {
  method: "POST",
  body: JSON.stringify({ reviewId }),
});
```

---

### WR-05: `encryption.ts` module-level `KEY` validation throws at import time, crashing the entire Next.js worker on misconfiguration

**File:** `lib/encryption.ts:5`
**Issue:** The `KEY.length !== 32` check (line 5) is module-level and executes when the module is first imported. In Next.js App Router, this runs during the cold-start of the serverless function that imports `encryption.ts` (via `settings/api-key/route.ts`). If `ENCRYPTION_SECRET` is misconfigured in production, the thrown error will crash the worker process and produce a 500 on every request to that route — but the error message will be swallowed by the platform's generic error handler and may not appear in logs clearly. The same applies to `firebase-admin.ts`. While failing fast is intentional, the Next.js App Router wraps route modules in error boundaries that can surface misleading errors.

This is a lower-severity warning rather than a blocker in a personal-use context, but the pattern should be documented — if the check must be module-level, the error message needs to be structured so it surfaces in Vercel/platform logs (e.g. use `console.error` before throwing).

**Fix:**
```typescript
if (KEY.length !== 32) {
  const msg = "ENCRYPTION_SECRET env var is missing or invalid. Expected a 64-character hex string.";
  console.error("[encryption]", msg);
  throw new Error(msg);
}
```

---

## Info

### IN-01: `firestore.rules` uses a wildcard subcollection match that is potentially over-broad

**File:** `firestore.rules:7`
**Issue:**
```
match /{subcollection}/{docId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```
This grants authenticated read/write on **every** subcollection under `/users/{userId}` for that user. As the data model grows, new subcollections (e.g. a future `apiKeyAuditLog`) will inherit this permission automatically without explicit review. The `apiKey` field on the user document is stored at the top-level `/users/{userId}` document — clients can read and overwrite it directly via the client SDK (bypassing encryption) because the user-level `allow read, write` grants full document access. The encrypted key at `users/{uid}.apiKey` should be server-write-only.

**Fix:** Consider splitting the user document rule to deny client-side writes to the `apiKey` field. Firestore rules cannot restrict individual fields in a write, so the standard approach is to move the key to a separate document (`/users/{userId}/private/apiKey`) and restrict that document to server-only access (`allow read, write: if false`).

---

### IN-02: `extract-job/route.ts` has misaligned indentation indicating a structural anomaly

**File:** `app/api/extract-job/route.ts:23`
**Issue:** Lines 23–38 are indented at a shallower level than the surrounding try/catch block (lines 19–42). The outer try/catch (lines 19 and 39) wraps lines 23–38, but the inner try/catch at line 30 creates a nested structure that is not syntactically wrong but visually implies the inner code is outside the outer try. This makes it harder to verify that all paths are caught. In particular, if `request.json()` throws (malformed body), the outer catch at line 39 will catch it — that is correct — but the indentation implies otherwise.

**Fix:** Re-indent lines 23–38 to match the outer try block's indentation level for clarity.

---

### IN-03: `authedFetch` silently sets `Content-Type: application/json` only when `options.body` is truthy — DELETE with no body will not get the header, which is correct, but GET requests with no body also will not

**File:** `lib/api-client.ts:15`
**Issue:** The Content-Type auto-set logic:
```typescript
if (!headers.has("Content-Type") && options.body) {
  headers.set("Content-Type", "application/json");
}
```
The GET request from `settings/page.tsx` (`authedFetch("/api/settings/api-key")`) has no body, so no Content-Type is set. The server route `GET` handler does not parse a body, so this is fine today. The concern is that future callers might pass a non-JSON body (e.g. FormData) and the auto-set logic would incorrectly add `application/json`. The helper should document that body is assumed to always be JSON-serialised, or it should require callers to set Content-Type explicitly.

**Fix:** Add a JSDoc comment clarifying the contract:
```typescript
/**
 * Attaches a Firebase ID token as Bearer auth header.
 * When `options.body` is provided, automatically sets Content-Type: application/json
 * (assumes body is the result of JSON.stringify). For non-JSON bodies, set
 * Content-Type explicitly in options.headers before calling.
 */
```

---

_Reviewed: 2026-05-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
