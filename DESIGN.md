---
name: Wayfinder
description: A calm, guided job-search workspace — soft morning light, frosted cards, one clear next step.
colors:
  iris: "#5f57d2"
  iris-deep: "#4d45b5"
  iris-soft: "#766fe4"
  iris-mist: "#e8e6fe"
  iris-wash: "#f3f2ff"
  morning-paper: "#fbf9fe"
  lavender-50: "#f8f6fc"
  lavender-100: "#f1eef8"
  lavender-200: "#e4dff0"
  lavender-400: "#8f88a8"
  lavender-500: "#6f6889"
  lavender-600: "#5e5878"
  lavender-700: "#474260"
  night-indigo: "#221f3a"
  night-sky: "#17142b"
  peach-glow: "#ffd9c2"
  peach-ember: "#ffab7a"
  rose-glow: "#fbd3e4"
  sky-glow: "#cfe4fb"
typography:
  display:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.333
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.iris}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.iris-deep}"
  button-soft:
    backgroundColor: "rgb(255 255 255 / 0.9)"
    textColor: "{colors.night-indigo}"
    rounded: "{rounded.full}"
    padding: "10px 20px"
  button-outline:
    textColor: "{colors.lavender-600}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  input-text:
    backgroundColor: "#ffffff"
    textColor: "{colors.night-indigo}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card-surface:
    backgroundColor: "rgb(255 255 255 / 0.78)"
    rounded: "{rounded.xl}"
    padding: "20px"
  chip-badge:
    backgroundColor: "{colors.iris-wash}"
    textColor: "{colors.iris-deep}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  nav-tab-active:
    backgroundColor: "#ffffff"
    textColor: "{colors.night-indigo}"
    rounded: "{rounded.full}"
    padding: "6px 16px"
---

# Design System: Wayfinder

## Overview

**Creative North Star: "The Calm Morning"**

A job search is stressful, so Wayfinder should feel like the start of a fresh day: soft light coming over the horizon, nothing shouting, and one clear thing to do next. Every page sits on a fixed sunrise backdrop of peach, iris, sky and rose washes. Content floats above it on frosted, generously rounded cards. Type is friendly and rounded (Nunito) for headings and plain and legible (Figtree) for everything else. Actions are soft pills.

Calm comes from restraint rather than emptiness. There is one cool accent (iris) for actions and links, a lavender neutral that deepens into a night-sky indigo for dark mode, and a warm glow saved for "you are here" and "this matters now" moments. Status colors stay literal: emerald is good, amber means "check this", red is an error.

Light and dark are both first-class. Dark mode is the same morning just before dawn: the sunrise washes dim to low-opacity iris, plum and blue on night-sky indigo, and the cards become translucent indigo glass.

**Key Characteristics:**
- Fixed sunrise gradient backdrop behind every app page; the landing page uses an always-light version.
- Frosted translucent cards (blur 12px) with whisper-quiet shadows.
- Pills everywhere: buttons, tabs, chips and step rails are fully rounded.
- Nunito ExtraBold for headings and Figtree for body text.
- One action color (iris); the warm glow gradient marks the active or current thing.
- Lavender-tinted neutrals and no pure gray; dark mode is night indigo, not black.

## Colors

A soft, lavender-tinted palette with a single cool accent and a warm dawn glow that is reserved for emphasis.

