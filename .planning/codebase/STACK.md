# Stack

**Analysis Date:** 2026-05-27

## Core Framework

- **Next.js** 16.2.6 — App Router, React Server Components, API Routes (`app/`)
- **React** 19.2.4 — UI rendering
- **React DOM** 19.2.4 — DOM bindings
- Config: `next.config.ts`
  - `serverExternalPackages: ["pdf-parse", "@anthropic-ai/sdk"]` — forces these packages to run in the Node.js runtime rather than the Edge runtime

## Languages & Runtimes

- **TypeScript** ^5 — strict mode enabled (`"strict": true` in `tsconfig.json`)
- **Target:** ES2017
- **Module resolution:** `bundler` (Next.js bundler-aware resolution)
- **Path alias:** `@/*` maps to project root (`./`)
- **Node.js** — runtime for API routes and server-side code
- **Package manager:** npm (lockfile: `package-lock.json` expected; `package.json` present)

## Key Dependencies

**Production:**

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.6 | Full-stack React framework |
| `react` / `react-dom` | 19.2.4 | UI layer |
| `firebase` | ^12.13.0 | Client-side Firebase SDK (Auth, Firestore, Storage) |
| `firebase-admin` | ^13.10.0 | Server-side Firebase Admin SDK (Firestore reads in API routes) |
| `@anthropic-ai/sdk` | ^0.99.0 | Anthropic Claude API client — AI/LLM calls |
| `pdf-parse` | ^2.4.5 | PDF text extraction in `/api/parse-pdf` |
| `recharts` | ^3.8.1 | Chart components for dashboard visualisations |

**Dev:**

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

**Build:**
- `npm run build` → `next build`
- `npm run dev` → `next dev`
- `npm run start` → `next start`
- `npm run lint` → `eslint`

**TypeScript config** (`tsconfig.json`):
- Strict mode on
- `noEmit: true` — type-checking only; Next.js handles transpilation
- `incremental: true` — faster rebuilds
- `resolveJsonModule: true` — JSON imports allowed
- `isolatedModules: true` — required for SWC/Babel transforms
- Next.js plugin registered under `compilerOptions.plugins`

**ESLint config** (`eslint.config.mjs`):
- ESLint flat config format (v9)
- Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`

**next.config.ts:**
- `serverExternalPackages` ensures `pdf-parse` and `@anthropic-ai/sdk` are not bundled by webpack and run in native Node.js — required for binary/native module compatibility

## Environment & Config

**Client-side env vars** (prefix `NEXT_PUBLIC_`, exposed to browser — set in `.env.local`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Server-side env vars** (API routes / server only — never exposed to client):
- `FIREBASE_PROJECT_ID` — Firebase Admin SDK project ID
- `FIREBASE_CLIENT_EMAIL` — Firebase Admin service account email
- `FIREBASE_PRIVATE_KEY` — Firebase Admin service account private key (newlines stored as `\n`, replaced at runtime)
- `ENCRYPTION_SECRET` — 32-byte hex string used as AES-256-GCM key for encrypting stored Anthropic API keys

**Config files present:**
- `.env.local` — local environment variable overrides (not committed)
- `next.config.ts` — Next.js configuration
- `tsconfig.json` — TypeScript configuration
- `eslint.config.mjs` — ESLint flat config
- `firestore.rules` — Firestore security rules

**Deployment target:** Vercel (referenced in `CLAUDE.md`)

---

*Stack analysis: 2026-05-27*
