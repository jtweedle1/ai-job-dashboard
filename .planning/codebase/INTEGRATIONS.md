# Integrations

**Analysis Date:** 2026-05-27

## Authentication

**Provider:** Firebase Authentication (Google OAuth)

**Client SDK:** `firebase` ^12.13.0
- Initialised in `lib/firebase.ts` — singleton pattern via `getApps()` guard
- Auth instance exported as `auth` from `lib/firebase.ts`
- Sign-in method: `signInWithPopup` with `GoogleAuthProvider` (`lib/auth.ts`)
- Sign-out: `signOut(auth)` via `signOutUser()` in `lib/auth.ts`

**User provisioning (`lib/auth.ts`):**
- On first Google sign-in, a Firestore document is created at `users/{uid}` with fields: `apiKey: null`, `activeResumeId: null`, `goals: null`, `createdAt: serverTimestamp()`
- Subsequent sign-ins skip document creation (existence check via `getDoc`)

**Auth state (`lib/auth-context.tsx`):**
- `AuthProvider` React context wraps the app
- Subscribes to `onAuthStateChanged` — exposes `{ user: User | null, loading: boolean }`
- `useAuth()` hook consumes the context
- Client component (`"use client"`)

**Middleware (`middleware.ts`):**
- Currently a pass-through (`NextResponse.next()`) — no server-side route protection enforced
- Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and `api` routes
- Route protection is handled client-side via auth context

## Database / Storage

**Firestore (client SDK):**
- Client: `db` exported from `lib/firebase.ts` via `getFirestore(app)`
- Package: `firebase` ^12.13.0

**Firestore (Admin SDK — server-side only):**
- Client: `adminDb` exported from `lib/firebase-admin.ts` via `firebase-admin` ^13.10.0
- Initialised with service account credentials from env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Used in API routes that need privileged/server-side Firestore access (e.g., `lib/ai.ts` reads `users/{uid}.apiKey`)

**Firestore Security Rules (`firestore.rules`):**
- Users can only read/write their own document: `users/{userId}` and all subcollections under it
- Rule: `request.auth != null && request.auth.uid == userId`
- No public read/write allowed anywhere

**Firebase Storage:**
- Client instance exported as `storage` from `lib/firebase.ts` via `getStorage(app)`
- Storage bucket configured via `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- No server-side storage Admin SDK usage detected

**Data model (inferred from `lib/auth.ts` and `lib/ai.ts`):**
- `users/{uid}` — top-level user document
  - `apiKey` — encrypted Anthropic API key (string or null)
  - `activeResumeId` — reference to active resume (string or null)
  - `goals` — user career goals (string or null)
  - `createdAt` — server timestamp

## AI / LLM

**Provider:** Anthropic (Claude)
- SDK: `@anthropic-ai/sdk` ^0.99.0
- Model in use: `claude-haiku-4-5-20251001`
- Max tokens per call: 1024
- Config: `serverExternalPackages` in `next.config.ts` ensures the SDK runs in Node.js runtime

**Key abstraction (`lib/ai.ts` — `callAI`):**
- Accepts `uid`, `messages: Anthropic.MessageParam[]`, optional `system` prompt
- Fetches the user's encrypted API key from Firestore (`users/{uid}.apiKey`) via Admin SDK
- Decrypts the key with `lib/encryption.ts` before instantiating the Anthropic client
- Each user supplies their own Anthropic API key — no shared platform key
- Returns `{ content: string }` on success or `{ error: string }` on failure

**Error codes returned by `callAI`:**
- `firestore_error` — could not read Firestore
- `no_key` — user has not saved an API key
- `decrypt_failed` — decryption error
- `unexpected_response` — non-text response block from Claude
- Passes through Anthropic SDK error messages otherwise

**API routes that use `callAI`:**

| Route | Purpose | System prompt behaviour |
|-------|---------|------------------------|
| `app/api/extract-job/route.ts` | Parse job posting text into structured JSON (`title`, `company`, `location`, `salary`, `description`) | Fixed system prompt instructing JSON-only output |
| `app/api/cover-letter/` | Cover letter generation (inferred from directory) | — |
| `app/api/fit-score/` | Job fit scoring (inferred from directory) | — |
| `app/api/interview-prep/` | Interview preparation content (inferred from directory) | — |
| `app/api/company-research/` | Company research summaries (inferred from directory) | — |
| `app/api/weekly-summary/` | Weekly job search summary (inferred from directory) | — |

## External APIs

**Web scraping (`app/api/scrape/route.ts`):**
- No third-party scraping service — raw `fetch` from the Next.js server
- Spoofs a Chrome browser User-Agent to reduce bot blocking
- Strips `<script>`, `<style>`, and all HTML tags to extract plain text
- Decodes common HTML entities
- 10-second timeout via `AbortSignal.timeout(10_000)`
- Returns `{ success: false, reason: "blocked" }` on 401/403
- Returns `{ success: false, reason: "js_rendered" }` when extracted text < 100 chars (page requires JS)
- No proxy, headless browser, or external scraping API used

**PDF parsing (`app/api/parse-pdf/route.ts`):**
- Package: `pdf-parse` ^2.4.5 (local, no external API)
- Accepts multipart `FormData` with a `file` field (must be `application/pdf`)
- Uses `PDFParse` class to extract plain text from the buffer
- Returns `{ text: string }` on success
- Forced into Node.js runtime via `serverExternalPackages` in `next.config.ts`

**Job settings (`app/api/settings/`):**
- Directory exists; likely handles saving/retrieving user settings (API key, goals, active resume) to Firestore

## Security

**API Key encryption (`lib/encryption.ts`):**
- Algorithm: AES-256-GCM (authenticated encryption)
- Key source: `ENCRYPTION_SECRET` env var — must be a 32-byte value encoded as a 64-character hex string
- IV: 12 random bytes generated per encryption call (`randomBytes(12)`)
- Stored format: `<iv_hex>:<ciphertext_hex>:<auth_tag_hex>`
- Auth tag provides tamper detection
- Used to encrypt user-supplied Anthropic API keys before storing them in Firestore; decrypted server-side only inside `callAI`

**Firestore rules:**
- Strict per-user isolation — users can only access documents under their own `users/{uid}` path
- No admin bypass in client rules; Admin SDK (server-side) bypasses rules by design

**Middleware:**
- Currently non-enforcing (pass-through) — no JWT verification or session validation at the edge
- All protected logic relies on client-side auth state and Firestore rules

**Environment secrets required:**
- `ENCRYPTION_SECRET` — must be kept server-side only (no `NEXT_PUBLIC_` prefix)
- `FIREBASE_PRIVATE_KEY` — service account private key, server-side only
- `FIREBASE_CLIENT_EMAIL` — service account email, server-side only

---

*Integration audit: 2026-05-27*
