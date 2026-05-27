# Job Dashboard — Design Spec
Date: 2026-05-26

## Overview

A publicly deployed, AI-powered job hunt dashboard. Built as a portfolio project and personal tool for active job seekers. Users sign in with Google, track applications, use AI tools (with their own Anthropic API key), and gain insight into their search over time.

**Stack:** Next.js 14 (App Router) · Firebase Auth + Firestore · Anthropic API (user-supplied key) · Tailwind CSS · Vercel

---

## Authentication

- Google SSO via Firebase Auth — the only sign-in method
- On first sign-in, a user document is created in Firestore with empty defaults
- All data is scoped to the authenticated user's UID
- Unauthenticated visitors see a landing/marketing page with a "Sign in with Google" CTA

---

## Data Models (Firestore)

### `users/{uid}`
```
apiKey: string (encrypted) | null
activeResumeId: string | null
goals: string | null    // free text: income needs, growth path, interests — used for fit scoring
createdAt: timestamp
```

### `users/{uid}/resumes/{resumeId}`
```
label: string           // e.g. "Software Engineer - Jan 2026"
content: string         // full resume text
fileUrl: string | null  // optional PDF upload URL
createdAt: timestamp
```

### `users/{uid}/jobs/{jobId}`
```
title: string
company: string
location: string | null
salary: string | null
url: string | null
description: string     // raw JD text
source: enum            // linkedin | direct | referral | recruiter | wellfound | niche | other
stage: enum             // saved | applied | phone_screen | interview | offer | rejected | withdrawn
fitScore: number | null
fitReasoning: string | null
resumeIdUsed: string | null
notes: string | null
appliedAt: timestamp | null
createdAt: timestamp
updatedAt: timestamp
```

### `users/{uid}/companies/{companyId}`
```
name: string
jobId: string | null        // linked job
whatTheyDo: string | null
productSummary: string | null
targetCustomers: string | null
recentNews: string | null
values: string | null
competitors: string | null
whyInterested: string | null
createdAt: timestamp
updatedAt: timestamp
```

### `users/{uid}/coverLetters/{letterId}`
```
jobId: string
resumeId: string
content: string
createdAt: timestamp
```

### `users/{uid}/interviewPreps/{prepId}`
```
jobId: string
interviewProcess: string    // user-typed description of the process
mockQuestions: string[]
studyTips: string
createdAt: timestamp
```

### `users/{uid}/debriefs/{debriefId}`
```
jobId: string
interviewDate: timestamp
whatTheyAsked: string
wentWell: string
feltWeird: string
followUpOpportunities: string
answersToImprove: string
createdAt: timestamp
```

### `users/{uid}/answerBank/{answerId}`
```
question: string
answer: string
jobId: string | null    // optional link to source job
tags: string[]
createdAt: timestamp
updatedAt: timestamp
```

### `users/{uid}/weeklyReviews/{reviewId}`
```
weekOf: timestamp
applicationsSent: number
interviewsBooked: number
responsesReceived: number
bestResumeVersion: string | null
rolesToDeprioritize: string
nextWeekFocus: string
aiSummary: string | null
createdAt: timestamp
```

---

## Pages & Routes

### `/` — Landing page
- Hero with app name, tagline, feature highlights
- "Sign in with Google" CTA
- Redirects to `/dashboard` if already authenticated

### `/dashboard` — Main dashboard
- Stats row: total applications, interviews, offers, avg fit score
- Recent applications table (last 10, link to full list)
- Job source mini-chart
- AI features panel (shows lock icon if no API key set)

### `/applications` — Full applications table
- Sortable, filterable table: role, company, source, stage, date, fit score
- View toggle: table (default) / kanban (v2)
- "Add job" button → opens add job modal

### `/applications/[jobId]` — Job detail page
- All job fields, editable inline
- Linked cover letter (generate or view)
- Linked company profile
- Linked interview prep
- Linked debriefs
- Fit score + reasoning

### `/companies` — Company list
- Card grid of all company profiles
- Link to associated job

### `/companies/[companyId]` — Company profile
- All fields editable inline
- "Auto-fill with AI" button (requires API key)

### `/cover-letters` — Cover letter list + generator
- Select job + resume version → generate
- View, copy, regenerate past letters

### `/interview-prep` — Interview prep
- Select job → type interview process description → generate mock questions + tips
- View past prep sessions

