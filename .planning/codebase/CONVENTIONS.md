# Conventions

**Analysis Date:** 2026-05-27

---

## TypeScript Patterns

**Strict mode is enabled** in `tsconfig.json` (`"strict": true`). All code is expected to type-check cleanly.

**Type definitions live in `types/`:**
- `types/job.ts` — `Job` interface, `JobStage`/`JobSource` union types, and derived constants (`STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES`)
- `types/company.ts` — `Company` interface
- `types/coverLetter.ts`, `types/resume.ts`, `types/debrief.ts`, `types/interviewPrep.ts`, `types/answerBank.ts`, `types/weeklyReview.ts`

**Type imports use `import type`** for pure type imports:
```ts
import type { Job, JobStage, JobSource } from "@/types/job";
import type { Company } from "@/types/company";
```

**Utility types are used for CRUD payloads:**
- `Omit<Job, "id" | "createdAt" | "updatedAt" | "fitScore" | "fitReasoning" | "resumeIdUsed">` for create
- `Partial<Omit<Job, "id" | "createdAt">>` for update
- `Pick<Company, "name" | "jobId">` for narrow create inputs

**Firestore data is cast via `Record<string, unknown>`** then mapped in dedicated `toX()` mapper functions (`toJob`, `toCompany`, `toCoverLetter`). Raw Firestore data is never spread directly into typed objects.

**Error discrimination uses `"error" in result`** for discriminated union returns from `callAI` (`lib/ai.ts`):
```ts
if ("error" in result)
  return NextResponse.json({ error: result.error }, { status: ... });
```

**Constants co-located with types:** `STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES` are all exported from `types/job.ts`.

---

## React Patterns

**Server vs Client split:**
- `app/layout.tsx` — Server component; handles fonts, metadata, global CSS import
- `app/providers.tsx` — Client component (`"use client"`); wraps tree in `AuthProvider`
- `lib/auth-context.tsx` — Client context (`"use client"`); `useState`/`useEffect`/`onAuthStateChanged`
- All `components/*.tsx` — Client components with `"use client"` as first line
- `app/api/**/route.ts` — Server-only; never import client-side Firebase SDK

**`"use client"` is the first line of the file**, before all imports.

**Auth context pattern** (`lib/auth-context.tsx`):
```ts
const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);
```
Consumed in components as `const { user } = useAuth()`.

**Props interfaces are defined inline** at the top of each component file, named `interface Props` or `interface ComponentNameProps`.

**All local state is `useState`** — no global client-side state library. Each component owns form state, loading flags, and error strings.

**Async event handlers are `async function` declarations** inside the component body (not arrow functions):
```ts
async function handleSave() { ... }
async function handleFetch() { ... }
```

**Loading states use paired boolean + text** (e.g., `saving` / `"Saving…"`, `fetching` / `"Fetching…"`, `extracting` / `"Extracting…"`).

**Error state is `useState("")`** — empty string = no error; non-empty = display error.

**Icons use Tabler Icons webfont** via `<i className="ti ti-[name]" aria-hidden="true" />`.

---

## File & Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (`EditableField.tsx`, `AddJobModal.tsx`, `AppShell.tsx`, `Sidebar.tsx`)
- Library modules: `camelCase.ts` (`jobs.ts`, `companies.ts`, `firebase-admin.ts`, `auth-context.tsx`)
- Type files: `camelCase.ts` matching the entity (`job.ts`, `company.ts`, `coverLetter.ts`)
- API routes: `route.ts` under `app/api/[kebab-case-name]/`

**Directories:** `kebab-case` throughout (`cover-letters`, `interview-prep`, `answer-bank`, `weekly-review`).

**Functions in `lib/`:** `camelCase` verb-noun — `createJob`, `getJobs`, `getJob`, `updateJob`, `deleteJob`, `getCompanyByName`, `getCompanyByJobId`.

**Internal mapper functions:** `toEntityName` — `toJob`, `toCompany`, `toCoverLetter`.

**Types:** PascalCase interfaces (`Job`, `Company`), PascalCase union aliases (`JobStage`, `JobSource`).

**Constants:** `SCREAMING_SNAKE_CASE` — `STAGE_META`, `SOURCE_LABELS`, `ALL_STAGES`, `ALL_SOURCES`, `SCRAPE_ERROR`.

**File-local type aliases:** PascalCase — `type CreateJobData = ...`, `type JdTab = "paste" | "url"`.

---

## API Route Patterns

**Location:** `app/api/[feature-name]/route.ts` — one file per feature, kebab-case directory.

**Always import `NextResponse` from `"next/server"`** and `adminDb` from `@/lib/firebase-admin`. Never import client-side Firebase in routes.

**Request parsing:** destructure from `await request.json()` immediately:
```ts
const { uid, jobId, resumeId } = await request.json();
```

**Input validation first** — return `400` for missing fields before any async work:
```ts
if (!uid || !jobId) return NextResponse.json({ error: "missing fields" }, { status: 400 });
```

