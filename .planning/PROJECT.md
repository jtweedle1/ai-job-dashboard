# AI Job Application Dashboard

## What This Is

A personal job application tracker with AI-powered tools — cover letters, fit scoring, interview prep, company research, and weekly review. Built on Next.js + Firebase with per-user Anthropic API keys. Currently a working app being hardened for portfolio visibility and a small group of users.

## Core Value

AI that actually helps you land jobs — tracking your pipeline and generating useful content — without leaking your data or burning your API quota.

## Requirements

### Validated

These capabilities exist in the current codebase.

- ✓ Google OAuth sign-in / sign-out — existing
- ✓ Job tracking with stage pipeline (Applied → Offer/Rejected) and source tagging — existing
- ✓ Company profiles auto-created and linked when adding jobs — existing
- ✓ Resume upload and storage via Firebase Storage — existing
- ✓ AI cover letter generation — existing
- ✓ AI fit scoring (resume vs. job description) — existing
- ✓ AI interview prep questions + study tips — existing
- ✓ AI company research auto-fill — existing
- ✓ Post-interview debrief logging — existing
- ✓ Answer bank for saved interview responses — existing
- ✓ Analytics dashboard (source breakdown, weekly application trend) — existing
- ✓ Weekly review with AI narrative summary — existing
- ✓ Settings: encrypted Anthropic API key management (AES-256-GCM) — existing
- ✓ Sidebar navigation with organized feature sections — existing

### Active

**Security hardening (all HIGH/MEDIUM severity — portfolio + small group audience)**

- [ ] **SEC-01**: All API routes verify a Firebase ID token from the `Authorization` header server-side; `uid` is derived from the verified claim, never accepted from the request body
- [ ] **SEC-02**: Missing or malformed required environment variables (`ENCRYPTION_SECRET`, `FIREBASE_*`) throw a descriptive error at cold start, not silently at runtime
- [ ] **SEC-03**: Per-user rate limiting on all AI-calling API routes (no single user can exhaust their quota in a tight loop)
- [ ] **SEC-04**: `/api/scrape` validates the user-supplied URL is HTTPS and resolves to a public IP (blocks RFC 1918 / link-local ranges)
- [ ] **SEC-05**: Firebase Storage security rules file (`storage.rules`) deployed alongside Firestore rules

**Weekly review improvements**

- [ ] **WR-01**: Weekly review auto-populates "applications sent", "interviews booked", and "responses received" for the current week from Firestore — no manual entry required
- [ ] **WR-02**: AI weekly summary flags stalling applications (no movement in 2+ weeks) and overdue follow-ups
- [ ] **WR-03**: AI weekly summary surfaces conversion patterns (which sources and stages are performing well)
- [ ] **WR-04**: AI weekly summary suggests concrete next-week focus areas and action items based on pipeline state

**AI quality improvements**

- [ ] **AI-01**: Cover letter prompt improved — remove personal example, add structured guidelines; token limit tuned to task
- [ ] **AI-02**: Fit score prompt improved — richer rubric with specific feedback; token limit tuned to task
- [ ] **AI-03**: Interview prep prompt improved — more targeted, role-specific questions; token limit tuned to task
- [ ] **AI-04**: Each AI call uses a task-appropriate `max_tokens` value (not the shared 1024 that truncates multi-field responses)

### Out of Scope

- Full automated test suite — not a user-facing feature; separate concern
- CI/CD pipeline — no deployment automation needed for solo/small-group use
- Account deletion / data export — deferred; no GDPR obligation at current scale
- Pagination for large job lists — not a problem at expected usage volumes
- Multi-user team/collaboration features — personal tool only

## Context

- **Codebase map:** `.planning/codebase/` — full architecture, stack, conventions, and concerns docs
- **Security baseline:** CONCERNS.md documents 5 HIGH and several MEDIUM severity findings from static analysis. The most critical is that all 7 API routes trust a client-supplied `uid` with no server-side token verification — any caller who knows a uid can read/write that user's data.
- **AI model:** All AI calls currently use `claude-haiku-4-5-20251001` with a shared `max_tokens: 1024`. The token limit causes silent JSON truncation on multi-field responses (company research, interview prep). Model choice is fine for now; prompts and token limits are the main quality levers.
- **Audience:** Currently solo use; targeting portfolio visibility and a small trusted group. Security needs to be real, not theater.
- **Prior implementation docs:** `2026-05-26-job-dashboard-design.md` and `2026-05-26-job-dashboard-implementation-plan.md` in project root.

## Constraints

- **Tech stack**: Next.js 15 App Router + Firebase (Auth, Firestore, Storage) + Anthropic API — no platform changes
- **Per-user API keys**: Each user brings their own Anthropic key; no shared API key pool — rate limiting must be per-uid, not global
- **No backend**: No standalone server; all server-side logic lives in Next.js API routes
- **Backward compatibility**: Changes to API route signatures must not break the existing client pages without updating both sides

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix security issues one at a time, ordered by severity | Easier to review and test each fix in isolation | — Pending |
| Server-side auth via Firebase ID token verification | Industry standard; eliminates the uid-spoofing class of bugs entirely | — Pending |
| Per-user rate limiting stored in Firestore | No Redis/Upstash dependency; consistent with existing stack | — Pending |
| Improve AI quality via better prompts + token tuning before model upgrade | Cheapest lever; haiku is fast and adequate if prompts are right | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-27 after initialization*
