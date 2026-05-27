# Job Dashboard — Implementation Plan
Date: 2026-05-26

## Overview

Phased build of an AI-powered job hunt dashboard. Each phase is independently deployable and usable. Phases build on each other without breaking earlier work.

---

## Phase 1 — Project scaffold + auth + shell UI
**Goal:** Working app on Vercel with Google sign-in and the sidebar layout. No features yet, just the skeleton.

### Tasks
1. **Scaffold Next.js 14 project**
   - `npx create-next-app@latest` with App Router, TypeScript, Tailwind
   - Set up folder structure: `app/`, `components/`, `lib/`, `types/`

2. **Firebase setup**
   - Create Firebase project (Auth + Firestore only)
   - Enable Google sign-in provider
   - Install `firebase` SDK
   - Create `lib/firebase.ts` (client config) and `lib/firebase-admin.ts` (server config)
   - Add all `FIREBASE_*` env vars to `.env.local` and Vercel

3. **Auth**
   - `lib/auth.ts` — Google sign-in, sign-out, session helpers
   - Middleware (`middleware.ts`) — redirect unauthenticated users to `/` from all protected routes
   - On first sign-in: create `users/{uid}` document in Firestore with empty defaults
   - Auth context provider wrapping the app

4. **Shell layout**
   - `components/Sidebar.tsx` — three nav sections (Tracking, AI Tools, Insights) + bottom links
   - `components/AppShell.tsx` — sidebar + main content area
   - All protected routes use AppShell
   - Active nav item highlighting based on current route

5. **Landing page (`/`)**
   - Hero section: app name, tagline, feature list
   - "Sign in with Google" button
   - Redirect to `/dashboard` if already authenticated

6. **Dashboard stub (`/dashboard`)**
   - Empty state with placeholder stat cards
   - "Add your first job to get started" prompt

7. **Deploy to Vercel**
   - Connect GitHub repo to Vercel
   - Add all env vars
   - Confirm live URL works, Google sign-in works end-to-end

**Done when:** Can sign in with Google, see the sidebar, and the app is live on Vercel.

---

## Phase 2 — Resume vault
**Goal:** User can upload and manage multiple resume versions before we need them for AI features.

### Tasks
1. **Firestore rules**
   - Write security rules: users can only read/write their own subcollections
   - Deploy rules

2. **Resume data layer (`lib/resumes.ts`)**
   - `createResume(uid, label, content)` → writes to Firestore
   - `getResumes(uid)` → list all
   - `deleteResume(uid, resumeId)`
   - `setActiveResume(uid, resumeId)` → updates `users/{uid}.activeResumeId`

3. **Resumes page (`/resumes`)**
   - List of resume cards: label, date added, "Set active" button, delete button
   - Active resume highlighted with a badge
   - "Add resume" button → modal with two tabs:
     - Paste text (textarea)
     - Label input
   - PDF upload tab (stores file to Firebase Storage, parses text via `pdf-parse` in an API route)

4. **Types (`types/resume.ts`)**
   - `Resume` type matching Firestore schema

**Done when:** User can add, label, set active, and delete resume versions.

---

## Phase 3 — Job tracker (core)
**Goal:** User can add jobs manually, view them in a table, update stages, and manage the full application list.

### Tasks
1. **Job data layer (`lib/jobs.ts`)**
   - `createJob(uid, data)`, `updateJob(uid, jobId, data)`, `deleteJob(uid, jobId)`
   - `getJobs(uid)` → list all, ordered by `createdAt` desc
   - `getJob(uid, jobId)` → single job

2. **Types (`types/job.ts`)**
   - `Job` type, `JobStage` enum, `JobSource` enum

3. **Add job modal (`components/AddJobModal.tsx`)**
   - Two tabs: URL and Paste JD
   - URL tab: input + "Fetch" button → calls `/api/scrape` → on success fills textarea
   - Paste tab: textarea for raw JD
   - Manual fields form: title, company, location, salary, source, notes
   - "Save" → creates job in Firestore
   - AI extraction (Phase 5) slots in here later — for now fields are filled manually

4. **Applications table (`/applications`)**
   - Sortable columns: role, company, source, stage, date applied, fit score
   - Filter bar: by stage, by source
   - Stage badge with color per stage
   - Row click → navigates to `/applications/[jobId]`
   - "Add job" button → opens AddJobModal

5. **Job detail page (`/applications/[jobId]`)**
   - All fields displayed, editable inline (click to edit pattern)
   - Stage selector (dropdown)
   - Source selector
   - Notes textarea
   - Delete job button (with confirmation)
   - Sections for linked resources (cover letter, prep, debriefs) — stubs for now, filled in later phases

6. **Dashboard stats (`/dashboard`)**
   - Wire up real data: total applications, interviews count, offers count
   - Recent applications table (last 10 rows)
   - Empty states for each section

**Done when:** Full job CRUD works, table is sortable/filterable, job detail page is editable.

---

## Phase 4 — Company research hub
**Goal:** Per-company profiles, manually editable, linked to jobs.