### `/answer-bank` — Answer bank
- Searchable list of saved Q&A pairs
- Add manually or save from any application flow
- Tag and filter

### `/debrief` — Post-interview debrief
- Select job → fill structured form
- View past debriefs per job

### `/analytics` — Job source analytics
- Bar/pie chart: applications by source
- Response rate by source
- Interview conversion by source
- Timeline of activity

### `/weekly-review` — Weekly review
- Form: this week's numbers + notes
- "Generate AI summary" button
- Archive of past reviews

### `/resumes` — Resume vault
- Upload PDF or paste text
- Label each version
- Set active resume
- View/delete past versions

### `/settings` — Settings
- Add / update / remove Anthropic API key
- Key stored encrypted in Firestore, never returned to client in plaintext
- Career goals (free text: income needs, growth path, interests) — used by role-fit scorer
- Google account info

---

## Add Job Flow

1. User clicks "Add job"
2. Modal opens with two tabs: **Paste URL** and **Paste JD**
3. **URL path:**
   - User pastes job posting URL
   - API route `/api/scrape` fetches the page server-side
   - If successful: raw HTML stripped to text, passed to AI extraction
   - If blocked/fails: modal switches to paste tab with a friendly message
4. **Paste path:**
   - User pastes raw JD text
5. **AI extraction** (if API key set): `/api/extract-job` sends JD text to Anthropic, returns structured JSON: `{ title, company, location, salary, requirements, description }`
6. Fields pre-populated in the form; user reviews, edits, and saves
7. If no API key: user fills fields manually

---

## AI Features

All AI calls go through Next.js API routes. The user's API key is retrieved from Firestore server-side, used for the call, and never sent to the client.

| Feature | Route | Input | Output |
|---|---|---|---|
| JD extraction | `/api/extract-job` | JD text | Structured job fields |
| Cover letter | `/api/cover-letter` | JD + resume text | Cover letter markdown |
| Role-fit score | `/api/fit-score` | JD + resume + user goals | Score (0–100) + reasoning |
| Interview prep | `/api/interview-prep` | JD + interview process | Mock questions + study tips |
| Company research | `/api/company-research` | Company name + role | Company profile fields |
| Weekly summary | `/api/weekly-summary` | Week's stats + notes | AI narrative summary |

All routes return `401` if no API key is set. Frontend shows a consistent "Add your API key in Settings to unlock this feature" prompt.

---

## API Key Handling

- User pastes their Anthropic API key in Settings
- Encrypted with AES-256 before storing in Firestore (using a server-side secret)
- Never returned to the client after saving
- All AI API routes retrieve and decrypt server-side per request
- User can delete their key at any time (sets field to null)

---

## Free vs AI-gated Features

**Always free (no API key needed):**
- Job tracker (add manually, table view)
- Company profiles (manual entry)
- Post-interview debrief (form)
- Answer bank (manual)
- Job source analytics
- Weekly review (manual)
- Resume vault

**Requires API key:**
- JD auto-extraction from URL or paste
- Cover letter generation
- Role-fit scoring
- Interview prep generation
- Company research auto-fill
- Weekly review AI summary

---

## URL Scraping

- Route: `/api/scrape`
- Fetches URL server-side using `fetch` with a browser-like User-Agent header
- Strips HTML tags, extracts readable text
- Returns `{ success: true, text }` or `{ success: false, reason }`
- Failure reasons: blocked (403/401), JS-rendered (empty body), timeout
- Client handles failure gracefully by switching to paste mode

---

## Navigation Structure

```
Sidebar
├── Tracking
│   ├── Dashboard
│   ├── Applications
│   └── Companies
├── AI Tools
│   ├── Cover Letters
│   ├── Interview Prep
│   ├── Answer Bank
│   └── Debrief
├── Insights
│   ├── Analytics
│   └── Weekly Review
└── Bottom
    ├── Resumes
    └── Settings
```

---

## Deployment

- Hosted on Vercel (free tier sufficient for portfolio use)
- Environment variables: `FIREBASE_*` config, `ENCRYPTION_SECRET` for API key encryption
- Firebase project: Auth + Firestore only (no Functions needed)
- Custom domain optional

---

## V2 / Out of Scope for Now

- Kanban board view (applications by stage)
- Email notifications / reminders
- Browser extension for one-click job capture
- Resume diff/comparison tool
- Calendar integration for interview scheduling