**Parallel Firestore reads with `Promise.all`:**
```ts
const [jobSnap, resumeSnap] = await Promise.all([
  adminDb.collection("users").doc(uid).collection("jobs").doc(jobId).get(),
  adminDb.collection("users").doc(uid).collection("resumes").doc(resumeId).get(),
]);
```

**AI response JSON parsing** strips markdown fences before `JSON.parse`:
```ts
const raw = result.content
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```\s*$/i, "")
  .trim();
const parsed = JSON.parse(raw);
```

**All routes wrapped in top-level `try/catch`** that logs with a bracketed prefix and returns `500`:
```ts
} catch (err) {
  console.error("[cover-letter] Error:", err);
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
```

**HTTP method exports:** `export async function POST(request: Request)`, `GET`, `DELETE`.

**System prompts:** module-level `const SYSTEM = \`...\`` string defined before the handler export.

---

## Data Layer Patterns

**Firestore structure is user-scoped subcollections:**
```
users/{uid}/jobs/{jobId}
users/{uid}/companies/{companyId}
users/{uid}/resumes/{resumeId}
users/{uid}/coverLetters/{letterId}
users/{uid}/interviewPreps/{prepId}
users/{uid}/debriefs/{debriefId}
users/{uid}/answerBank/{entryId}
users/{uid}/weeklyReviews/{reviewId}
```

**Collection names use camelCase** in Firestore paths: `coverLetters`, `interviewPreps`, `answerBank`, `weeklyReviews`.

**Two Firebase clients — choose based on context:**
- `lib/firebase.ts` — Client SDK (`firebase` package); used in `lib/*.ts` functions called from Client components
- `lib/firebase-admin.ts` — Admin SDK (`firebase-admin` package); used exclusively in `app/api/**/route.ts`

**Every write sets `updatedAt: serverTimestamp()`** (or `FieldValue.serverTimestamp()` in admin routes). Creates also set `createdAt`.

**Timestamps converted in mappers:**
```ts
createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
```

**Queries use explicit `orderBy`** — `orderBy("createdAt", "desc")` for jobs, `orderBy("updatedAt", "desc")` for companies.

**Filtered lookups use `where` + `limit(1)` + `.empty` check:**
```ts
const q = query(collection(db, "users", uid, "companies"), where("name", "==", name), limit(1));
const snap = await getDocs(q);
if (snap.empty) return null;
```

**All lib functions are `async` returning typed `Promise<T>`** — never return raw Firestore types.

**Null is the sentinel for optional fields** — typed `string | null`, stored as `null`, never `undefined`.

**The Anthropic API key is stored AES-256-GCM encrypted** (`lib/encryption.ts`) under `users/{uid}.apiKey`. Decryption happens inside `lib/ai.ts` before creating the Anthropic client.

---

## Styling Patterns

**Tailwind CSS v4** with `@import "tailwindcss"` in `app/globals.css`. No `tailwind.config.js` — configuration is in `@theme` blocks in CSS.

**Design tokens as CSS custom properties:**
```css
:root { --background: #ffffff; --foreground: #171717; }
@media (prefers-color-scheme: dark) { :root { --background: #0a0a0a; --foreground: #ededed; } }
```

**Tailwind classes written inline on JSX elements** — no CSS modules, no `cn()` utility. Conditional classes use template literals:
```tsx
className={`px-3 py-1.5 rounded-md ${active ? "bg-white shadow-sm" : "text-gray-500"}`}
```

**Color palette:**
- Primary/focus: `emerald-500`, `emerald-700`, `emerald-50`, `emerald-100`
- Text: `gray-900` (primary), `gray-500` (muted), `gray-400` (placeholder)
- Errors: `red-500`, `red-400`, `amber-600`
- Borders: `gray-100`, `gray-200`, `emerald-300`
- Surfaces: `white`, `gray-50`, `gray-100`

**Standard focus style on all inputs:**
```
focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
```

**Interactive states:** `hover:bg-gray-50 transition-colors` for buttons; `disabled:opacity-50 disabled:cursor-not-allowed` for disabled states.

**Fonts:** Geist Sans and Geist Mono loaded via `next/font/google` in `app/layout.tsx`, exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`.

**Icons:** Tabler Icons webfont loaded from jsDelivr CDN in `app/layout.tsx` `<head>`.

---

## Error Handling

**API routes use a three-tier model:**
1. Input validation → `400` with specific error string
2. Not-found → `404` with `{ error: "not_found" }` or `{ error: "job_not_found" }`
3. Server errors → `500` with `{ error: "server_error" }` (always logged)

**AI errors propagate typed codes** (`no_key` → `401`, `decrypt_failed`/`firestore_error`/`parse_failed` → `500`).

**Client components catch errors in async handlers** and set a local `string` state:
```ts
} catch {
  setSaveError("Failed to save. Try again.");
  setSaving(false);
}
```

**`catch` blocks omit the parameter** when the error value is not used: `catch {` not `catch (err) {`.

**`console.error` with bracketed prefix** is the only logging: `console.error("[fit-score] Error:", err)`.

**User-facing strings are plain English** stored inline in component state. Scrape error codes are mapped through a lookup constant (`SCRAPE_ERROR` in `components/AddJobModal.tsx`).

---

*Conventions analysis: 2026-05-27*
