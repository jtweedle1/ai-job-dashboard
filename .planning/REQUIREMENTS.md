# Requirements

**Project:** AI Job Application Dashboard
**v1 scope defined:** 2026-05-27

---

## v1 Requirements

### Security

- [ ] **SEC-01**: User can trust that all API routes verify their Firebase ID token server-side — `uid` is never accepted from the request body
- [ ] **SEC-02**: App fails fast at cold start with a clear error if `ENCRYPTION_SECRET` or Firebase env vars are missing or malformed
- [ ] **SEC-03**: User's AI quota is protected — per-user rate limiting prevents a runaway loop from exhausting their Anthropic key
- [ ] **SEC-04**: `/api/scrape` only fetches public HTTPS URLs — internal/private IPs (RFC 1918, link-local) are blocked
- [ ] **SEC-05**: Firebase Storage has deployed security rules restricting read/write access to the file owner's UID

### Weekly Review

- [ ] **WR-01**: Weekly review auto-populates applications sent, interviews booked, and responses received for the current week from Firestore — no manual entry required
- [ ] **WR-02**: AI weekly summary flags applications with no stage movement in 2+ weeks and surfaces overdue follow-ups
- [ ] **WR-03**: AI weekly summary identifies which sources and stages are converting best based on the user's pipeline data
- [ ] **WR-04**: AI weekly summary gives concrete next-week action items based on current pipeline state

### AI Quality

- [ ] **AI-01**: Cover letter AI uses an improved prompt (no personal career example baked in, structured guidelines) and a task-appropriate token limit
- [ ] **AI-02**: Fit score AI uses a richer rubric that produces specific, actionable feedback and a task-appropriate token limit
- [ ] **AI-03**: Interview prep AI generates targeted, role-specific questions and a task-appropriate token limit
- [ ] **AI-04**: Every AI endpoint uses its own `max_tokens` ceiling appropriate to expected output length — the shared 1024 cap that silently truncates multi-field responses is eliminated

---

## v2 Requirements (Deferred)

- Full automated test suite — not user-facing; separate hardening concern
- CI/CD pipeline — not needed at current scale
- Account deletion and data export — deferred until GDPR obligation exists
- Pagination for large job/company lists — not a problem at expected usage volumes

---

## Out of Scope

- Multi-user team / collaboration features — personal + small group tool only
- Shared/pooled Anthropic API key — each user brings their own key by design
- Native mobile app — web-only
- Job board integrations (auto-apply, scrape listings) — out of scope for this milestone

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SEC-01 | — | Pending |
| SEC-02 | — | Pending |
| SEC-03 | — | Pending |
| SEC-04 | — | Pending |
| SEC-05 | — | Pending |
| WR-01  | — | Pending |
| WR-02  | — | Pending |
| WR-03  | — | Pending |
| WR-04  | — | Pending |
| AI-01  | — | Pending |
| AI-02  | — | Pending |
| AI-03  | — | Pending |
| AI-04  | — | Pending |
