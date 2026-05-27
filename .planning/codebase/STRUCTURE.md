# Codebase Structure

**Analysis Date:** 2026-05-27

## Directory Layout

```
job-dashboard/
├── app/                        # Next.js App Router: pages, layouts, API routes
│   ├── layout.tsx              # Root layout (fonts, Providers)
│   ├── page.tsx                # Landing/sign-in page (public)
│   ├── providers.tsx           # AuthProvider wrapper
│   ├── error.tsx               # Global Next.js error boundary
│   ├── not-found.tsx           # 404 page
│   ├── globals.css             # Global CSS
│   ├── dashboard/              # Main dashboard (stats + recent jobs)
│   ├── applications/           # Job list + [jobId] detail page
│   ├── companies/              # Company list + [companyId] detail page
│   ├── cover-letters/          # Cover letter generator + list
│   ├── interview-prep/         # Interview prep generator + list
│   ├── answer-bank/            # Saved interview answers
│   ├── debrief/                # Post-interview debrief logger
│   ├── analytics/              # Source analytics charts
│   ├── weekly-review/          # Weekly review + AI summary
│   ├── resumes/                # Resume upload/management
│   ├── settings/               # API key management + user goals
│   └── api/                    # Server-only Route Handlers
│       ├── extract-job/        # AI: parse JD text → structured fields
│       ├── fit-score/          # AI: score resume vs. job description
│       ├── cover-letter/       # AI: generate cover letter
│       ├── interview-prep/     # AI: generate mock questions + study tips
│       ├── company-research/   # AI: auto-fill company profile fields
│       ├── weekly-summary/     # AI: generate weekly review narrative
│       ├── scrape/             # Fetch + strip HTML from a job posting URL
│       ├── parse-pdf/          # Extract text from uploaded PDF resume
│       └── settings/
│           └── api-key/        # GET/POST/DELETE user's encrypted Anthropic key
├── components/                 # Shared React components
│   ├── AppShell.tsx            # Auth guard + responsive layout shell
│   ├── Sidebar.tsx             # Navigation sidebar (desktop + mobile overlay)
│   ├── AddJobModal.tsx         # Full job creation flow (scrape, extract, save)
│   └── EditableField.tsx       # Click-to-edit inline text/textarea
├── lib/                        # Business logic, data access, utilities
│   ├── firebase.ts             # Firebase client SDK init (auth, db, storage)
│   ├── firebase-admin.ts       # Firebase Admin SDK init (server only)
│   ├── auth.ts                 # signInWithGoogle, signOutUser
│   ├── auth-context.tsx        # AuthProvider + useAuth hook
│   ├── ai.ts                   # callAI() — key retrieval, decrypt, Anthropic call
│   ├── encryption.ts           # AES-256-GCM encrypt/decrypt for API keys
│   ├── analytics.ts            # Pure computation: getSourceStats, getWeeklyApplications
│   ├── jobs.ts                 # Firestore CRUD for jobs
│   ├── companies.ts            # Firestore CRUD for companies
│   ├── resumes.ts              # Firestore CRUD for resumes
│   ├── coverLetters.ts         # Firestore CRUD for cover letters
│   ├── interviewPreps.ts       # Firestore CRUD for interview prep sessions
│   ├── debriefs.ts             # Firestore CRUD for post-interview debriefs
│   ├── answerBank.ts           # Firestore CRUD for saved answers
│   └── weeklyReviews.ts        # Firestore CRUD for weekly reviews
├── types/                      # TypeScript interfaces and display constants
│   ├── job.ts                  # Job, JobStage, JobSource, STAGE_META, SOURCE_LABELS
│   ├── company.ts              # Company interface
│   ├── resume.ts               # Resume interface
│   ├── coverLetter.ts          # CoverLetter interface
│   ├── interviewPrep.ts        # InterviewPrep interface
│   ├── debrief.ts              # Debrief interface
│   ├── answerBank.ts           # AnswerBankEntry interface
│   └── weeklyReview.ts         # WeeklyReview interface
├── public/                     # Static assets (SVGs)
├── .planning/                  # GSD planning documents
│   └── codebase/               # Codebase map documents
├── .claude/                    # Claude/AI agent config
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
├── eslint.config.mjs           # ESLint configuration
├── postcss.config.mjs          # PostCSS / Tailwind configuration
├── firestore.rules             # Firestore security rules
├── package.json
├── middleware.ts               # Next.js middleware
└── CLAUDE.md                   # Project context for AI agents
```

## Directory Purposes

**`app/`:**
- Purpose: All Next.js App Router pages and API routes
- Contains: `page.tsx` (UI), `layout.tsx` (wraps children in `AppShell`), `route.ts` (server handlers)
- Key files: `app/layout.tsx`, `app/page.tsx`, `app/providers.tsx`

**`app/api/`:**
- Purpose: Server-only Route Handlers — all AI calls and admin Firestore operations live here
- Contains: One subdirectory per feature, each with a `route.ts` exporting HTTP method handlers
- Key files: `app/api/fit-score/route.ts`, `app/api/cover-letter/route.ts`, `app/api/settings/api-key/route.ts`

