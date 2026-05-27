@AGENTS.md

# Job Dashboard

## Stack

Next.js 14 App Router, TypeScript, Firebase Auth + Firestore, Tailwind, Vercel

## Docs

- Design spec: 2026-05-26-job-dashboard-design.md
- Implementation plan: 2026-05-26-job-dashboard-implementation-plan.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build

<!-- GSD:project-start source:PROJECT.md -->

## Project

**AI Job Application Dashboard**

A personal job application tracker with AI-powered tools — cover letters, fit scoring, interview prep, company research, and weekly review. Built on Next.js + Firebase with per-user Anthropic API keys. Currently a working app being hardened for portfolio visibility and a small group of users.

**Core Value:** AI that actually helps you land jobs — tracking your pipeline and generating useful content — without leaking your data or burning your API quota.

### Constraints

- **Tech stack**: Next.js 15 App Router + Firebase (Auth, Firestore, Storage) + Anthropic API — no platform changes
- **Per-user API keys**: Each user brings their own Anthropic key; no shared API key pool — rate limiting must be per-uid, not global
- **No backend**: No standalone server; all server-side logic lives in Next.js API routes
- **Backward compatibility**: Changes to API route signatures must not break the existing client pages without updating both sides

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Core Framework

- **Next.js** 16.2.6 — App Router, React Server Components, API Routes (`app/`)
- **React** 19.2.4 — UI rendering
- **React DOM** 19.2.4 — DOM bindings
- Config: `next.config.ts`

## Languages & Runtimes

- **TypeScript** ^5 — strict mode enabled (`"strict": true` in `tsconfig.json`)
- **Target:** ES2017
- **Module resolution:** `bundler` (Next.js bundler-aware resolution)
- **Path alias:** `@/*` maps to project root (`./`)
- **Node.js** — runtime for API routes and server-side code
- **Package manager:** npm (lockfile: `package-lock.json` expected; `package.json` present)

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.6 | Full-stack React framework |
| `react` / `react-dom` | 19.2.4 | UI layer |
| `firebase` | ^12.13.0 | Client-side Firebase SDK (Auth, Firestore, Storage) |
| `firebase-admin` | ^13.10.0 | Server-side Firebase Admin SDK (Firestore reads in API routes) |
| `@anthropic-ai/sdk` | ^0.99.0 | Anthropic Claude API client — AI/LLM calls |
| `pdf-parse` | ^2.4.5 | PDF text extraction in `/api/parse-pdf` |
| `recharts` | ^3.8.1 | Chart components for dashboard visualisations |
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | ^4 | Utility-first CSS |
| `@tailwindcss/postcss` | ^4 | PostCSS integration for Tailwind v4 |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.2.6 | Next.js ESLint rules (core-web-vitals + TypeScript) |
| `typescript` | ^5 | Type checking |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` / `@types/react-dom` | ^19 | React type definitions |
| `@types/pdf-parse` | ^1.1.5 | Types for pdf-parse |

## Styling

- **Tailwind CSS v4** — utility classes used throughout components
- **PostCSS integration** via `@tailwindcss/postcss` (Tailwind v4 no longer uses `tailwind.config.js` by default)
- No CSS Modules or styled-components detected
- No separate theme config file — Tailwind v4 uses CSS-native configuration

## Build & Tooling

- `npm run build` → `next build`
- `npm run dev` → `next dev`
- `npm run start` → `next start`
- `npm run lint` → `eslint`
- Strict mode on
- `noEmit: true` — type-checking only; Next.js handles transpilation
- `incremental: true` — faster rebuilds
- `resolveJsonModule: true` — JSON imports allowed
- `isolatedModules: true` — required for SWC/Babel transforms
- Next.js plugin registered under `compilerOptions.plugins`
- ESLint flat config format (v9)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`
- `serverExternalPackages` ensures `pdf-parse` and `@anthropic-ai/sdk` are not bundled by webpack and run in native Node.js — required for binary/native module compatibility

