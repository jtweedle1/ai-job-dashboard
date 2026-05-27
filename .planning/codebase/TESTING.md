# Testing

**Analysis Date:** 2026-05-27

---

## Testing Infrastructure

**No testing infrastructure is installed.**

The `package.json` contains zero test-related dependencies:
- No Jest, Vitest, Mocha, or any other test runner
- No `@testing-library/react` or `@testing-library/jest-dom`
- No Cypress, Playwright, or any E2E framework
- No `@types/jest` or `@types/vitest`

The `scripts` section has no `test` script — running `npm test` will invoke the default Node.js behavior (error).

No configuration files exist for any test framework:
- No `jest.config.*`
- No `vitest.config.*`
- No `cypress.config.*`
- No `playwright.config.*`

---

## Existing Tests

**No test files exist anywhere in the project source.**

A search across `app/`, `lib/`, `components/`, and `types/` finds zero files matching:
- `*.test.ts`
- `*.test.tsx`
- `*.spec.ts`
- `*.spec.tsx`
- `__tests__/` directories

---

## Coverage Assessment

**Coverage: 0%**

No production code has any automated test coverage. The following are the highest-risk untested areas:

| Area | Files | Risk |
|------|-------|------|
| Firestore mapper functions | `lib/jobs.ts`, `lib/companies.ts`, `lib/coverLetters.ts` | High — `toJob`, `toCompany` perform unsafe casts from `Record<string, unknown>` |
| AI response parsing | `app/api/fit-score/route.ts`, `app/api/interview-prep/route.ts` | High — JSON.parse on LLM output with regex stripping; malformed responses cause 500s |
| Encryption/decryption | `lib/encryption.ts` | High — AES-256-GCM key handling; incorrect key format fails silently until runtime |
| `callAI` error paths | `lib/ai.ts` | High — 5 distinct error codes; wrong status mapping would surface as silent failures |
| API route input validation | All `app/api/**/route.ts` | Medium — only truthy checks; no schema validation |
| Auth context | `lib/auth-context.tsx` | Medium — auth state lifecycle drives the entire UI |
| Component form logic | `components/AddJobModal.tsx` | Medium — complex multi-step form with URL fetch, AI extraction, and save |

---

## Gaps & Recommendations

**Priority 1 — Unit test pure functions first (no infrastructure overhead):**

Install Vitest (preferred for Next.js 15+/Vite-adjacent projects):
```bash
npm install -D vitest @vitest/ui
```

Add to `package.json`:
```json
"scripts": { "test": "vitest", "test:ui": "vitest --ui" }
```

Start with the mapper functions in `lib/jobs.ts` and `lib/companies.ts` — they are pure functions (given a fixture object, assert the output shape). This requires zero mocking.

**Priority 2 — Test `lib/encryption.ts`:**
Round-trip test: `decrypt(encrypt(plaintext)) === plaintext`. Also test that decryption throws on tampered ciphertext. No external dependencies needed.

**Priority 3 — Test AI response parsing in API routes:**
Extract the JSON-stripping + parsing logic from `app/api/fit-score/route.ts` and `app/api/interview-prep/route.ts` into a shared utility function (e.g., `lib/parseAIJson.ts`), then unit test it with fixtures covering: clean JSON, JSON wrapped in triple-backtick fences, malformed JSON.

**Priority 4 — Test `callAI` error paths in `lib/ai.ts`:**
Mock `firebase-admin` and `@anthropic-ai/sdk`. Assert that each error branch (`no_key`, `firestore_error`, `decrypt_failed`, `unexpected_response`) returns the correct `{ error: string }` shape.

**Priority 5 — Integration tests for API routes:**
Use Next.js route testing with `next/test` or `msw` to test full request/response cycles for at minimum: `app/api/cover-letter/route.ts`, `app/api/fit-score/route.ts`, `app/api/settings/api-key/route.ts`.

**Priority 6 — Component tests:**
Install `@testing-library/react` for `components/EditableField.tsx` (state machine: view → edit → commit/cancel) and `components/AddJobModal.tsx` (form validation, disabled states).

**Recommended testing file layout (co-located):**
```
lib/jobs.ts
lib/jobs.test.ts          ← mapper + CRUD function tests
lib/encryption.ts
lib/encryption.test.ts    ← round-trip + tamper tests
lib/parseAIJson.ts        ← extracted from route handlers
lib/parseAIJson.test.ts
components/EditableField.tsx
components/EditableField.test.tsx
app/api/fit-score/route.ts
app/api/fit-score/route.test.ts
```

---

*Testing analysis: 2026-05-27*