**`components/`:**
- Purpose: Reusable UI components used across multiple pages
- Contains: Client components only (`"use client"`)
- Key files: `components/AppShell.tsx` (auth shell), `components/AddJobModal.tsx` (primary creation flow)

**`lib/`:**
- Purpose: All non-UI logic — Firebase access, auth, AI, encryption, pure utilities
- Contains: Client-side Firestore CRUD modules (one per entity), server utilities (`firebase-admin.ts`, `ai.ts`, `encryption.ts`), auth context
- Key files: `lib/ai.ts`, `lib/firebase.ts`, `lib/firebase-admin.ts`, `lib/auth-context.tsx`

**`types/`:**
- Purpose: TypeScript interfaces for all domain entities plus constants used across pages and lib modules
- Contains: One file per entity; `types/job.ts` also exports `STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES`
- Key files: `types/job.ts`

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Public landing page and Google sign-in
- `app/layout.tsx`: Root HTML shell, mounts `Providers`
- `app/providers.tsx`: Mounts `AuthProvider`
- `app/dashboard/page.tsx`: First authenticated page after sign-in

**Configuration:**
- `lib/firebase.ts`: Firebase client config (reads `NEXT_PUBLIC_FIREBASE_*` env vars)
- `lib/firebase-admin.ts`: Firebase Admin config (reads `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)
- `lib/encryption.ts`: AES-256-GCM using `ENCRYPTION_SECRET` env var
- `lib/ai.ts`: Anthropic model and token limit settings

**Core Logic:**
- `lib/ai.ts`: All AI calls route through this — change model or token limits here
- `lib/auth-context.tsx`: Central auth state — modify to add roles, claims, etc.
- `components/AppShell.tsx`: Auth guard logic lives here

## Naming Conventions

**Files:**
- React components: PascalCase (`AppShell.tsx`, `AddJobModal.tsx`, `EditableField.tsx`)
- Lib modules: camelCase matching entity name (`jobs.ts`, `coverLetters.ts`, `interviewPreps.ts`)
- Type files: camelCase matching entity name (`job.ts`, `coverLetter.ts`)
- API routes: kebab-case directory + `route.ts` (`fit-score/route.ts`, `cover-letter/route.ts`)
- App pages: `page.tsx` and `layout.tsx` (Next.js convention)

**Directories:** kebab-case (`answer-bank/`, `interview-prep/`, `cover-letters/`, `weekly-review/`)

**TypeScript:**
- Interfaces: PascalCase (`Job`, `Company`, `Resume`)
- Type aliases/unions: PascalCase (`JobStage`, `JobSource`)
- Constants: SCREAMING_SNAKE_CASE (`STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`)
- Functions: camelCase (`createJob`, `getJobs`, `callAI`, `signInWithGoogle`)

## Where to Add New Code

**New feature section (e.g., "Salary Tracker"):**
1. Create `app/salary-tracker/page.tsx` — client component with `"use client"`
2. Create `app/salary-tracker/layout.tsx` — wraps `<AppShell>{children}</AppShell>`
3. Add nav item to the appropriate group in `components/Sidebar.tsx`
4. Add lib module `lib/salaryTracker.ts` — Firestore CRUD following the `toX` mapper pattern
5. Add type file `types/salaryTracker.ts`

**New AI feature (API route):**
1. Create `app/api/your-feature/route.ts` — export `async function POST(request: Request)`
2. Use `adminDb` from `lib/firebase-admin.ts` for Firestore reads/writes
3. Call `callAI(uid, messages, SYSTEM)` from `lib/ai.ts` — check `"error" in result`
4. Return `NextResponse.json(...)` with appropriate status codes

**New shared component:**
- Location: `components/YourComponent.tsx`
- Must include `"use client"` if it uses hooks or browser APIs
- No barrel `index.ts` — import directly: `import YourComponent from "@/components/YourComponent"`

**New Firestore entity:**
1. Define interface in `types/yourEntity.ts`
2. Create `lib/yourEntity.ts` with `createX`, `getX`/`getXs`, `updateX`, `deleteX` functions
3. Follow the `toX(id, d)` mapper pattern for type-safe document conversion
4. Firestore path pattern: `users/{uid}/yourEntities/{docId}`

## Firestore Collection Structure

All user data is scoped under `users/{uid}/` as subcollections:

```
users/{uid}
  ├── jobs/{jobId}
  ├── companies/{companyId}
  ├── resumes/{resumeId}
  ├── coverLetters/{letterId}
  ├── interviewPreps/{prepId}
  ├── debriefs/{debriefId}
  ├── answerBank/{entryId}
  └── weeklyReviews/{reviewId}
```

User-level fields on the root `users/{uid}` doc: `apiKey` (encrypted), `activeResumeId`, `goals`, `createdAt`.

## Special Directories

**`.planning/`:** GSD planning documents — committed to git.

**`.claude/`:** AI agent configuration — committed to git.

**`.next/`:** Next.js build output — gitignored.

**`node_modules/`:** npm dependencies — gitignored.

---

*Structure analysis: 2026-05-27*