### Tasks
1. **Company data layer (`lib/companies.ts`)**
   - `createCompany(uid, data)`, `updateCompany(uid, companyId, data)`, `deleteCompany`
   - `getCompanies(uid)`, `getCompany(uid, companyId)`
   - Auto-create company profile when a job is added (if company name doesn't already exist)

2. **Types (`types/company.ts`)**

3. **Companies list (`/companies`)**
   - Card grid: company name, linked role, last updated
   - "Add company" button

4. **Company profile (`/companies/[companyId]`)**
   - All fields editable inline: what they do, product summary, target customers, recent news, values, competitors, why interested
   - Link to associated job
   - "Auto-fill with AI" button stub (wired up in Phase 5)

5. **Link companies to jobs**
   - Job detail page shows linked company card + link to profile

**Done when:** Company profiles are creatable, editable, and linked to jobs.

---

## Phase 5 — AI infrastructure + JD extraction
**Goal:** API key management, secure AI proxy, and the first AI feature (JD extraction).

### Tasks
1. **Encryption utility (`lib/encryption.ts`)**
   - AES-256-GCM encrypt/decrypt using `ENCRYPTION_SECRET` env var
   - Used for storing API keys in Firestore

2. **Settings page (`/settings`)**
   - API key input: paste key → save → stored encrypted in Firestore
   - Show "Key saved ✓" state (never show the key back)
   - "Remove key" button
   - Career goals textarea (saved to `users/{uid}.goals`)
   - Google account info display

3. **AI proxy utility (`lib/ai.ts`)**
   - `callAI(uid, messages, system?)` → retrieves + decrypts API key from Firestore, calls Anthropic `/v1/messages`, returns response
   - Returns `{ error: 'no_key' }` if no key set

4. **Scraping route (`/api/scrape`)**
   - Accepts `{ url: string }`
   - Fetches with browser-like User-Agent
   - Strips HTML to readable text
   - Returns `{ success, text }` or `{ success: false, reason }`

5. **JD extraction route (`/api/extract-job`)**
   - Accepts `{ uid, text }`
   - Prompts Anthropic to return JSON: `{ title, company, location, salary, description }`
   - Returns parsed fields or `{ error }`

6. **Wire up Add Job modal**
   - URL tab: scrape → extract → pre-fill form fields
   - Paste tab: extract → pre-fill form fields
   - Graceful fallback to manual entry if no API key or extraction fails

**Done when:** Users with an API key can paste/scrape a JD and have fields auto-filled.

---

## Phase 6 — Cover letter generator
**Goal:** Generate tailored cover letters per job + resume combo.

### Tasks
1. **Cover letter data layer (`lib/coverLetters.ts`)**

2. **Cover letter route (`/api/cover-letter`)**
   - Input: `{ uid, jobId, resumeId }`
   - Fetches JD + resume text from Firestore
   - Prompts Anthropic: concise, tailored cover letter
   - Saves result to Firestore, returns content

3. **Cover letters page (`/cover-letters`)**
   - Job selector + resume version selector
   - "Generate" button → streams or shows result
   - Copy to clipboard button
   - Regenerate button
   - List of past letters with job name + date

4. **Job detail page integration**
   - Cover letter section on job detail: "Generate cover letter" or view existing

**Done when:** Can generate, view, copy, and regenerate cover letters per job.

---

## Phase 7 — Role-fit scoring
**Goal:** Each job gets a 0–100 fit score with reasoning.

### Tasks
1. **Fit score route (`/api/fit-score`)**
   - Input: `{ uid, jobId }`
   - Fetches JD, active resume, and user goals from Firestore
   - Prompts Anthropic: score 0–100 + 2–3 sentence reasoning
   - Returns `{ score, reasoning }`
   - Saves to job document

2. **Score display**
   - Job detail page: score badge + reasoning paragraph
   - "Recalculate" button
   - Applications table: fit score column (already in schema, now populated)
   - Dashboard: avg fit score stat (now real)

3. **Score color coding**
   - 80–100: green
   - 60–79: amber
   - Below 60: red

**Done when:** Every job can have a fit score, visible in table and detail views.

---

## Phase 8 — Interview prep
**Goal:** Generate mock questions and study tips from the JD and interview process description.

### Tasks
1. **Interview prep data layer (`lib/interviewPreps.ts`)**

2. **Interview prep route (`/api/interview-prep`)**
   - Input: `{ uid, jobId, interviewProcess }`
   - Fetches JD from Firestore
   - Prompts Anthropic: 8–10 likely questions + study tips
   - Returns structured output, saves to Firestore

3. **Interview prep page (`/interview-prep`)**
   - Job selector
   - "Describe the interview process" textarea (e.g. "2 rounds: one behavioral, one case study")
   - "Generate prep" button
   - Output: mock questions list + study tips section
   - Past prep sessions list

4. **Job detail page integration**
   - Interview prep section with link/generate button

**Done when:** Can generate interview prep for any job with a process description.

---

## Phase 9 — Company research auto-fill
**Goal:** AI fills in company profile fields from company name + role context.

### Tasks
1. **Company research route (`/api/company-research`)**
   - Input: `{ uid, companyId }`
   - Fetches company name + linked job title from Firestore
   - Prompts Anthropic: fill all profile fields
   - Updates company document in Firestore

2. **Wire up "Auto-fill with AI" button**
   - On company profile page
   - Shows loading state, then populates fields
   - User can edit any field after auto-fill

**Done when:** One-click AI fill of company profiles.

---

## Phase 10 — Post-interview debrief
**Goal:** Structured debrief form per interview, linked to job.

### Tasks
1. **Debrief data layer (`lib/debriefs.ts`)**

2. **Debrief page (`/debrief`)**
   - Job selector
   - Interview date picker
   - Five textarea fields: what they asked, went well, felt weird, follow-up opportunities, answers to improve
   - Save button
   - List of past debriefs grouped by job

3. **Job detail page integration**
   - Debriefs section: list of past debriefs + "Add debrief" button

**Done when:** Can log debriefs per interview and view history.

---

## Phase 11 — Answer bank
**Goal:** Save application answers, search and reuse them.

### Tasks
1. **Answer bank data layer (`lib/answerBank.ts`)**

2. **Answer bank page (`/answer-bank`)**
   - Search bar (client-side filter)
   - Add answer form: question, answer, optional job link, tags
   - Answer cards: question, answer excerpt, tags, edit/delete
   - Tag filter

3. **Save from other flows**
   - "Save to answer bank" button on cover letter output
   - "Save to answer bank" button on interview prep output

**Done when:** Answers are saveable, searchable, and reusable across applications.

---

## Phase 12 — Analytics
**Goal:** Visual breakdown of job source performance and activity over time.

### Tasks
1. **Analytics data layer (`lib/analytics.ts`)**
   - Aggregate jobs by source, stage, date from Firestore

2. **Analytics page (`/analytics`)**
   - Install `recharts`
   - Bar chart: applications by source
   - Bar chart: response rate by source (interviews / applications per source)
   - Bar chart: interview-to-offer conversion by source
   - Line chart: applications over time (weekly)

3. **Dashboard job source mini-chart**
   - Wire up real data from Firestore

**Done when:** Analytics page shows real charts from real data.

---

## Phase 13 — Weekly review
**Goal:** Weekly summary form with optional AI narrative.

### Tasks
1. **Weekly review data layer (`lib/weeklyReviews.ts`)**

2. **Weekly summary route (`/api/weekly-summary`)**
   - Input: `{ uid, reviewId }`
   - Fetches review fields from Firestore
   - Prompts Anthropic: narrative summary + actionable next steps
   - Saves `aiSummary` back to review document

3. **Weekly review page (`/weekly-review`)**
   - "Start this week's review" button (pre-fills week date)
   - Number inputs: applications sent, interviews booked, responses received
   - Text fields: best resume version, roles to deprioritize, next week focus
   - "Generate AI summary" button (requires API key)
   - Archive accordion of past weeks

**Done when:** Weekly reviews are saveable with optional AI summary.

---

## Phase 14 — Polish + portfolio prep
**Goal:** Production-ready, shareable as a portfolio project.

### Tasks
1. **Landing page polish**
   - Proper hero, feature grid, screenshots/mockup
   - "View live demo" with a demo account option (or read-only tour)

2. **Empty states**
   - Every page has a helpful empty state with a clear CTA

3. **Loading states**
   - Skeleton loaders on tables and cards
   - AI generation buttons show spinner + streaming text where possible

4. **Error handling**
   - Toast notifications for success/error on all mutations
   - Friendly error pages (404, 500)

5. **Mobile responsiveness**
   - Sidebar collapses to hamburger menu on mobile
   - Table scrolls horizontally on small screens

6. **README**
   - Project overview, tech stack, features, setup instructions, live URL
   - Screenshots

7. **Final Vercel deploy check**
   - All env vars confirmed
   - Firestore security rules reviewed
   - Performance check (Lighthouse)

---

## Build order summary

| Phase | What ships | Est. complexity |
|---|---|---|
| 1 | Scaffold + auth + shell + Vercel deploy | Medium |
| 2 | Resume vault | Low |
| 3 | Job tracker (core CRUD + table) | Medium |
| 4 | Company profiles | Low |
| 5 | AI infra + JD extraction | Medium |
| 6 | Cover letter generator | Low |
| 7 | Role-fit scoring | Low |
| 8 | Interview prep | Low |
| 9 | Company research auto-fill | Low |
| 10 | Post-interview debrief | Low |
| 11 | Answer bank | Low |
| 12 | Analytics | Medium |
| 13 | Weekly review | Low |
| 14 | Polish + portfolio prep | Medium |

**Minimum viable product (usable for active job hunting):** Phases 1–5.
**Full feature complete:** Phases 1–13.
**Portfolio ready:** Phase 14.
