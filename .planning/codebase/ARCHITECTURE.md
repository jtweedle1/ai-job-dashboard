<!-- refreshed: 2026-05-27 -->
# Architecture

**Analysis Date:** 2026-05-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                             │
│  Landing page · Dashboard · Feature pages · AddJobModal             │
│  `app/page.tsx`  `app/dashboard/page.tsx`  `app/**/page.tsx`        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ fetch("/api/...")
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Server)                      │
│  extract-job · fit-score · cover-letter · interview-prep            │
│  company-research · weekly-summary · scrape · parse-pdf             │
│  settings/api-key                                                   │
│  `app/api/**/route.ts`                                              │
└──────────┬───────────────────────────┬──────────────────────────────┘
           │ adminDb (firebase-admin)  │ callAI() via user's API key
           ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────────────────────┐
│  Firebase Firestore  │   │         Anthropic API                    │
│  (server-side Admin  │   │  claude-haiku-4-5-20251001               │
│   SDK)               │   │  Key fetched from Firestore, decrypted   │
│  `lib/firebase-      │   │  per request                             │
│   admin.ts`          │   │  `lib/ai.ts`                             │
└──────────────────────┘   └──────────────────────────────────────────┘
           ▲
           │ Client SDK (firebase/firestore)
┌──────────┴───────────────────────────────────────────────────────────┐
│                  lib/ Data Access Layer (Client)                     │
│  jobs.ts · companies.ts · resumes.ts · coverLetters.ts              │
│  interviewPreps.ts · debriefs.ts · answerBank.ts · weeklyReviews.ts │
│  analytics.ts                                                        │
└──────────────────────────────────────────────────────────────────────┘
           ▲
           │ useAuth() → uid
┌──────────┴───────────────────────────────────────────────────────────┐
│                  Auth Layer                                          │
│  Firebase Auth (Google OAuth)                                        │
│  `lib/firebase.ts` · `lib/auth.ts` · `lib/auth-context.tsx`         │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| RootLayout | Fonts, global CSS, wraps Providers | `app/layout.tsx` |
| Providers | Mounts AuthProvider for full tree | `app/providers.tsx` |
| AuthProvider | Subscribes to Firebase onAuthStateChanged, exposes `user` + `loading` | `lib/auth-context.tsx` |
| AppShell | Auth guard + responsive shell (sidebar + mobile top bar) | `components/AppShell.tsx` |
| Sidebar | Navigation groups (Tracking, AI Tools, Insights) + sign-out | `components/Sidebar.tsx` |
| AddJobModal | Multi-step job creation: URL scrape → AI extract → manual fill → save | `components/AddJobModal.tsx` |
| EditableField | Inline click-to-edit text/textarea with blur-commit | `components/EditableField.tsx` |
| Feature page layouts | Each section wraps `AppShell` | `app/**/layout.tsx` |
| API routes | Server-only AI + admin Firestore operations | `app/api/**/route.ts` |
| lib data modules | Client-side Firestore CRUD per entity | `lib/jobs.ts`, `lib/companies.ts`, etc. |
| lib/ai.ts | Fetches encrypted API key from Firestore, decrypts, calls Anthropic | `lib/ai.ts` |
| lib/analytics.ts | Pure computation over Job arrays (source stats, weekly trend) | `lib/analytics.ts` |
| types/ | TypeScript interfaces and enum-like constants per domain entity | `types/*.ts` |

## Pattern Overview

**Overall:** Client-rendered SPA pages within a Next.js App Router shell, with server API routes handling all AI calls and privileged Firestore writes.

**Key Characteristics:**
- All authenticated pages are client components using `"use client"` — data is fetched inside `useEffect` after Firebase Auth resolves
- The server (API routes) exclusively uses `firebase-admin` (`lib/firebase-admin.ts`); the client exclusively uses the Firebase client SDK (`lib/firebase.ts`)
- User Anthropic API keys are stored AES-256-GCM encrypted in Firestore and decrypted server-side only, never sent to the client
- No React Server Components are used for page content — every `page.tsx` under authenticated routes is `"use client"`
- `AppShell` acts as the single auth guard: it redirects to `/` if `user` is null after `loading` resolves

