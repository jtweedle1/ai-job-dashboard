# Roadmap: AI Job Application Dashboard

## Overview

This milestone hardens a working brownfield app for portfolio visibility and a small trusted user group. Three phases execute in dependency order: security first (the codebase is exploitable right now), then weekly review intelligence (the highest-value UX gap), then AI prompt and token quality (the cheapest lever for output improvement).

## Phases

- [x] **Phase 1: Security Hardening** - Close all exploitable API routes and infrastructure gaps before any external users access the app (completed 2026-05-27)
- [ ] **Phase 2: Smart Weekly Review** - Auto-populate pipeline stats and upgrade AI narrative to surface stalls, conversion patterns, and concrete next actions
- [ ] **Phase 3: AI Quality Improvements** - Improve prompts and per-task token limits so cover letter, fit score, and interview prep produce complete, useful output

## Phase Details

### Phase 1: Security Hardening

**Goal**: Every API route verifies caller identity server-side, the app fails fast on misconfiguration, rate limiting protects each user's Anthropic quota, SSRF is blocked in /api/scrape, and Firebase Storage has deployed access rules
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):

  1. A request to any AI API route with a known uid but no valid Firebase ID token is rejected with HTTP 401 — the uid from the request body is ignored
  2. Deploying without ENCRYPTION_SECRET or a required FIREBASE_* env var causes an immediate startup error with a descriptive message — the app never reaches request handling in a broken state
  3. A user who fires the same AI endpoint repeatedly in a tight loop receives HTTP 429 after hitting the per-UID limit — other users are unaffected
  4. A request to /api/scrape with an RFC 1918 or link-local URL (e.g., http://169.254.169.254/) is rejected with an error — only public HTTPS URLs are fetched
  5. storage.rules is deployed and enforces that only the file owner's UID can read or write their files in Firebase Storage

**Plans**: 01-01 (SEC-01 server), 01-02 (SEC-02+SEC-05), 01-03 (SEC-01 client), 01-04 (SEC-03+SEC-04)

### Phase 2: Smart Weekly Review

**Goal**: The weekly review page auto-populates this week's activity counts from Firestore and the AI summary actively identifies problems and opportunities in the user's pipeline — no manual data entry, no generic summaries
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: WR-01, WR-02, WR-03, WR-04
**Success Criteria** (what must be TRUE):

  1. Opening the weekly review page shows applications sent, interviews booked, and responses received for the current week — pulled from Firestore automatically, with no text fields to fill in manually
  2. The AI weekly summary calls out any job with no stage movement in 2+ weeks by name and flags any overdue follow-ups
  3. The AI weekly summary identifies which application sources (e.g., LinkedIn, referral) and pipeline stages are producing the best conversion rates based on the user's actual data
  4. The AI weekly summary ends with at least two concrete, specific action items for the coming week derived from the current pipeline state

**Plans**: TBD
**UI hint**: yes

### Phase 3: AI Quality Improvements

**Goal**: Cover letter, fit score, and interview prep AI calls produce complete, role-specific output — no truncated JSON, no generic examples baked into prompts, no shared token ceiling that silences multi-field responses
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):

  1. A generated cover letter contains no personal career history from the prompt author — it uses only structured guidelines and the user's resume and job data
  2. A fit score response includes specific, actionable feedback tied to the actual job description rather than generic rubric language
  3. Interview prep questions are visibly tailored to the role and company in the job record — not generic behavioral questions that could apply to any posting
  4. Company research and interview prep API responses always return complete, parseable JSON — the parse_failed truncation error no longer occurs because each endpoint uses a task-appropriate max_tokens value

**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Hardening | 4/4 | Complete   | 2026-05-27 |
| 2. Smart Weekly Review | 0/TBD | Not started | - |
| 3. AI Quality Improvements | 0/TBD | Not started | - |

## Requirements Coverage

| REQ-ID | Phase | Requirement |
|--------|-------|-------------|
| SEC-01 | Phase 1 | Firebase ID token verification on all API routes |
| SEC-02 | Phase 1 | Startup fail-fast on missing/malformed env vars |
| SEC-03 | Phase 1 | Per-user rate limiting on AI-calling endpoints |
| SEC-04 | Phase 1 | /api/scrape SSRF protection (HTTPS + public IP only) |
| SEC-05 | Phase 1 | Firebase Storage security rules deployed |
| WR-01  | Phase 2 | Weekly review auto-populates activity counts from Firestore |
| WR-02  | Phase 2 | AI summary flags stalling applications and overdue follow-ups |
| WR-03  | Phase 2 | AI summary surfaces source and stage conversion patterns |
| WR-04  | Phase 2 | AI summary provides concrete next-week action items |
| AI-01  | Phase 3 | Cover letter prompt improved, personal example removed, token limit tuned |
| AI-02  | Phase 3 | Fit score prompt improved with richer rubric and specific feedback |
| AI-03  | Phase 3 | Interview prep prompt improved for role-specific questions |
| AI-04  | Phase 3 | Every AI endpoint uses task-appropriate max_tokens (shared 1024 eliminated) |

**Coverage: 13/13 requirements mapped. No orphans.**
