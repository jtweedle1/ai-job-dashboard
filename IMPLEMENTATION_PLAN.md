# Trailhead implementation plan

This plan moves Wayfinder from the current "Calm Morning" styling to the approved Trailhead system in [`DESIGN.md`](DESIGN.md). It is staged so that every phase leaves the app working, with a visual review checkpoint at each point where the rendered UI changes in a way worth looking at.

Nothing in this plan changes business logic, data shape or API routes, except where a phase calls it out explicitly and asks for approval first.

## Contents

- [Ground rules](#ground-rules)
- [How the work ships and gets reviewed](#how-the-work-ships-and-gets-reviewed)
- [What exists today](#what-exists-today)
- [Phase 0: Baseline](#phase-0-baseline)
- [Phase 1: Tokens and typography](#phase-1-tokens-and-typography)
- [Phase 2: Global layout and navigation](#phase-2-global-layout-and-navigation) · Checkpoint A
- [Phase 3: Shared interface components](#phase-3-shared-interface-components) · Checkpoint B
- [Phase 4: Today](#phase-4-today) · Checkpoint C
- [Phase 5: Job listings and application tracking](#phase-5-job-listings-and-application-tracking) · Checkpoints D and E
- [Phase 6: Interactions and motion](#phase-6-interactions-and-motion) · Checkpoint F
- [Phase 7: Empty states, loading states and responsive layouts](#phase-7-empty-states-loading-states-and-responsive-layouts) · Checkpoint G
- [Phase 8: Remaining screens and clean-up](#phase-8-remaining-screens-and-clean-up) · Checkpoint H
- [Regression checklist](#regression-checklist)
- [Decisions needed before or during the work](#decisions-needed-before-or-during-the-work)

## Ground rules

1. **Presentation only.** `lib/*` data modules, `app/api/**`, Firestore shapes, `lib/today.ts`, `lib/next-steps.ts`, `lib/claims.ts` and the other logic modules are not rewritten. Components may be split or restyled, but their handlers, state and data calls move across unchanged.
2. **No new npm dependencies.** Fraunces loads through `next/font/google` (already in use). Dialogs use the native `<dialog>` element. Menus and the custom select are small in-house components. Illustrations are inline SVG.
3. **DESIGN.md is the reference.** Every color, size, radius, shadow and duration comes from its tokens. If a screen needs something the system doesn't have, DESIGN.md is updated in the same PR, and the PR description says so.
4. **Old and new coexist until Phase 8.** The new tokens don't collide with the current `gray-*` / `primary-*` scales or the `surface` / `glow-gradient` utilities, so screens can move over one at a time. Phase 8 deletes the old system.
5. **Accessibility and mobile are part of "done" for every phase,** not a later pass: WCAG 2.2 AA contrast in both themes, keyboard access, visible focus, reduced motion, and phone layouts.
6. **No unapproved features.** Anything that adds behaviour rather than restyling it (milestones, the Pipeline table toggle, removing the Library explainer cards) is listed under [Decisions](#decisions-needed-before-or-during-the-work) and waits for a yes.

## How the work ships and gets reviewed

- **One draft PR for the whole redesign,** with one commit series per phase, so the live demo on `main` never shows a half-old, half-new app. Each checkpoint is reviewed on that PR's Vercel preview. If you'd rather merge phase by phase, each phase is self-contained enough to do that, at the cost of the live site looking mixed for a while.
- **At each checkpoint** I post before-and-after screenshots in this thread (desktop 1440px and phone 390px, light and dark) and the preview link, then wait for your OK before starting the next phase. Your feedback lands as fixes in the same phase.
- **Every phase passes** `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` (the same checks CI runs, plus the build).
- **Screenshots** come from a Playwright script run against the preview using the demo account. Playwright is already installed in my environment, so it is not added to the project. The script and images live in project files, not the repo.
- **Vercel preview access:** earlier previews needed Deployment Protection turned off. If the preview asks for a login, I'll tell you and use a local production build for screenshots instead.

## What exists today

| Area | Files | Notes for this work |
|---|---|---|
| Theme | `app/globals.css` (163 lines) | Lavender `gray-*` and iris `primary-*` scales, `surface`, `app-backdrop`, `sunrise`, `glow-gradient`, `sun-orb`, `page-title`, `section-label`, focus ring, reduced-motion rule |
| Fonts | `app/layout.tsx` | Figtree, Nunito (`font-display`, 22 uses), Geist Mono |
| Shell | `components/AppShell.tsx`, `Sidebar.tsx`, `SectionTabs.tsx`, `navigation.ts` | Glass sidebar with icon tiles and taglines, pill tab track rendered above every page, demo banner, mobile drawer with focus handling |
| Shared bits | `Toast.tsx`, `lib/use-toast.ts`, `Toggle.tsx`, `EditableField.tsx`, `AddJobModal.tsx` (498 lines), `LetterReview.tsx`, `StoryTabs.tsx` | Toast state is hand-rolled on Today and the job page but uses `useToast` on Pipeline |
| Today | `app/dashboard/page.tsx`, `components/today/*` (TodayHero, ActionQueue, ComingUp, WeekCard, SearchTrail, QuickActions) | Logic lives in `lib/today.ts` (tested) |
| Jobs | `app/applications/page.tsx` (440), `app/applications/[jobId]/page.tsx` (658), `components/job/*` (CoverLetterPanel 532, InterviewPrepPanel, DebriefPanel, InterviewDateField), `app/companies/*` | Stage styles are Tailwind classes in `types/job.ts` `STAGE_META[stage].badge` |
| Me and the rest | `app/resumes`, `stories`, `background`, `answer-bank`, `voice` (638), `goals`, `debrief`, `settings`, `weekly-review` (577), `analytics` (Recharts), `error.tsx`, `not-found.tsx` | |
| Landing | `app/page.tsx`, `components/landing/*` | Uses `sunrise`, glass and `sun-orb` |
| Icons | `scripts/build-icons.mjs` | Builds a subset font from the `ti-*` names in the source, so removing icons shrinks it automatically |

**How much of the old styling there is.** `surface` is used in 22 files, `glow-gradient` in 18, native `<select>` in 7, `backdrop-blur` in 7, `animate-pulse` skeletons in 17, `text-xs` in 30 files (259 uses), `text-gray-400` 248 times, and `dark:` variants about 750 times. Content widths use five different `max-w-*` values.

---

## Phase 0: Baseline

**Goal:** a record of how things look and behave now, so later phases can be compared against it.

- **Affected:** nothing in the repo.
- **Work:** take "before" screenshots of every route in the demo (desktop and phone, light and dark), the Add job dialog, each job step, and the drawer. Walk the [regression checklist](#regression-checklist) once and note anything already broken (for example, the Progress subtitle showed "7 applicationssent" on the live demo, although the code reads correctly; this will be rechecked).
- **Validation:** the screenshot set is saved to project files under `trailhead/before/`.
- **Checkpoint:** none.

## Phase 1: Tokens and typography

**Goal:** make the Trailhead tokens and fonts available without changing how any screen looks.

**Files affected**
- `app/globals.css`: add the `:root` / `.dark` CSS variables and the `@theme inline` mapping from DESIGN.md §13. Add the type scale (`--text-display`, `--text-title`, `--text-heading`, `--text-reading`, `--text-label`, `--text-meta`), radii (`--radius-mark` through `--radius-dialog`), the two shadows, and the two easing curves. Add `.font-serif` with `font-variation-settings: "SOFT" 100`. Leave every existing token and utility in place.
- `app/layout.tsx`: load Fraunces (normal and italic, `SOFT` and `opsz` axes, Latin subset) as `--font-fraunces`. Keep Nunito for now.
- New `lib/design-tokens.test.ts`: reads the color variables out of `globals.css` and asserts the contrast pairs listed in DESIGN.md §2 and §12 (text tokens at 4.5:1 or better on their allowed backgrounds, `control` at 3:1 or better), in both themes. This uses vitest, which is already set up, so it adds no dependency.

**Intended visual change:** none. Phase 1 is plumbing.

**Dependencies:** none.

**Risks**
- *Name collisions.* Tailwind ships `stone-*` and `sky-*` scales, and `globals.css` already defines `--color-sky-200`. The new single-value `--color-stone` and `--color-sky` add `bg-stone` and `text-sky` without removing the scales, which is allowed but easy to confuse. **Mitigation:** the lint guard in Phase 8 bans the stock scales, and DESIGN.md already lists the allowed names.
- *Overriding Tailwind defaults.* `--ease-out` and `--font-serif` replace Tailwind's own defaults. Neither is used in the app today, which was checked with a search.
- *Font weight.* The Fraunces variable font plus italic adds roughly 100 to 150KB. **Mitigation:** a Latin-only subset, `display: swap`, and Nunito is removed in Phase 8, which roughly evens it out.

**Validation:** lint, types, tests (including the new contrast test) and build all pass. Screens are spot-checked to confirm nothing moved.

**Checkpoint:** none (no visible change).

## Phase 2: Global layout and navigation

**Goal:** every page sits in the same Trailhead frame: canvas background, new rail, text tabs, one page header, two content widths.

**Files affected**
- New `components/ui/PageFrame.tsx`: takes `width="read" | "wide"` and renders the section tabs, the page header (title, one line of context, one action slot) and the content column with the DESIGN.md gutters.
- `components/AppShell.tsx`: replaces `app-backdrop` with `bg-canvas`; adds a "Skip to content" link; gives the mobile top bar a solid `canvas` fill and `rule` border instead of glass; makes the demo banner a single line on `sun-wash` with a "More" toggle on phones (same text and the same "Leave demo" action); stops rendering `SectionTabs`, since `PageFrame` now does. The loading spinner uses `ink-muted`.
- `components/Sidebar.tsx`: a 232px rail on `canvas` with a `rule` edge. The wordmark becomes a flat `sun` disc plus "Wayfinder" in Fraunces. Items are names only, with the `sun` dot and `aria-current` on the current one. The footer keeps account, theme toggle and sign-out as quiet icon buttons. The drawer keeps its existing focus handling, with a plain `ink` 40% scrim instead of blur.
- `components/navigation.ts`: no change to routes or tabs. `hint` and `icon` stay in the data for now; the rail just stops showing them.
- `components/SectionTabs.tsx`: plain text tabs with the 2px `ink` underline on the active tab. It scrolls sideways on phones and keeps the active tab in view. It is rendered by `PageFrame`.
- Each page's outer wrapper and header move to `PageFrame` (about 20 page files: `dashboard`, `analytics`, `weekly-review`, `applications`, `applications/[jobId]`, `companies`, `companies/[companyId]`, `resumes`, `stories`, `background`, `answer-bank`, `debrief`, `voice`, `goals`, `settings`). Only the wrapper `div`, `h1` and header action move; page bodies are untouched in this phase.

**Intended visual change:** the warm canvas replaces the sunrise; the glass sidebar becomes a calm rail; the tabs line up with the content; the left edge of the content stops jumping between pages (two widths instead of five); titles move to Fraunces. Inside the pages, the old cards remain until later phases, so the result is intentionally transitional.

**Dependencies:** Phase 1.

**Risks**
- *Every page is touched.* **Mitigation:** only the wrapper and header move, the diff for each page is small, and the route sweep screenshots catch layout slips.
- *Scroll container.* Pages scroll inside `<main>`, not the window. `PageFrame` must not change that, or sticky elements and "scroll to top on navigate" behaviour change.
- *Mixed look.* Old frosted cards on the new canvas will look unfinished. That's expected until Phases 3 to 8, and is the main reason to keep one draft PR rather than merging each phase.
- *Settings has no tabs.* `PageFrame` reserves no tab space when a section has a single page, so Settings' title doesn't sit higher than the others.

**Validation:** the route sweep at 1440 and 390px in both themes; tab through the rail, tabs and skip link; open and close the drawer with the keyboard and check that focus returns to the menu button; check `aria-current` on the rail and tabs with the accessibility tree.

> **Checkpoint A: the frame.** Review Today, Pipeline, a job, Resume and Settings on the preview. The questions for you: does the rail feel right without icons, do the two content widths look right, and is the Fraunces title the voice you want?

## Phase 3: Shared interface components

**Goal:** build the small set of Trailhead primitives once, then use them instead of the repeated class strings.

**New files in `components/ui/`**

| Component | Notes | Replaces |
|---|---|---|
| `Button`, `IconButton` | Variants `primary`, `secondary`, `quiet`, `danger`; sizes 32/40/48; loading state keeps width | Pill class strings repeated across pages |
| `Field`, `TextArea`, `Label`, `HelpText` | Visible label, help and error text linked with `aria-describedby`; textarea grows to 12 lines | Hand-styled inputs |
| `Select` | A button plus listbox following the ARIA Authoring Practices pattern (arrows, Enter, Escape, type-ahead). It renders a visually hidden native `<select>` too, so form handlers that read `.value` keep working | The 7 native `<select>`s |
| `Menu` | The "More" menu for row and header actions | The trash icon in the job header, ad hoc action rows |
| `Sheet` | The one raised surface | `surface` |
| `Dialog` | Built on native `<dialog>` with `showModal()`, which gives focus trapping, Escape and an inert background for free; it returns focus to the trigger and becomes a bottom sheet on phones | The `AddJobModal` shell and the hand-built modals in `companies` and `resumes` |
| `StageIndicator` | Dot plus stage name | `STAGE_META[...].badge` chips |
| `Monogram` | Company initial in a stamp | Building icons |
| `Trail` | Horizontal and vertical variants; nodes are buttons when interactive | The step rail on the job page and `SearchTrail` |
| `InlineMessage` | Caution and danger only | Ad hoc amber/red blocks |
| `EmptyState` | Illustration slot, one sentence, one action | Ad hoc empty blocks (used fully in Phase 7) |
| `Checkbox` | 18px, 5px radius | Default browser checkboxes |

**Existing components restyled, not rewritten:** `Toast` (ink fill, `field` radius, keeping its hold-on-hover and Undo behaviour), `Toggle` (new track sizes and colors), `EditableField` (Field styling and the "Saved" note), `StoryTabs` (same as section tabs).

**Small consolidations that keep behaviour identical**
- `types/job.ts`: `STAGE_META` gains `tone` (`"stone" | "sky" | "sun" | "moss"`) and `group` (`"exploring" | "applied" | "talking" | "decided"`). `badge` stays until Phase 8, so nothing breaks mid-migration. `lib/next-steps.ts` and `lib/today.ts` only read `label`, so they are unaffected.
- Today and the job page switch their hand-rolled toast state to the existing `lib/use-toast.ts`, which already supports Undo and tones. Timings stay as they are now.

**Applied in this phase,** so there is something real to review: the Add job dialog (shell, fields, selects), the job page header (stage `Select`; delete moves into `Menu`), Pipeline's filter selects, Settings and Goals (fields and buttons).

**Intended visual change:** the Add job dialog, the job header, Pipeline filters, Settings and Goals take on the final Trailhead look. The other screens keep their old interiors until their own phase.

**Dependencies:** Phases 1 and 2.

**Risks**
- *Custom select accessibility.* A custom listbox is the riskiest primitive. **Mitigation:** follow the APG listbox pattern exactly, keep a hidden native `<select>` for form compatibility, and test it with the keyboard and a screen reader (VoiceOver rotor or Chrome's accessibility tree).
- *Stage changes save immediately.* The job header's stage select writes to Firestore and shows a toast on change. The new `Select` must fire `onChange` once per real change, not on arrow-key highlight.
- *`<dialog>` and Next.js.* `showModal()` must run in an effect on the client. Add job keeps its draft behaviour (`lib/use-draft.ts`) and its unsaved-changes prompt.
- *AddJobModal is 498 lines.* Only its shell and fields change; extraction, link fetching and validation stay as they are.

**Validation:** keyboard walkthroughs of Select, Menu and Dialog (open, move, choose, Escape, focus return); add a job from pasted text and from a link; change a stage and undo; delete a job from the new menu; change the API key and goals in Settings; lint, types, tests and build.

> **Checkpoint B: the components.** Review the Add job dialog, a job header, Pipeline filters, and Settings, in both themes and on a phone. Check how buttons, fields, selects and the dialog feel before they spread to every screen.

## Phase 4: Today

**Goal:** Today becomes the Trailhead page from DESIGN.md: a greeting, one next step on the sheet, a short list, and the week as a trail.

**Files affected**
- `app/dashboard/page.tsx`: the `wide` frame with the 8 + 4 grid at ≥1024px. The loading state becomes static `well` blocks (no pulse), and the error state uses `InlineMessage`. The setup-progress chip becomes a quiet line under the greeting. The `quickLink` pill class (line 315) is replaced by `Button` (`quiet`).
- `components/today/TodayHero.tsx`: the `display` greeting with the date in `meta` above it. The next step moves onto the `Sheet` with a `sun-wash` edge, using a `primary` large button and a `secondary` "Change date". The gradient panel and blurred orb are removed.
- `components/today/ActionQueue.tsx`: rows sit on the canvas, not in a card, with the "Needs you / When you have time" labels kept. "Not now" becomes a `quiet` button. Icons stay only where they carry meaning.
- `components/today/ComingUp.tsx`: a plain list in the aside; it wraps instead of truncating "Phone screen · Produc…".
- `components/today/WeekCard.tsx`: counts in `numeral` style, and **zeros are hidden** ("2 sent, 1 interview written up"). The weekly review link stays.
- `components/today/SearchTrail.tsx`: rebuilt on `Trail` (horizontal), with the `sun` on the furthest stage reached. The counts and company names stay.
- `components/today/QuickActions.tsx`: restyled with `Button`.

**Intended visual change:** five cards become one sheet plus open sections. The greeting gets real presence. The week reads as a trail, and zeros stop shouting.

**Dependencies:** Phases 1 to 3.

**Risks**
- *Today has the most states:* a next step, nothing urgent, setup incomplete, no jobs at all, the error state, and snoozed items. **Mitigation:** review every state, using the demo account and editing its data (snoozing items, deleting jobs) to reach each one.
- *Hiding zeros* changes what is shown, not what is computed. If every count is zero, the section shows one quiet sentence instead of disappearing, so the layout stays stable.
- *Logic stays put.* Item ordering and grouping remain in `lib/today.ts`; `lib/today.test.ts` must keep passing unchanged.

**Validation:** walk each state listed above; snooze and undo; start prep from the hero; change the date; keyboard order goes greeting → next step → list → aside; phone layout stacks in the same reading order; `today.test.ts` passes.

> **Checkpoint C: Today.** This is the most important review: it sets the tone for everything else. Look at it on desktop and phone, in light and dark, with real-feeling data.

## Phase 5: Job listings and application tracking

Split into two parts so each can be reviewed on its own.

### 5a. Pipeline and Companies

**Files affected**
- `app/applications/page.tsx`: the trail map from DESIGN.md §8. It groups the **already filtered and sorted** list by `STAGE_META[stage].group` under group headers on a vertical `Trail`. Rows follow the DESIGN.md anatomy (`Monogram`, role and company, next step, `StageIndicator`, relative time in `note` style, fit as a word plus number). Search, the stage and source filters, and sorting keep their current logic. Sorting becomes one `Select` ("Sort: Recently updated") instead of header arrows. Bulk delete moves behind an "Edit" `quiet` button that reveals checkboxes and a sticky action bar using the existing delete handler. On phones, rows stack and the page never scrolls sideways.
- `app/companies/page.tsx`: cards become rows with `Monogram`; select-all and bulk delete move behind "Edit", the same as Pipeline. The add/edit modal moves to `Dialog`.
- `app/companies/[companyId]/page.tsx`: the `read` frame, with research content as open sections rather than cards.
- A small shared helper for relative dates ("3 days ago", then "Oct 29", with the year only when it isn't the current one). It is pure, unit-tested and placed in `lib/` next to the existing date helpers in `lib/next-steps.ts` (`dayLabel`).

**Risks**
- *Grouping vs. sorting.* Users can sort by date or fit. Within each group the chosen sort is kept, and the groups always appear in journey order. With a stage filter active, only that group shows.
- *Bulk delete behind Edit* is one extra click. That's a deliberate trade for a calmer list, and is noted here so it can be reversed if you dislike it.
- *Fit labels* ("Strong", "Possible", "Long shot") are display-only thresholds over the existing score.

**Validation:** search, filter by stage and source, sort each way, bulk delete with undo, open a job from a row with mouse and keyboard; companies add, edit, open and bulk delete; the 8 demo jobs and a 40-job list (added temporarily to a test account) both stay readable; 390px and 320px have no sideways scroll.

> **Checkpoint D: Pipeline and Companies.**

### 5b. The job page

**Files affected**
- `app/applications/[jobId]/page.tsx`: the `read` frame. `StepRail` is rebuilt on `Trail` (horizontal, interactive nodes, `aria-current="step"`, keeping the same `onSelect`, `JOB_STEPS` and `stepsDone` inputs). The current step's work area sits on the `Sheet`; Decide's "Is it a fit?", "Job description", "The company" and "Details" become open sections, with Details as a definition list. `Nudge` moves to `sun-wash` with a `secondary` button. The Notes `<details>` keeps its behaviour, restyled as an open section.
- `components/job/CoverLetterPanel.tsx`: the letter as paper on the `Sheet` in `reading` type. Edit, "Save to Answers", Copy and delete move into a toolbar and `Menu`. "Write another version" becomes an open section below the sheet.
- `components/LetterReview.tsx`: claim provenance moves from full-text underlines to margin notes (`note` style) on wide screens. On narrow screens it is a collapsible "Where each claim came from" list. Unbacked claims keep the amber `caution` treatment with an icon and text. The checks and their logic (`lib/claims.ts`, `lib/letter-quality.ts`) are untouched.
- `components/job/InterviewPrepPanel.tsx`, `DebriefPanel.tsx`, `InterviewDateField.tsx`: fields, chips and buttons switch to the shared components; cards become open sections.
- Outcome step (inside the job page): the three outcome choices stay as three options, styled as selectable rows with `moss` / `stone` dots. "Not this time" no longer uses red.

**Risks**
- *CoverLetterPanel and LetterReview are the densest UI in the app.* Margin notes need room, so below 1024px they fall back to the list.
- *Underline highlights carry meaning.* Removing them must not lose the mapping between a claim and its source. Each margin note anchors to its sentence, and hovering or focusing either one highlights the other.
- *Drafts.* Interview prep and debrief use `lib/use-draft.ts`. The restyle must not change field `name`s or keys, or drafts in progress would be lost.

**Validation:** go through every step on several demo jobs (Saved, Applied, Phone screen, Offer); score fit (expect the "needs a key" path in the demo); edit, copy and save a letter; check claim notes against the sources; enter an interview date and add it to the calendar; type a debrief, reload and confirm the draft survives; choose each outcome; delete a job and undo.

> **Checkpoint E: the job page,** especially the letter view.

## Phase 6: Interactions and motion

**Goal:** add the purposeful motion from DESIGN.md §10, and nothing else.

**Files affected**
- `app/globals.css`: the duration tokens and keyframes (`trail-draw` using `stroke-dashoffset`, `stamp`, `fade-up`, `highlight-fade`).
- `components/ui/Trail.tsx`: segments draw when a step completes or the stage advances, and the sun slides to the new node.
- Stage changes to Applied (in the job page header, in Pipeline, and on Today when the next step is "Apply"): a "Sent" stamp on the row or header.
- `components/today/ActionQueue.tsx`: "Not now" slides the row out and leaves "Back on Tuesday · Undo".
- `components/EditableField.tsx` and fields using `use-draft`: the "Saved" note fades in and out.
- `app/applications/page.tsx`: a newly added job gets the `sun-wash` highlight fade.
- `components/ui/Dialog.tsx`, `Menu.tsx`, `Select.tsx`: enter and exit transitions.
- `components/ui/Button.tsx`: the 0.98 press scale.

**Risks**
- *Motion hiding state changes from assistive tech.* Every animated change also has a text change announced through `role="status"`.
- *Reduced motion.* The existing global rule already zeroes durations. Trails must render fully drawn in that case, not stuck at the start, so the draw is built so its end state is the default.
- *Performance.* Only `transform`, `opacity`, colors and `stroke-dashoffset` animate, with no layout animation.

**Validation:** each behaviour from the DESIGN.md table, at normal speed, and again with Playwright's `reducedMotion: "reduce"`; a quick DevTools performance trace on Pipeline and the job page shows no layout thrash.

> **Checkpoint F: motion.** A short screen recording of each behaviour, at normal speed and with reduced motion.

**Milestone moments (needs your approval).** DESIGN.md §8 describes four once-only milestones. Showing each "only once per account" needs one new stored field, for example `milestonesSeen: string[]` on the user's Firestore document. That is a small data change and new behaviour, so it is not in the default plan. If you approve it, it slots into this phase with its own review.

## Phase 7: Empty states, loading states and responsive layouts

**Files affected**
- New `components/illustrations/`: eight inline SVG components (empty Pipeline signpost, Today all clear, empty Library contour map, Weekly review notebook, and four sun states for milestones if they're approved). They use `currentColor` and `var(--color-sun)` so dark mode works.
- `EmptyState` applied to: Pipeline (no jobs; and filters that match nothing, without an illustration), Today (nothing needs you), Companies, Resume, Library and each Library tab, Answers, Debrief, Weekly review (no reviews yet), Progress (no applications yet), Settings (no key yet uses `InlineMessage` instead).
- Loading: the 17 files using `animate-pulse` switch to static `well` skeletons shaped like the final layout. Spinners (`ti-loader-2`, 16 files) are kept only for AI actions in progress, inside the button that started them.
- `app/error.tsx` and `app/not-found.tsx`: Trailhead copy and layout, with one action each.
- **Responsive sweep:** every route at 320, 390, 768, 1024 and 1440px, plus 200% browser zoom. Fix any sideways scroll (except inside the Pipeline table view, if approved), wrapping, or touch targets under 44px on touch screens.

**Risks**
- *Illustration quality decides whether this feels custom or generic.* **Mitigation:** draw the first two (Pipeline and Today all clear) and review them before doing the rest.
- *Empty states on real accounts.* A new account isn't seeded, so these states need a fresh non-demo sign-in to check, or the demo account with its data deleted.

**Validation:** reach every empty state (delete demo data, or use a fresh account); throttle the network in DevTools to see each loading state; the full responsive and zoom sweep; check that illustrations are hidden from screen readers (`aria-hidden`) and that the sentence carries the meaning.

> **Checkpoint G: empty, loading and phone.** The first two illustrations are reviewed early, before the rest are drawn.

## Phase 8: Remaining screens and clean-up

### 8a. Remaining screens

**Files affected:** `app/resumes`, `stories`, `background`, `answer-bank`, `voice`, `goals` (already partly done in Phase 3), `debrief`, `settings`, `weekly-review`, `analytics`, `components/StoryTabs.tsx`, the landing page (`app/page.tsx`, `components/landing/*`).

**Intended visual changes**
- Me pages: open sections on the canvas, one sheet only where there's a primary thing to read (Voice profile text).
- Weekly review: a journal page, with past reviews as rows.
- Progress: one plain-language sentence above each chart, all charts in `ink` with `sun` for the highlighted series, no percentages from fewer than three data points, and a "Show as table" toggle per chart. Recharts colors come from the CSS variables instead of the hard-coded hex values on lines 131 to 186.
- Landing: the canvas and contour illustration replace the sunrise and glass, the eyebrow pill goes, and "How it gets there" becomes a single trail down the page instead of three cards. The copy stays.

**Needs your approval:** removing the three explainer cards at the top of Library (an audit recommendation). It is a content change, not just styling.

### 8b. Clean-up

- `app/globals.css`: delete `surface`, `app-backdrop`, `sunrise`, `glow-gradient`, `sun-orb`, `page-title`, `section-label`, the lavender `gray-*` overrides, the `primary-*` scale and the peach/rose/sky glow colors.
- `app/layout.tsx`: remove Nunito.
- `types/job.ts`: remove `badge` from `STAGE_META`.
- Remove leftover `dark:` variants that the semantic tokens made redundant, and `text-xs` / `text-gray-*` uses.
- New `scripts/check-design.mjs`, run as part of `npm run lint`: fails on the banned patterns from DESIGN.md §13 (blur, gradients, `text-xs` and arbitrary tiny sizes, `gray-*` text, stock hue scales, `uppercase`, large shadows).
- `CLAUDE.md`: replace the Calm theme paragraph with a short Trailhead summary that points to DESIGN.md.
- `README.md`: update screenshots if it has any.

**Risks**
- *Deleting utilities breaks any screen that was missed.* **Mitigation:** the check script and a project-wide search run before deletion. Tailwind silently ignores class names it no longer knows, so the build won't catch a missed one; the final screenshot sweep is the real check.
- *The landing page is what recruiters see first.* It gets its own review.

**Validation:** the check script passes; lint, types, tests and build pass; the full "after" screenshot sweep is compared against Phase 0; the whole [regression checklist](#regression-checklist) is walked once more in both themes.

> **Checkpoint H: the whole app, then merge.** A side-by-side of before and after for every route. Once you approve, the draft PR is marked ready and you merge it.

---

## Regression checklist

Walked at the end of each phase that touches the screen involved, and in full at Phase 8.

- **Auth and shell:** signed-out redirect to `/`; Google sign-in; "Try the demo" seeds and opens Today; "Leave demo"; theme toggle persists; mobile drawer opens, traps focus, closes with Escape and the scrim, and returns focus.
- **Today:** next step shows and opens the right job step; "Not now" snoozes with Undo; change interview date; the setup progress link; weekly review link.
- **Pipeline:** search; stage and source filters; sort; bulk delete with partial-failure message; open a job.
- **Add job:** paste a description and extract; from a link; manual fields; required-field errors; draft survives closing; save.
- **Job page:** each step opens; stage change with toast; source change; fit score (key and no-key paths); delete and undo; notes.
- **Letter:** write a version (key path); edit; copy; save to Answers; claim checks; "use as voice sample" rules.
- **Interview:** date field and calendar export; prep generation; debrief draft survives reload.
- **Companies:** add, edit, research, bulk delete.
- **Me:** resume upload (PDF) and activate; library tabs and search; answers; voice rebuild and preferences; goals save.
- **Settings:** save API key; it is never shown again after saving.
- **Progress and Weekly review:** charts render with data and with none; start, edit and delete a review; AI summary (key path).
- **Accessibility, every phase:** keyboard-only pass on changed screens; focus always visible; both themes; reduced motion; 390px phone.

## Decisions needed before or during the work

Defaults are in bold. I'll proceed on the defaults unless you say otherwise.

| # | Question | Options | Needed by |
|---|---|---|---|
| 1 | How the work ships | **One draft PR with checkpoints on its preview, merged once at the end** · a PR per phase, merged as it goes | Phase 1 |
| 2 | Milestone moments (needs a new stored field) | Build them in Phase 6 · **leave them out for now** | Phase 6 |
| 3 | Pipeline table-view toggle for long lists | Build it in 5a · **leave it out; the grouped list only** | Phase 5a |
| 4 | Remove Library's three explainer cards | **Remove them** · keep them, restyled | Phase 8a |
| 5 | Optional paper grain on the canvas | Try it at Checkpoint A · **no grain** | Checkpoint A |

## Rough size

| Phase | Files touched | Relative size |
|---|---|---|
| 1 Tokens and type | 3 | Small |
| 2 Layout and nav | about 24 | Medium (wide but shallow) |
| 3 Shared components | about 20 new and changed | Large |
| 4 Today | 7 | Medium |
| 5a Pipeline and Companies | 4 or 5 | Medium |
| 5b Job page | 6 | Large |
| 6 Motion | about 10 | Medium |
| 7 Empty, loading, responsive | about 25 | Medium |
| 8 Remaining screens and clean-up | about 25 | Large |