## Layers

**Presentation Layer:**
- Purpose: Render UI, handle user interaction, display data
- Location: `app/**/page.tsx`, `components/`
- Contains: Client components, form state, loading/error states
- Depends on: lib data modules, API routes (via `fetch`), `lib/auth-context`

**API Layer:**
- Purpose: Server-side AI orchestration and admin Firestore writes
- Location: `app/api/**/route.ts`
- Contains: Next.js Route Handlers with `POST`/`GET`/`DELETE` exports
- Depends on: `lib/firebase-admin.ts`, `lib/ai.ts`, `lib/encryption.ts`
- Used by: Client pages via `fetch("/api/...")`

**Data Access Layer:**
- Purpose: Client-side Firestore CRUD abstractions per entity
- Location: `lib/jobs.ts`, `lib/companies.ts`, `lib/resumes.ts`, `lib/coverLetters.ts`, `lib/interviewPreps.ts`, `lib/debriefs.ts`, `lib/answerBank.ts`, `lib/weeklyReviews.ts`
- Contains: Functions like `createX`, `getX`, `getXs`, `updateX`, `deleteX`, mapping Firestore docs to TypeScript types
- Depends on: `lib/firebase.ts` (client SDK), `types/*.ts`

**Auth Layer:**
- Purpose: Firebase Auth state management
- Location: `lib/auth.ts`, `lib/auth-context.tsx`, `lib/firebase.ts`
- Contains: `signInWithGoogle`, `signOutUser`, `AuthProvider`, `useAuth` hook
- Depends on: Firebase client SDK
- Used by: `app/providers.tsx`, `components/AppShell.tsx`, all page components

**Type Layer:**
- Purpose: Shared TypeScript types, interfaces, and display constants
- Location: `types/*.ts`
- Contains: Entity interfaces plus constants (`STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES` in `types/job.ts`)
- Depends on: Nothing
- Used by: All other layers

## Data Flow

### Primary Request Path: Adding a Job

1. User opens `AddJobModal` (`components/AddJobModal.tsx`)
2. User pastes JD text or fetches via URL → `POST /api/scrape` (`app/api/scrape/route.ts`)
3. User clicks "Extract fields with AI" → `POST /api/extract-job` (`app/api/extract-job/route.ts`)
   - Route handler calls `callAI()` (`lib/ai.ts`), which reads encrypted key from Firestore via `adminDb`, decrypts it, and calls Anthropic
4. User confirms fields → `createJob(uid, data)` (`lib/jobs.ts`) writes to `users/{uid}/jobs`
5. `createCompany` is auto-called if company name is new (`lib/companies.ts`)
6. `onSaved(newJob)` callback updates parent component state

### AI Feature Request Path (e.g., Fit Score)

1. Page component calls `fetch("/api/fit-score", { method: "POST", body: { uid, jobId } })`
2. Route handler (`app/api/fit-score/route.ts`) fetches job + user doc in parallel via `adminDb`
3. Resolves active resume from `users/{uid}/resumes`
4. Calls `callAI(uid, messages, system)` → Anthropic returns JSON
5. Score parsed and written back to `users/{uid}/jobs/{jobId}` via `adminDb`
6. Response `{ score, reasoning }` returned to client; client updates local state

### Auth Flow

1. User visits `/` (`app/page.tsx`) — `useAuth()` checks Firebase Auth state
2. If already signed in, `useEffect` redirects to `/dashboard`
3. User clicks "Continue with Google" → `signInWithGoogle()` (`lib/auth.ts`) → Firebase popup OAuth
4. On success, user doc created in `users/{uid}` if first sign-in
5. `AuthProvider` (`lib/auth-context.tsx`) propagates `user` through context
6. `AppShell` (`components/AppShell.tsx`) guards all authenticated routes: redirects to `/` if `!user`

**State Management:**
- No global state library. Auth state lives in `AuthContext`. All page-level data is local React state, fetched in `useEffect` after auth resolves. Optimistic updates are applied locally then persisted via lib functions.

## Key Abstractions

