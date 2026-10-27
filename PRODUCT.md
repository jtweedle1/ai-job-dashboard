# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: active job seekers — starting with the owner — who are running a live search and need to log, update, and act on many applications at once. They are in it every day during a search: adding roles from job boards, writing cover letters, prepping for interviews, and reflecting on what's working.

Secondary: portfolio viewers (recruiters, hiring managers) who see the same app as it really is. They are not designed for separately; the real tool done well is the portfolio piece.

## Product Purpose

A personal job-search command center: track every application through its stages and use AI to do the repetitive, high-effort work around each one (extracting job fields, fit scoring, cover letters, company research, interview prep, weekly summaries). Success means a seeker spends less time on admin and more on the applications most likely to land, and can see from their own data what's working.

## Positioning

All-in-one: tracking, AI writing, interview prep, and reflection (debriefs, analytics, weekly review) live in one place, instead of a spreadsheet plus a cover-letter tool plus notes plus a separate prep app. Each job carries its company, resume, cover letter, prep, and debrief together.

## Operating Context

- Typical loop: find a role on a job board → paste the description to extract fields → score fit against a resume → generate a cover letter → apply → move through stages (Applied → … → Offer/Rejected) → prep, interview, debrief → weekly review.
- Used on desktop and on phones (logging and checking applications on the go).
- Sign-in is Google only. The public landing page (`/`) is the only signed-out surface.

## Capabilities and Constraints

- Stack: Next.js 16 App Router, TypeScript, Firebase (Auth/Firestore/Storage), Anthropic API, Tailwind v4, Recharts, Tabler Icons, deployed on Vercel.
- AI features require each user to bring their own Anthropic API key, stored encrypted server-side. There is no shared key and no subscription. AI features must degrade clearly when no key is set.
- AI output is generated with Claude Haiku and can be slow or fail. Every AI action needs loading, error, and retry states.
- Personal tool only: no teams, collaboration, or multi-user sharing. No pagination; lists are expected to stay small.
- Resume uploads are PDFs.

## Brand Commitments

- **The product is being renamed from HuntDesk to Wayfinder.** The code, README, and landing page still say "HuntDesk"; new work should use "Wayfinder". The existing briefcase mark is not a commitment.
- Light and dark mode are both supported and must stay that way (a theme toggle lives in the sidebar).

## Evidence on Hand

- Real feature set listed in `README.md` and on the landing page (`app/page.tsx`).
- No user count, testimonials, metrics, press, or case studies exist. Do not invent them.
- Live deployment on Vercel. The README link is a placeholder.

## Product Principles

1. **The daily loop comes first.** Logging, updating, and finding an application should be fast and obvious; AI tools serve that loop rather than compete with it.
2. **One job, one place.** Everything about an application should be reachable from it, which is the core promise of the all-in-one positioning.
3. **AI is an assistant, not a black box.** Show what it is doing, let the user edit its output, and fail honestly (missing key, rate limit, bad response).
4. **Your data, your key.** Never hide that AI uses the user's own key; never expose it.
5. **Show what's working.** Analytics, debriefs, and reviews should turn activity into decisions, not just charts.

## Accessibility & Inclusion

- WCAG 2.2 AA is required: contrast in both light and dark themes, full keyboard access, visible focus, and labelled controls and icons for screen readers.
- Mobile must work well, not merely fit: key flows (add or update an application, check status) must be comfortable at phone width.