## Environment & Config

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID` — Firebase Admin SDK project ID
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin service account email
- `FIREBASE_PRIVATE_KEY` — Firebase Admin service account private key (newlines stored as `\n`, replaced at runtime)
- `ENCRYPTION_SECRET` — 32-byte hex string used as AES-256-GCM key for encrypting stored Anthropic API keys
- `.env.local` — local environment variable overrides (not committed)
- `next.config.ts` — Next.js configuration
- `tsconfig.json` — TypeScript configuration
- `eslint.config.mjs` — ESLint flat config
- `firestore.rules` — Firestore security rules

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## TypeScript Patterns

- `types/job.ts` — `Job` interface, `JobStage`/`JobSource` union types, and derived constants (`STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES`)
- `types/company.ts` — `Company` interface
- `types/coverLetter.ts`, `types/resume.ts`, `types/debrief.ts`, `types/interviewPrep.ts`, `types/answerBank.ts`, `types/weeklyReview.ts`
- `Omit<Job, "id" | "createdAt" | "updatedAt" | "fitScore" | "fitReasoning" | "resumeIdUsed">` for create
- `Partial<Omit<Job, "id" | "createdAt">>` for update
- `Pick<Company, "name" | "jobId">` for narrow create inputs

## React Patterns

- `app/layout.tsx` — Server component; handles fonts, metadata, global CSS import
- `app/providers.tsx` — Client component (`"use client"`); wraps tree in `AuthProvider`
- `lib/auth-context.tsx` — Client context (`"use client"`); `useState`/`useEffect`/`onAuthStateChanged`
- All `components/*.tsx` — Client components with `"use client"` as first line
- `app/api/**/route.ts` — Server-only; never import client-side Firebase SDK

## File & Naming Conventions

- React components: `PascalCase.tsx` (`EditableField.tsx`, `AddJobModal.tsx`, `AppShell.tsx`, `Sidebar.tsx`)
- Library modules: `camelCase.ts` (`jobs.ts`, `companies.ts`, `firebase-admin.ts`, `auth-context.tsx`)
- Type files: `camelCase.ts` matching the entity (`job.ts`, `company.ts`, `coverLetter.ts`)
- API routes: `route.ts` under `app/api/[kebab-case-name]/`

## API Route Patterns

## Data Layer Patterns

- `lib/firebase.ts` — Client SDK (`firebase` package); used in `lib/*.ts` functions called from Client components
- `lib/firebase-admin.ts` — Admin SDK (`firebase-admin` package); used exclusively in `app/api/**/route.ts`

## Styling Patterns

- Primary/focus: `emerald-500`, `emerald-700`, `emerald-50`, `emerald-100`
- Text: `gray-900` (primary), `gray-500` (muted), `gray-400` (placeholder)
- Errors: `red-500`, `red-400`, `amber-600`
- Borders: `gray-100`, `gray-200`, `emerald-300`
- Surfaces: `white`, `gray-50`, `gray-100`

## Error Handling

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- All authenticated pages are client components using `"use client"` — data is fetched inside `useEffect` after Firebase Auth resolves
- The server (API routes) exclusively uses `firebase-admin` (`lib/firebase-admin.ts`); the client exclusively uses the Firebase client SDK (`lib/firebase.ts`)
- User Anthropic API keys are stored AES-256-GCM encrypted in Firestore and decrypted server-side only, never sent to the client
- No React Server Components are used for page content — every `page.tsx` under authenticated routes is `"use client"`
- `AppShell` acts as the single auth guard: it redirects to `/` if `user` is null after `loading` resolves

## Layers

- Purpose: Render UI, handle user interaction, display data
- Location: `app/**/page.tsx`, `components/`
- Contains: Client components, form state, loading/error states
- Depends on: lib data modules, API routes (via `fetch`), `lib/auth-context`
- Purpose: Server-side AI orchestration and admin Firestore writes
- Location: `app/api/**/route.ts`
- Contains: Next.js Route Handlers with `POST`/`GET`/`DELETE` exports
- Depends on: `lib/firebase-admin.ts`, `lib/ai.ts`, `lib/encryption.ts`
- Used by: Client pages via `fetch("/api/...")`
- Purpose: Client-side Firestore CRUD abstractions per entity
- Location: `lib/jobs.ts`, `lib/companies.ts`, `lib/resumes.ts`, `lib/coverLetters.ts`, `lib/interviewPreps.ts`, `lib/debriefs.ts`, `lib/answerBank.ts`, `lib/weeklyReviews.ts`
- Contains: Functions like `createX`, `getX`, `getXs`, `updateX`, `deleteX`, mapping Firestore docs to TypeScript types
- Depends on: `lib/firebase.ts` (client SDK), `types/*.ts`
- Purpose: Firebase Auth state management
- Location: `lib/auth.ts`, `lib/auth-context.tsx`, `lib/firebase.ts`
- Contains: `signInWithGoogle`, `signOutUser`, `AuthProvider`, `useAuth` hook
- Depends on: Firebase client SDK
- Used by: `app/providers.tsx`, `components/AppShell.tsx`, all page components
- Purpose: Shared TypeScript types, interfaces, and display constants
- Location: `types/*.ts`
- Contains: Entity interfaces plus constants (`STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES` in `types/job.ts`)
- Depends on: Nothing
- Used by: All other layers

## Data Flow

### Primary Request Path: Adding a Job

### AI Feature Request Path (e.g., Fit Score)

### Auth Flow

- No global state library. Auth state lives in `AuthContext`. All page-level data is local React state, fetched in `useEffect` after auth resolves. Optimistic updates are applied locally then persisted via lib functions.

## Key Abstractions

- Purpose: Single entry point for all AI calls; handles key retrieval, decryption, and Anthropic client instantiation
- Used by: All AI API routes
- Pattern: Returns `{ content: string }` on success or `{ error: string }` on failure — callers check with `"error" in result`
- Purpose: Convert raw Firestore document data to typed entities, handling `Timestamp` → `Date` conversion and null coalescing
- Pattern: `function toX(id: string, d: Record<string, unknown>): X`
- Purpose: Access `{ user: User | null, loading: boolean }` anywhere in the client tree
- Pattern: Read-only context consumer; never mutated from outside `AuthProvider`
- Purpose: Every authenticated section's `layout.tsx` renders `<AppShell>{children}</AppShell>`, providing consistent auth guarding and navigation without repeating guard logic in each page

## Entry Points

## Architectural Constraints

- **Auth guard location:** Auth redirects are handled client-side inside `AppShell` and `app/page.tsx` `useEffect`. There are no server-side middleware redirects. Pages briefly render a loading spinner before redirect fires.
- **API key security:** Anthropic keys are never stored in plaintext. AES-256-GCM encryption (`lib/encryption.ts`) uses `ENCRYPTION_SECRET` env var. Decryption happens only in `lib/ai.ts` on the server.
- **Dual Firebase SDK:** `lib/firebase.ts` (client SDK) is used only by `lib/*.ts` data modules on the client. `lib/firebase-admin.ts` (Admin SDK) is used only by `app/api/**/route.ts`. Never mix them.
- **Client-only pages:** All `page.tsx` files under authenticated routes use `"use client"`. Data fetching is done via `useEffect` + Firestore client SDK.
- **Anthropic model:** All AI calls use `claude-haiku-4-5-20251001` with `max_tokens: 1024` (set in `lib/ai.ts`).

## Anti-Patterns

### Passing `uid` from client to API routes without server-side auth verification

### Loading states resolved before auth in page components

## Error Handling

- AI routes return `{ error: "no_key" }` with HTTP 401 when the user has no API key stored
- `callAI()` returns a discriminated union: `{ content: string } | { error: string }` — callers use `"error" in result` to branch
- Optimistic UI updates with no rollback on failure — failures surface via `console.error` only
- `app/error.tsx` exists as a Next.js error boundary for unhandled route errors

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