**`callAI(uid, messages, system?)`:**
- Purpose: Single entry point for all AI calls; handles key retrieval, decryption, and Anthropic client instantiation
- Used by: All AI API routes
- Pattern: Returns `{ content: string }` on success or `{ error: string }` on failure — callers check with `"error" in result`

**Firestore Data Mapper (`toX` functions):**
- Purpose: Convert raw Firestore document data to typed entities, handling `Timestamp` → `Date` conversion and null coalescing
- Pattern: `function toX(id: string, d: Record<string, unknown>): X`

**`useAuth()` hook:**
- Purpose: Access `{ user: User | null, loading: boolean }` anywhere in the client tree
- Pattern: Read-only context consumer; never mutated from outside `AuthProvider`

**`AppShell` + layout pattern:**
- Purpose: Every authenticated section's `layout.tsx` renders `<AppShell>{children}</AppShell>`, providing consistent auth guarding and navigation without repeating guard logic in each page

## Entry Points

**Landing/Auth:** `app/page.tsx` — sign-in UI, redirects authenticated users to `/dashboard`

**Root Layout:** `app/layout.tsx` — mounts fonts, global CSS, and `Providers` (AuthProvider)

**Authenticated App:** `app/dashboard/page.tsx` — stats overview, recent jobs, source breakdown, AI feature shortcuts

## Architectural Constraints

- **Auth guard location:** Auth redirects are handled client-side inside `AppShell` and `app/page.tsx` `useEffect`. There are no server-side middleware redirects. Pages briefly render a loading spinner before redirect fires.
- **API key security:** Anthropic keys are never stored in plaintext. AES-256-GCM encryption (`lib/encryption.ts`) uses `ENCRYPTION_SECRET` env var. Decryption happens only in `lib/ai.ts` on the server.
- **Dual Firebase SDK:** `lib/firebase.ts` (client SDK) is used only by `lib/*.ts` data modules on the client. `lib/firebase-admin.ts` (Admin SDK) is used only by `app/api/**/route.ts`. Never mix them.
- **Client-only pages:** All `page.tsx` files under authenticated routes use `"use client"`. Data fetching is done via `useEffect` + Firestore client SDK.
- **Anthropic model:** All AI calls use `claude-haiku-4-5-20251001` with `max_tokens: 1024` (set in `lib/ai.ts`).

## Anti-Patterns

### Passing `uid` from client to API routes without server-side auth verification

API routes accept `uid` as a POST body parameter and use it directly to query Firestore. Any client can pass an arbitrary `uid` and read or write another user's data. There is no server-side token verification (e.g., Firebase Admin `auth.verifyIdToken()`).

**Fix:** Pass the Firebase ID token in the `Authorization` header; verify it with `adminAuth.verifyIdToken(token)` in the route handler to derive `uid` server-side. Routes to fix: all AI routes (`fit-score`, `cover-letter`, `interview-prep`, `company-research`, `weekly-summary`, `extract-job`).

### Loading states resolved before auth in page components

Pages call data functions inside `useEffect` on `user`, but `loading` from `useAuth()` is not always checked before rendering empty state — causing a brief flash.

**Fix:** Gate data fetch and empty-state rendering on both `!loading && user`.

## Error Handling

**Strategy:** Errors bubble to the nearest `try/catch` in the calling component. API routes return `NextResponse.json({ error: "..." }, { status: N })`. Client components set local error state strings displayed inline.

- AI routes return `{ error: "no_key" }` with HTTP 401 when the user has no API key stored
- `callAI()` returns a discriminated union: `{ content: string } | { error: string }` — callers use `"error" in result` to branch
- Optimistic UI updates with no rollback on failure — failures surface via `console.error` only
- `app/error.tsx` exists as a Next.js error boundary for unhandled route errors

## Cross-Cutting Concerns

**Logging:** `console.error` only, tagged with route name (e.g., `[fit-score]`, `[cover-letter]`). No structured logging or external service.

**Validation:** Minimal — API routes check for required fields and return HTTP 400. No Zod or schema validation.

**Authentication:** Client-side guard via `AppShell`. No server middleware. API routes trust client-supplied `uid`.

---

*Architecture analysis: 2026-05-27*