### Primary
- **Iris** (#5f57d2): the action color. Primary buttons, links, toggles in the on state, selected checkboxes. Hover deepens to **Iris Deep** (#4d45b5).
- **Iris Soft** (#766fe4): focus rings (`ring-2`) on inputs and hover arrows. It is not a fill for text-bearing buttons.
- **Iris Mist / Iris Wash** (#e8e6fe / #f3f2ff): tinted badges, "done" step markers and AI-tagged chips. In dark mode these become `primary-950` fills with `primary-300/400` text.

### Tertiary (the dawn glow, decorative only)
- **Peach Glow** (#ffd9c2), **Rose Glow** (#fbd3e4), **Sky Glow** (#cfe4fb): the sunrise backdrop washes, and together with Iris Mist they form the `glow-gradient` (135°, peach → rose → iris mist).
- **Peach Ember** (#ffab7a): the sun mark's shadow tint. The sun mark itself is a radial gradient (#ffd9a8 → #ff9f6e → #f07aa8).

### Neutral
- **Morning Paper** (#fbf9fe): the page background under the sunrise washes.
- **Lavender 50–200** (#f8f6fc, #f1eef8, #e4dff0): subtle fills, hover backgrounds, input borders and dividers.
- **Lavender 400** (#8f88a8): icons only in light mode (about 3.2:1, which meets the 3:1 non-text minimum). In dark mode it is the secondary and hint text color (about 5.4:1 on Night Sky).
- **Lavender 500** (#6f6889): secondary and hint text in light mode (about 5:1 on Morning Paper, which passes AA). In dark mode it is for icons only (about 3.5:1).
- **Lavender 300** (#cbc5dc): borders and fills only. It is never text or an icon.
- **Lavender 600 / 700** (#5e5878 / #474260): body-secondary text and section labels.
- **Night Indigo** (#221f3a): primary text in light mode, and the dark-mode card tint.
- **Night Sky** (#17142b): the dark-mode page background.

### Semantic
Stock Tailwind **emerald** (good, high fit), **amber** (check this) and **red** (error, 400/500) keep their usual meanings. They are never decorative.

### Named Rules
**The One Accent Rule.** Iris is the only color that means "you can act on this." The warm glow never marks a clickable thing as clickable; it marks a thing as current or important.

**The Glow Is Earned Rule.** `glow-gradient` is for the active item (nav section, current step, active stage), the Today hero, nudges and empty-state medallions. If two glowing things compete in one viewport, one of them is wrong.

**The No Pure Gray Rule.** Every neutral is lavender-tinted. Never introduce Tailwind's stock slate, zinc or neutral grays.

## Typography

**Display Font:** Nunito (600/700/800), with a ui-sans-serif fallback
**Body Font:** Figtree, with a ui-sans-serif fallback
**Mono Font:** Geist Mono (rare; code and technical values)

**Character:** Nunito's rounded terminals give headings warmth and friendliness without being cute. Figtree is a clean geometric sans that keeps dense forms and lists readable. The pairing reads as kind but competent.

### Hierarchy
- **Display** (800, 2.25rem → 3.75rem at `sm`, line-height 1.08, tracking-tight): the landing page hero only.
- **Headline** (800, 1.875rem, tracking-tight): the Today hero greeting.
- **Title** (800, 1.5rem, -0.01em): `page-title`, one per page.
- **Section** (700, 0.875rem, Lavender 700 / Lavender 200 in dark): `section-label`, the heading inside each card. Navigation labels and tabs also use Nunito Bold.
- **Body** (400, 0.875rem): most UI text, including list items, form values and descriptions.
- **Label** (500, 0.75rem): hints, metadata, chips and timestamps.

### Named Rules
**The Two Voices Rule.** Nunito is for naming things (pages, sections, nav, steps, tabs). Figtree is for everything the user reads or types. Never set paragraphs or inputs in Nunito.

## Layout

App pages live inside `<AppShell>`: a 256px frosted sidebar on desktop (`md` and up), which collapses to a translucent top bar with a slide-in overlay on mobile. Sections with more than one page show pill `SectionTabs` above the content. Content columns are centered at `max-w-4xl` with 24px page padding (16px on phone for tabs).

The Today page uses a 3-column grid at `lg` (a 2-column main area plus a 1-column aside) and stacks below that. Inside cards, rhythm is 4–12px between list rows, 12px under section labels, and 16px between cards. Card padding is 20px.

Mobile is a requirement, not a fit-check. Rails and tab bars scroll horizontally (`overflow-x-auto`, `min-w-max`) instead of wrapping, and list rows allow two lines of detail at phone width (`line-clamp-2 sm:line-clamp-1`).

## Elevation & Depth

Soft layered glass. Depth comes from translucency over the fixed sunrise rather than from strong shadows. There are three planes: the backdrop, frosted chrome (sidebar and top bar at 55–60% white with `backdrop-blur-xl`), and frosted cards (78% white, blur 12px, a 1px near-white border). Shadows are barely there. They separate a card from the glow; they never lift it into the air.

### Shadow Vocabulary
- **Card whisper** (`0 1px 2px rgb(47 43 72 / 0.04), 0 8px 24px -12px rgb(47 43 72 / 0.12)`): every `surface` card. In dark mode it is `0 8px 24px -12px rgb(0 0 0 / 0.5)`.
- **Active pill** (`shadow-sm shadow-gray-900/5`): the active nav item, tab or step.
- **Primary button halo** (`shadow-sm shadow-primary-600/20`): the main call to action on a page.
- **Toast** (`shadow-lg shadow-gray-900/20`): Night Indigo toasts, the only strongly lifted element.

### Named Rules
**The Whisper Shadow Rule.** No shadow is darker than 12% opacity in light mode, except toasts. If you can clearly see a shadow, it is too strong.

## Shapes

Everything is soft. Interactive things are pills (`rounded-full`: buttons, tabs, chips, step rail items, avatars and toggles). Containers step up with their size: inputs at 12px, list rows and icon tiles at 16px, cards at 24px, and hero panels at 32px. Circles are reserved for the sun mark, avatars, step markers and empty-state medallions. There are no sharp corners anywhere.

## Components

### Buttons
Soft, confident pills.
- **Shape:** fully rounded (9999px).
- **Primary:** Iris fill with white Figtree Medium 14px text, padding 8px × 16px (10px × 20px for a page's main call to action, with the Iris halo). Hover changes to Iris Deep. Disabled is 50% opacity with `cursor-not-allowed`.
- **Soft:** 90% white fill with Night Indigo text. Used on glowing surfaces (Today hero, nudges) where Iris would fight the gradient. Hover is solid white.
- **Outline:** 1px Lavender 200 border with Lavender 600 text in Label size, padding 6px × 12px. Used for secondary actions in cards. Hover is a white fill.
- **Icon:** a 32px circle with a Lavender 400 glyph; hover is a white fill and darker glyph.
- **Focus:** a global rule in `globals.css` gives every link, button, switch, tab and focusable element a 2px Iris Soft outline offset by 2px on `:focus-visible`. Don't add `outline-none` to buttons or links.

### Chips / Badges
- **Style:** Iris Wash fill with Iris Deep text, 10–12px semibold, padding 2px × 8px, pill shape. Neutral chips use 70% white with a white border and Lavender 500 text.
- **Stage and active state:** the active stage or step uses `glow-gradient` with Night Indigo text.

### Cards / Containers
- **Corner Style:** 24px (`rounded-3xl`); hero panels are 32px.
- **Background:** the `surface` utility (78% white plus blur, or 72% Night Indigo in dark).
- **Shadow Strategy:** Card whisper (see Elevation & Depth).
- **Border:** 1px at 90% white (6% white in dark).
- **Internal Padding:** 20px. The section label sits on top with a 12px gap.

### Inputs / Fields
- **Style:** 1px Lavender 200 border, 12px radius, white fill (Lavender 800 in dark), 14px Figtree, padding 8px × 12px, Lavender 500 placeholder (Lavender 400 in dark).
- **Focus:** the border goes transparent and a 2px Iris Soft ring appears.
- **Toggle:** a 36 × 20px pill track, Iris Soft when on and Lavender 200 when off, with a white 16px knob.

### Navigation
- **Sidebar:** four sections (Today, Jobs, Me, Settings). Each row has a 36px icon tile, a Nunito Bold 15px label and a 12px hint line. The active row gets a white pill, and its icon tile gets `glow-gradient`. Hover is 60% white.
- **Section tabs:** a frosted pill track holding Nunito Bold 14px tabs. The active tab is a white pill with a whisper shadow. The track scrolls horizontally on phones.
- **Mobile:** a frosted top bar with menu, logo and theme toggle. The sidebar slides in over a 20% Night Indigo blurred scrim.

### Step Rail (signature)
The per-job workflow (letter, prep, debrief and so on) runs as a horizontal rail of pills joined by short hairlines. The current step glows (`glow-gradient`), finished steps show an Iris Mist check marker, and upcoming steps are quiet Lavender 500 text. This expresses "one clear next step," the heart of the Calm Morning.

### Sun Mark and Today Hero (signature)
The logo is a warm radial-gradient circle (the sun) beside the Nunito ExtraBold wordmark. On Today, a 32px-radius glow panel holds the greeting, with a large blurred sun rising from the top-right corner. This is the one place the dawn gets to be loud.

### Empty States
A 40–48px `glow-gradient` circle medallion holds a single icon, centered above a short line of copy and one action.

## Do's and Don'ts

### Do:
- **Do** put every card on the `surface` utility and every page on `app-backdrop`. Don't hand-roll near-copies.
- **Do** use Iris (#5f57d2) for every primary action and link, and keep it the only action color.
- **Do** use `glow-gradient` only for the current or active item, nudges, the Today hero and empty-state medallions.
- **Do** use `page-title` once per page and `section-label` for card headings.
- **Do** keep everything clickable pill-shaped, and keep containers between 12px and 32px radius by size.
- **Do** keep the global `:focus-visible` outline working: never add `outline-none` to buttons or links. WCAG 2.2 AA is required.
- **Do** use `text-gray-500 dark:text-gray-400` (or darker) for muted text, and `text-gray-400 dark:text-gray-500` for icons only. Never put `text-gray-300` or `dark:text-gray-600` on text or icons.
- **Do** design dark mode alongside light: night-indigo glass, dimmed dawn washes, `primary-950` badge fills.
### Don't:
- **Don't** reintroduce the old name "HuntDesk". The product is Wayfinder.
- **Don't** introduce stock Tailwind slate, zinc or neutral grays, or pure black. Neutrals are lavender, and dark is night indigo.
- **Don't** use the warm glow or peach/rose as status colors. Status is emerald, amber or red only.
- **Don't** use shadows darker than about 12% opacity, except on toasts.
- **Don't** use square or sharp corners, or small radii (`rounded-sm`, `rounded-md`) on new components.
- **Don't** set body copy or form input text in Nunito.
