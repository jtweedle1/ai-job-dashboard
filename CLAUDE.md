@AGENTS.md

# HuntDesk (job-dashboard)

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
- **AI calls:** all go through `lib/ai.ts` (model `claude-haiku-4-5-20251001`,
  `max_tokens: 1024`). Returns `{ content } | { error }`; branch with `"error" in result`.
- **Client → API fetch:** use `authedFetch` (`lib/api-client.ts`), not raw `fetch` —
  it attaches the Firebase ID token as a Bearer header.

## Patterns

- Every feature route = `page.tsx` (`"use client"`) + `layout.tsx` wrapping `<AppShell>`.
  Data is fetched in `useEffect` after auth resolves (no RSC for page content).
- One `lib/<entity>.ts` CRUD module + one `types/<entity>.ts` per domain entity.
- API route shape: `requireAuth → checkRateLimit → callAI`.
- Changing an API route signature? Update both the route and its client caller.
- Tailwind palette: primary `emerald-{50,100,500,700}`; text `gray-{900,500,400}`;
  errors `red-{400,500}`; surfaces `white`/`gray-{50,100}`.

## Next.js note

This is Next.js 16 with breaking changes vs. training data — check
`node_modules/next/dist/docs/` before non-trivial framework work (see AGENTS.md).

## GSD workflow

This repo uses GSD. For traceability, route work through a GSD entry point:
`/gsd-quick` (small fixes/docs), `/gsd-debug` (investigation), `/gsd-execute-phase`
(planned work). Skip only when explicitly bypassing.
