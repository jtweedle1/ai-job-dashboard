@AGENTS.md

# Wayfinder (job-dashboard)

AI job-application tracker. Next.js 16 App Router · TypeScript · Firebase
(Auth/Firestore/Storage) · Anthropic API · Tailwind v4 · Vercel.
Per-user Anthropic keys (bring-your-own) — no shared key pool; rate-limit per-uid.

## Commands

- `npm run dev` · `npm run build` · `npm run lint`

## Non-obvious invariants (don't violate)

- **Dual Firebase SDK:** client SDK (`lib/firebase.ts`) ONLY in `lib/*` data
  modules; Admin SDK (`lib/firebase-admin.ts`) ONLY in `app/api/**`. Never mix.
- **Auth:** the single guard is `<AppShell>` (client-side redirect to `/` when
  signed out). API routes authenticate via `requireAuth(request)`
  (`lib/auth-server.ts`) → returns `NextResponse | { uid }`. Rate-limit per-uid
  via `checkRateLimit` (`lib/rate-limit.ts`).
- **API keys:** Anthropic keys are AES-256-GCM encrypted (`lib/encryption.ts`,
  `ENCRYPTION_SECRET`), decrypted only server-side in `lib/ai.ts`. Never sent to client.
- **AI calls:** all go through `lib/ai.ts` (default model `claude-haiku-4-5-20251001`,
  `max_tokens: 1024`; voice-matched writing passes `WRITING_MODEL`). Returns `{ content } | { error }`; branch with `"error" in result`.
- **Client → API fetch:** use `authedFetch` (`lib/api-client.ts`), not raw `fetch` —
  it attaches the Firebase ID token as a Bearer header.

## Patterns

- Every feature route = `page.tsx` (`"use client"`) + `layout.tsx` wrapping `<AppShell>`.
  Data is fetched in `useEffect` after auth resolves (no RSC for page content).
- One `lib/<entity>.ts` CRUD module + one `types/<entity>.ts` per domain entity.
- API route shape: `requireAuth → checkRateLimit → callAI`.
- Changing an API route signature? Update both the route and its client caller.
- **Design system:** `DESIGN.md` (Trailhead): paper and ink, one action color, one sun. Use the
  semantic tokens in `app/globals.css` (`canvas`/`sheet`/`well` surfaces, `ink`/`ink-soft`/`ink-muted`
  text, `rule`, `control`, `action`, `sun`, and `sky`/`moss`/`stone`/`caution`/`danger` with `-wash`
  pairs); they switch with `.dark`, so no `dark:` twins. Type scale `text-display|title|heading|reading|ui|meta|note|label`.
  Fraunces (`font-serif`) for headings, Figtree body. Build screens from `components/ui/*`
  (`PageFrame`, `Section`, `Sheet`, `Button`, `Field`, `Select`, `Menu`, `Dialog`, `Trail`); at most one
  `Sheet` level, sections are not boxes. `npm run lint` runs `scripts/check-design.mjs`, which bans
  retired patterns (gradients, blur, stock hue/gray scales, `text-xs`, large shadows, uppercase).
- Navigation lives in `components/navigation.ts`: Today, Jobs, Me, Settings, each with tabs
  rendered by `SectionTabs` in `<PageFrame>`. Letter, prep and debrief live inside a job
  (`components/job/*`, steps in `lib/next-steps.ts`); `/cover-letters` and `/interview-prep`
  only redirect.

## Next.js note

This is Next.js 16 with breaking changes vs. training data — check
`node_modules/next/dist/docs/` before non-trivial framework work (see AGENTS.md).
