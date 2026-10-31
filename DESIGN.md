---
name: Wayfinder
description: Trailhead. A warm field journal for a job search. Paper and ink, one sun that marks where you are, and a drawn trail that connects every step.
colors:
  canvas: "#F6F0E6"
  sheet: "#FFFBF5"
  well: "#EFE7DA"
  ink: "#2B2645"
  ink-soft: "#57516B"
  ink-muted: "#67616F"
  rule: "#E4DACB"
  control: "#8C8173"
  action: "#5F57D2"
  action-hover: "#4D45B5"
  action-wash: "#ECEAFB"
  sun: "#E8772E"
  sun-ink: "#A24A15"
  sun-wash: "#FCE3CF"
  sky: "#3A6696"
  sky-wash: "#E3ECF6"
  moss: "#3F7350"
  moss-wash: "#E2EEE3"
  stone: "#6F655E"
  stone-wash: "#ECE6DE"
  caution: "#8A5A0A"
  caution-wash: "#F8EBCF"
  danger: "#A63A2E"
  danger-wash: "#F7E1DD"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  reading:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  meta:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  note:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.4
rounded:
  mark: "4px"
  stamp: "8px"
  field: "12px"
  sheet: "20px"
  dialog: "24px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
  16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.control}"
    rounded: "{rounded.full}"
    height: "40px"
    padding: "0 18px"
  button-quiet:
    textColor: "{colors.action}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    borderColor: "{colors.control}"
    rounded: "{rounded.field}"
    height: "44px"
    padding: "0 14px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "32px"
  dialog:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.dialog}"
    padding: "32px"
  monogram:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    rounded: "{rounded.stamp}"
    size: "36px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.field}"
---

# Design System: Wayfinder (Trailhead)

This document is the approved visual system for Wayfinder. It replaces the earlier "Calm Morning" system (frosted cards on a sunrise gradient). The code has not been migrated yet. Until it is, `app/globals.css` still holds the Calm Morning tokens, and the [migration plan](#13-how-this-fits-the-current-code) below explains how the two coexist.

The tokens in the front matter are the light-mode values. Dark-mode values are in [Color](#2-color).

## 1. The idea

**Creative north star: Trailhead.** Wayfinder is a well-made field journal for a job search. It is warm paper and deep ink, and a calm guide who has walked this route before. One sun marks where you are, and a drawn trail connects every step.

The personality is **warm, playful but mature, encouraging without cheese, calm without emptiness**. The playfulness comes from wit, a soft serif, small drawn details and moments that are earned. It does not come from a high volume of color or effects.

### Five rules everything else follows

1. **One loud thing per screen.** Each screen has at most one raised sheet, one primary button and one illustration. Everything else sits on the page.
2. **Color has a job.** Each color means one thing. Decoration never borrows a status color.
3. **Delight is earned.** Personality appears at moments (a step done, an application sent, an offer), never as permanent decoration.
4. **Dense where you work, airy where you feel.** Pipeline and the letter editor are information-rich. Today, milestones and the weekly review get room to breathe.
5. **Never punish.** No streaks to break, no bold zeros, no red for being turned down.

### What this system is not

| It is not | So we don't use |
|---|---|
| A startup landing template | Mesh gradients, glass, blurred orbs, sparkle eyebrow pills |
| A SaaS admin panel | Cards inside cards, checkbox columns, a sort arrow on every header |
| A meditation app | Full-screen color fields, mascots with faces, breathing animations |
| A game | Streaks, points, confetti, badges for logging in |

## 2. Color

The palette is paper, ink, one action color and one sun. Status hues are earthy and quiet.

### Roles

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Background | `canvas` | #F6F0E6 | #16132A | The page. Everything sits on this by default. |
| Surface | `sheet` | #FFFBF5 | #221F38 | The one raised sheet per screen, dialogs, menus, inputs. |
| Sunken | `well` | #EFE7DA | #1C1932 | Row hover, selected row, monogram fill, quoted text. |
| Text | `ink` | #2B2645 | #F3EEE6 | Headings and body. |
| Text, secondary | `ink-soft` | #57516B | #C9C2D6 | Supporting lines, inactive nav and tabs. |
| Text, meta | `ink-muted` | #67616F | #A39CB4 | Dates, sources, help text. The lightest text allowed. |
| Border, decorative | `rule` | #E4DACB | #37324F | Hairlines between rows and sections. Never the only boundary of a control. |
| Border, control | `control` | #8C8173 | #7A7394 | Input, select, checkbox and secondary button outlines (at least 3:1). |
| Primary | `action` | #5F57D2 | #A7A1F5 | Primary buttons, links, focus ring, checked controls. |
| Primary, hover | `action-hover` | #4D45B5 | #C3BEFA | Hover and pressed states of `action`. |
| Primary, tint | `action-wash` | #ECEAFB | `action` at 16% | Selected menu item, selected chip. |
| Accent | `sun` | #E8772E | #F59A52 | Where you are and progress: current step, trail position, milestones, the logo. A fill only, never text on light. |
| Accent text | `sun-ink` | #A24A15 | #F59A52 | The rare time sun-colored text is needed (a milestone line). |
| Accent, tint | `sun-wash` | #FCE3CF | `sun` at 16% | The Today next-step sheet's edge, milestone background. |

The secondary color is ink itself. Wayfinder has no second brand hue: anything that isn't an action, a position or a status is ink on paper.

### Status and stage colors

Each hue has a strong value (text, dots, icons) and a wash (backgrounds). In dark mode the wash is the strong value at 16% opacity.

| Token | Light | Dark | Means |
|---|---|---|---|
| `sky` / `sky-wash` | #3A6696 / #E3ECF6 | #8DB6E6 | Information. Stage: **Applied**. |
| `moss` / `moss-wash` | #3F7350 / #E2EEE3 | #7FBF8E | Good, done, strong fit. Stage: **Offer**. |
| `stone` / `stone-wash` | #6F655E / #ECE6DE | #B3A9A0 | Neutral, closed. Stages: **Saved** (hollow dot), **Not this time**, **Stepped away**. |
| `caution` / `caution-wash` | #8A5A0A / #F8EBCF | #E8B45A | Check this: an unbacked claim, a missing field. |
| `danger` / `danger-wash` | #A63A2E / #F7E1DD | #F08A7E | Something broke or is destructive: errors, delete. Never a job outcome. |

The **Phone screen** and **Interview** stages use `sun`, because "talking to them" is where the trail is moving.

### Contrast (WCAG 2.2)

Every text token is checked against the backgrounds it is allowed on.

| Text | on canvas | on sheet | on well |
|---|---|---|---|
| `ink` | 12.6:1 | 13.9:1 | 11.7:1 |
| `ink-soft` | 6.6:1 | 7.3:1 | 6.1:1 |
| `ink-muted` | 5.3:1 | 5.8:1 | 4.9:1 |
| `action` | 4.9:1 | 5.4:1 | 4.5:1 |
| `sky`, `moss`, `stone`, `caution`, `danger`, `sun-ink` | 4.9 to 5.7:1 | 5.4 to 6.2:1 | 4.5 to 5.2:1 |
| White on `action` button | 5.6:1 | | |
| Each strong hue on its own wash | 4.6 to 5.1:1 | | |

In dark mode, every text token is at least 5.3:1 on `canvas`, `sheet` and the raised dialog surface (#2C2846). `control` is at least 3:1 against its surface in both modes. `sun` on light backgrounds is 2.6:1, which is why it is a fill and never text.

### Background treatment

- The background is flat `canvas`. No gradients, no blur, no fixed washes.
- One optional paper grain (an inline SVG noise at 2 to 3% opacity) may be applied to `canvas` only. If it shows up in screenshots as dirt, remove it.
- Dark mode is the **night trail**: deep ink, with `sun` as the warmest and brightest point on the screen.

## 3. Typography

| Family | Role | Why |
|---|---|---|
| **Fraunces** (variable, `SOFT` 100, `opsz` auto) | Display, titles, headings, numbers, notes | A soft, slightly quirky serif. Friendly and mature, and it doesn't look like a template. |
| **Figtree** | Everything you read, click or type | Clear, warm geometric sans that stays legible at small sizes. Already in the app. |
| **Geist Mono** | API keys and technical values only | Already in the app. |

### Scale

| Token | Family | Size / line height | Weight | Use |
|---|---|---|---|---|
| `display-xl` | Fraunces | 56 / 60 (40 / 44 on phones) | 600 | Landing hero only. |
| `display` | Fraunces | 40 / 44 (32 / 38 on phones) | 600 | Today greeting, milestone line. One per screen at most. |
| `title` | Fraunces | 30 / 36 | 600 | Page titles, the role on a job page. |
| `heading` | Fraunces | 22 / 28 | 600 | Section headings on reading pages, dialog titles. |
| `reading` | Figtree | 17 / 28 | 400 | Letters, job descriptions, interview notes. |
| `body` | Figtree | 16 / 24 | 400; 600 for emphasis | Default UI text, row titles (600). |
| `label` | Figtree | 13 / 18 | 600 | Section labels, form labels. Sentence case. |
| `meta` | Figtree | 13 / 18 | 400 | Dates, sources, help text. |
| `note` | Fraunces italic | 14 / 20 | 400 | Human asides: "3 days ago", "from your resume". |
| `numeral` | Fraunces, tabular figures | 28 / 32 or 40 / 44 | 600 | Counts on Today and Progress. |

### Rules

- **The floor is 13px.** Nothing in the product is smaller. `text-xs` (12px) and arbitrary `text-[10px]` are retired.
- **Serif names things, sans does the work.** Fraunces is for titles, headings, numbers and short notes. Paragraphs, inputs, buttons and table data are always Figtree.
- **Hierarchy by size and weight before color.** Secondary text steps down to `ink-soft`, never lighter than `ink-muted`.
- **Sentence case everywhere.** No uppercase eyebrows, no letter-spaced labels.
- **Line length** is 50 to 75 characters for `reading` and `body` paragraphs.
- **Numbers** use tabular figures (`font-variant-numeric: tabular-nums`) wherever they line up.

## 4. Spacing

A 4px base that matches Tailwind's default spacing steps. Only these steps are used:

| Token | px | Tailwind | Typical use |
|---|---|---|---|
| 1 | 4 | `1` | Icon to label, dot to text |
| 2 | 8 | `2` | Inside chips, between a label and its field |
| 3 | 12 | `3` | Between lines in a row, between buttons |
| 4 | 16 | `4` | Row padding, field gaps, phone gutter |
| 6 | 24 | `6` | Between groups inside a section, tablet gutter |
| 8 | 32 | `8` | Sheet padding, gap under a page header |
| 12 | 48 | `12` | Between sections |
| 16 | 64 | `16` | Before a page's closing element, landing sections |

Odd steps (5, 7, 10, 14) are not used in new code.

### Density

| Mode | Row height | Where |
|---|---|---|
| Comfortable (default) | 64px for a two-line row, 48px for one line | Today, Pipeline, Library, Companies |
| Compact | 40px, one line | Pipeline's table view, long settings lists |
| Reading | `reading` type, 24px between paragraphs | Letters, job descriptions, notes |

**Spacing groups things; lines separate them.** If a hairline `rule` is needed to tell two groups apart, first try adding space.

## 5. Layout

### The frame

- **Desktop (≥ 1024px):** a 232px left rail on `canvas` with a `rule` on its right edge. The content area holds a centred column.
- **Tablet (768 to 1023px):** a 72px rail with the sun mark and section initials on hover, or the phone pattern. Use whichever keeps labels readable.
- **Phone (< 768px):** a top bar (menu, wordmark, theme) and a slide-in drawer. This is the existing pattern.

### Two content widths, no others

| Width | Value | Pages |
|---|---|---|
| `read` | 720px (`max-w-[45rem]`) | Job page, letter, Me (Resume, Library, Voice, Goals), Settings, Weekly review |
| `wide` | 1040px (`max-w-[65rem]`) | Today, Pipeline, Companies, Progress |

Gutters are 16px on phones, 24px on tablets and 40px on desktop. The column is centred in the content area, and the section tabs sit inside the column, aligned to its left edge.

### Page anatomy

Every page uses the same header:

```
[ tabs, if the section has more than one page ]   space 6
[ title (Fraunces) ]          [ one primary action ]
[ one line of context, ink-soft ]
                                                   space 8
[ content ]
```

Today replaces the title with the `display` greeting and the date in `meta` above it.

### Grid

- `wide` pages use a 12-column grid with a 24px gap. Today is 8 + 4 (the next step and list, then "Coming up" and "This week") at ≥ 1024px, and stacks below that. No other page uses columns by default.
- `read` pages are a single column.
- **No three-up feature grids** in the app. On the landing page, the "how it works" content is a single trail running down the page, not three equal cards.

### Sections

Between sections: 48px. A section is a `label` or `heading`, then its content. It is not a box.

## 6. Shape

Radius says what kind of thing something is. Things that are the same kind share a radius.

| Token | Radius | Kind | Examples |
|---|---|---|---|
| — | 0 | Lines and flat lists | Rules, table rows, the trail |
| `mark` | 4px | Inline marks | Text highlights, keyboard keys, inline code |
| `stamp` | 8px | Small objects | Company monograms, tooltips, menu items, the "Sent" stamp |
| `field` | 12px | Things you type into or choose from | Inputs, textareas, selects, menus, toasts, inline messages |
| `sheet` | 20px | The one raised surface | The Today next step, the letter, the job's current step |
| `dialog` | 24px | Things that sit above the page | Dialogs, the bottom sheet on phones |
| `full` | 9999px | Things you press, and dots | Buttons, chips, toggles, stage dots, avatar, the sun |

Checkboxes use 5px. Nothing else gets a one-off radius.

## 7. Depth

There are exactly two shadows.

| Token | Value (light) | Use |
|---|---|---|
| `shadow-sheet` | `0 1px 0 rgb(43 38 69 / 0.04), 0 12px 32px -20px rgb(43 38 69 / 0.25)` | The one sheet per screen |
| `shadow-overlay` | `0 24px 48px -16px rgb(22 19 42 / 0.35)` | Dialogs, menus, toasts |

- In light mode the sheet has no border: the paper-on-oat difference plus the shadow is enough.
- In dark mode, shadows are barely visible, so the sheet gets a 1px `rule` border instead and the overlay keeps its shadow.
- Nothing else casts a shadow. Buttons, rows, chips, tabs and the rail are flat.
- No `backdrop-filter` anywhere. Dialog scrims are `ink` at 40% (`#000` at 60% in dark), without blur.

## 8. Components

The components below are the full vocabulary. If a design needs something that isn't here, add it to this document first.

### Buttons

| Variant | Look | Use |
|---|---|---|
| **Primary** | `action` fill, white Figtree 600 15px, pill | The one main action on a screen. Never more than one visible at a time. |
| **Secondary** | Transparent, 1px `control` border, `ink` text, pill | Alternatives: "Change date", "Cancel" in dialogs. |
| **Quiet** | Text only, `action` color, pill-shaped hover in `well` | Low-weight actions in rows and toolbars: "Not now", "Edit". |
| **Danger** | Quiet style in `danger` text; a filled `danger` button only inside a delete confirmation | Delete, remove. Lives in a "More" menu, never next to the title. |
| **Icon** | 36px circle, `ink-soft` glyph, `well` on hover, `aria-label` required | Close, More, theme. |

Sizes: small 32px, default 40px, large 48px (the Today next step and dialog footers on phones). The icon sits before the label with a 6px gap, and only if it adds meaning ("+" in Add a job, an arrow in Start prep).

States: hover changes color only (no lift or glow). Pressed scales to 0.98. Disabled is 45% opacity with `cursor-not-allowed`, and the reason goes in nearby text. Loading keeps the width, swaps the label for "Saving…" or "Writing…" and shows a 14px spinner.

```tsx
<button className="h-10 px-5 rounded-full bg-action text-white font-semibold text-[15px] hover:bg-action-hover active:scale-[.98] transition-[background-color,transform] duration-150">
  Start prep
</button>
```

### Inputs and textareas

- 44px height, `sheet` fill, 1px `control` border, `field` radius, 16px Figtree, `ink` text, `ink-muted` placeholder.
- The label sits above in `label` style with 8px between them. Help text sits below in `meta`. Labels are always visible; a placeholder is never the label.
- Focus: the border turns `action` and a 2px `action` ring appears at 2px offset.
- Error: the border turns `danger`, and a `meta` line in `danger` with an alert icon explains the fix ("Add the company name so you can find this later"). It is linked with `aria-describedby`.
- Textareas grow with their content up to 12 lines, then scroll.

### Dropdowns (select and menu)

- The trigger looks like an input (in forms) or a secondary button (in toolbars), with a chevron.
- The listbox is a `sheet` surface with `field` radius and `shadow-overlay`, 6px padding. Items are 40px high with `stamp` radius. The hovered or active item gets `well`, and the selected item gets `action-wash` and a check.
- Keyboard: arrows move, Enter selects, Escape closes, and typing jumps to a match. It uses the listbox pattern from the ARIA Authoring Practices.
- Native `<select>` is retired from visible UI. It is fine as the hidden fallback inside the component.

### Tabs (section tabs)

- Plain Figtree 600 15px text in `ink-soft`, 40px high, 24px apart, sitting on `canvas` with no track or pill.
- Active tab: `ink` text and a 2px `ink` line under the label, with rounded ends. This is the "trail stroke".
- Hover: `ink` text. Tabs are links (`aria-current="page"`) because each is its own page.
- On phones the row scrolls sideways and the active tab scrolls into view.

### Navigation rail

- Wordmark at the top: a flat `sun` disc (20px) and "Wayfinder" in Fraunces 600 20px.
- Four items (Today, Jobs, Me, Settings): Figtree 600 16px, 40px rows, `ink-soft`. The current item is `ink` with an 8px `sun` dot to its left. That dot is the "you are here" mark. The current link has `aria-current="page"`.
- Hover is a `well` pill. No icons and no taglines in the rail.
- The account, theme toggle and sign-out live at the bottom as quiet icon buttons.

### Job listings (Pipeline)

**Default: the trail map.** Jobs are grouped by stretch of the journey, and each group hangs off a vertical trail line.

| Group | Stages | Trail node |
|---|---|---|
| Exploring | Saved | hollow `stone` |
| Applied | Applied | `sky` |
| Talking | Phone screen, Interview | `sun` |
| Decided | Offer, Not this time, Stepped away | `moss` / `stone` |

Group header: `label` with the count in `meta` ("Talking · 2"), plus the node on the trail. Empty groups collapse to the header.

Row anatomy (64px, no card, a `rule` below, `well` on hover, the whole row is one link):

```
[monogram]  Product Designer, Design Systems              Prep for Monday's phone screen →     ● Phone screen
            Fieldnote · Remote                                                                  3 days ago
```

- **Monogram:** 36px, `stamp` radius, `well` fill, the company's first letter in Fraunces 600 16px. It replaces every generic building icon.
- **Line one:** the role in `body` 600. **Line two:** the company and location in `meta`.
- **Next step:** in `body` `ink` with an arrow. If there isn't one, show nothing; don't show a dash.
- **Stage:** the stage indicator (below), right-aligned. **Time:** relative, in `note` style.
- **Fit**, when scored, sits under the stage as a word plus number: "Strong · 86" (≥ 75, `moss`), "Possible · 64" (55 to 74, `ink-soft`), "Long shot · 48" (< 55, `stone`).
- **Bulk edit** is behind an "Edit" quiet button, which reveals checkboxes and a sticky action bar. Sorting is one "Sort: Recently updated" menu, not arrows on every header.
- **Table view** (a toggle) is the compact density with the same columns, for people tracking 30+ jobs. It uses `rule` lines, no zebra stripes, sticky headers.
- **Phones:** the next step moves to a third line, the stage dot and label to the top right. Nothing scrolls sideways.

### Status indicators

- **Stage indicator:** an 8px dot in the stage color, then the stage name in `meta` `ink-soft`. Saved is a hollow dot (1.5px `stone` ring). Color is never the only signal; the name is always shown.
- **Inline message:** a `field`-radius block with the hue's wash, a 16px icon in the strong hue and `body` `ink` text. Use it for caution and danger only. Success is shown by the thing changing, not by a green box.
- **Counts:** `numeral` with a `body` label after it: **2** sent. Zero counts are hidden, not shown in bold.
- **Progress through a job: the trail** (below), never a percentage bar.

### The trail (signature)

The connective line of the product. It appears on the job page (five steps, horizontal), Pipeline (groups, vertical), Today (the week, horizontal) and the landing page.

- The line is 2px with round caps. Finished segments are `ink-soft`; upcoming segments are `rule`, dashed 4/6.
- **Nodes:** done is a 12px `ink-soft` circle with a white check; current is a 16px `sun` disc; upcoming is a 12px hollow `control` ring.
- **Labels:** Figtree 600 15px under or beside each node. The current one is `ink` and the rest are `ink-soft`.
- On the job page every node is a button that opens that step (`aria-current="step"` on the current one).

### The sheet

The one raised surface per screen: `sheet` fill, `sheet` radius, `shadow-sheet`, 32px padding (20px on phones). Nothing nests inside it except rows, fields and one inline message. A sheet inside a sheet is a bug.

| Screen | What gets the sheet |
|---|---|
| Today | The next step |
| Job page | The current step's work area |
| Letter | The letter itself, as paper |
| Add job, dialogs | The dialog |
| Every other page | Nothing: content sits on `canvas` |

### Dialogs

- `sheet` fill, `dialog` radius, `shadow-overlay`, 32px padding, 560px wide (720px for the letter review). A plain `ink` scrim at 40%.
- The title is a `heading` in Fraunces, with an icon close button top right. Footer actions are right-aligned with the primary last; on phones they stack full width, primary on top.
- On phones the dialog is a bottom sheet with `dialog` radius on the top corners only.
- Focus moves into the dialog on open, is trapped while it is open, and returns to the trigger on close. Escape and the close button both close it. Dialogs with unsaved typing ask before discarding.
- **Add job** opens with one field: "Paste a link or the job description." The details fill in afterwards and stay editable.

### Toasts

`ink` fill with `sheet` text, `field` radius, `shadow-overlay`, bottom centre, 4 seconds (paused on hover or focus). Only for actions that can be undone ("Deleted Oakline Studio. Undo"). Routine saves don't toast; a "Saved" note appears beside the field instead. Announced with `role="status"`.

### Checkboxes and toggles

- Checkbox: 18px, 5px radius, `control` border. Checked is an `action` fill with a white check.
- Toggle: a 40 × 24px pill track. Off is `control`, on is `action`, and the knob is 18px `sheet`. Use `role="switch"` with a visible label.

### Empty states

One illustration (120px), one sentence in `body` `ink-soft`, one action. It is not inside a sheet.

> Every trail starts with one saved role. **[Paste a job link]**

### Milestone moments

These appear once each, at four moments: the first saved role, the first application, the first interview booked, and the first offer.

- A `sun-wash` band across the top of the current page (not a modal), containing the matching sun illustration, a `display` line and one quiet "Close" button.
- The copy for each: "Your first role is saved." · "First one sent. Now it's their move." · "They want to talk." · "You got here."
- They are dismissed with one tap or Escape, and are never shown again for that account.

## 9. Illustration and icons

### Illustration style

- **Line plus one fill.** 2px strokes in `ink` (light) or `ink-soft` (dark), with round caps and joins. The only fill is flat `sun`. No gradients, shading or textures.
- **Vocabulary:** the trail (a path that curves gently), the sun (a disc), low hills (two or three curved lines), contour lines (1.5px `rule`), and small objects drawn in the same line (a notebook, an envelope, a signpost).
- **No people, no faces, no hands.** The sun has states, not expressions: low (just starting), rising (in motion), up (offer).
- **Size and placement:** 96 to 160px, only in empty states, milestones, the weekly review header and the landing page. At most one per screen.
- **Build:** inline SVG React components in `components/illustrations/`, using `currentColor` for strokes and `var(--color-sun)` for the fill so they switch with dark mode. No raster images.

The first set has eight pieces: empty Pipeline (a trailhead signpost), all clear on Today (the sun over hills), empty Library (contour map), Weekly review (an open notebook with a trail), and four milestone suns.

### Icons

- Tabler outline icons through the existing subset webfont, at 20px with a 1.75 stroke, in `ink-soft`.
- **An icon must carry meaning or save space.** Use one on an icon-only button (with `aria-label`), on a trail node, in an inline message, or in front of an action label when it clarifies ("+").
- **Never** use icons as decoration in tinted tiles, in front of every row, beside every section heading, or in the navigation rail.
- At most one icon per row.

## 10. Motion

Motion explains a change or rewards a step. If it does neither, it doesn't ship.

### Tokens

| Token | Duration | Easing | Use |
|---|---|---|---|
| `instant` | 100ms | linear | Hover color changes |
| `quick` | 160ms | `ease-out` | Press, small fades, the "Saved" note |
| `base` | 240ms | `ease-out` | Menus, dialogs and drawers entering, rows sliding away |
| `draw` | 400ms | `ease-in-out` | A trail segment drawing, a check stroke |
| `moment` | 700ms | `ease-out` | A milestone sun rising (once) |

`ease-out` is `cubic-bezier(0.22, 1, 0.36, 1)` and `ease-in-out` is `cubic-bezier(0.65, 0, 0.35, 1)`. Exits run at about 70% of the entry duration. There are no springs, bounces or overshoots.

### Behaviours

| Moment | Motion |
|---|---|
| Hover a button, row or link | Color or background only. Nothing moves or lifts. |
| Press a button | Scale to 0.98 over `quick`. |
| A job moves forward | The trail segment draws to the next node (`draw`), then the sun slides there. |
| Mark a job applied | A small "Sent" stamp presses onto the row (scale 1.06 to 1, `quick`). |
| Finish a step | The check draws as one stroke (`draw`). |
| "Not now" on Today | The row slides out and collapses (`base`), leaving "Back on Tuesday · Undo". |
| Save a field | A "Saved" note in `note` style fades in, then fades out after 2 seconds. |
| A new job lands in Pipeline | A `sun-wash` background fades out over 1.5 seconds. |
| Open a menu or dialog | Fade in and move up 4px (`base`). |
| A milestone | The band fades in and the sun rises 12px (`moment`). Once. |

### Limits

- Nothing loops, pulses or runs on page load, except a loading spinner while something is loading.
- Skeletons are static `well` blocks with no shimmer.
- Only `transform`, `opacity`, `color`, `background-color` and `stroke-dashoffset` are animated.
- **Reduced motion:** the existing global rule in `globals.css` stays. With `prefers-reduced-motion: reduce`, trails and checks appear fully drawn, the stamp and sun appear in place, and fades become instant.

## 11. Content style

Wayfinder sounds like a calm friend who has done a job search: specific, plain, warm and occasionally dry.

### Principles

1. **Say the next thing.** Lead with what to do, then why, if needed.
2. **Be specific.** "Prep for Monday's phone screen with Fieldnote" beats "You have an upcoming interview."
3. **Encourage with facts, not cheers.** "2 sent this week" encourages; "Great job!!" doesn't.
4. **Be kind about outcomes.** Name them plainly and don't dwell.
5. **Describe AI by what it does.** "Draft a letter from your stories", never "Generate with AI ✨".

### Mechanics

- Sentence case for everything, including buttons, titles and tabs.
- Buttons start with a verb and say what happens: "Save job", "Start prep", "Write a new version". Avoid "Submit", "OK" and "Click here".
- Numerals for every number ("2 sent", not "two sent").
- Dates: relative within a week ("Today", "Yesterday", "Monday", "3 days ago"), then "Oct 29". Add the year only when it isn't the current year.
- Errors say what happened and what to do: "Couldn't reach Anthropic. Check your key in Settings, then try again."
- No exclamation marks on routine actions. At most one, at a real milestone.
- No em-dash lists ending in "and more". No "unlock", "supercharge", "seamless", "leverage" or "journey" (show the trail; don't say the word).

### Examples

| Moment | Do | Don't |
|---|---|---|
| Today, nothing urgent | "Nothing needs you today. Want to look at one saved role?" | "You're all caught up! 🎉" |
| After applying | "Applied. Now it's their move." | "Application submitted successfully!" |
| Rejection | "Not this time. Your notes still count." | "Unfortunately, you were rejected." |
| Stepping away | "Knowing when to walk away is a skill." | "Job archived." |
| Empty Pipeline | "Every trail starts with one saved role." | "No jobs found. Get started by adding a job!" |
| Weekly count | "2 sent, 1 interview written up" | "0 letters written" |
| A claim not found | "This line isn't in your resume or stories yet. Make sure it's true, or cut it." | "Warning: unverified claim detected." |
| Missing API key | "Add your Anthropic key to draft letters and score fit." | "Unlock AI features — JD extraction, cover letters, and more." |

## 12. Accessibility

The target is WCAG 2.2 AA in both themes.

- **Contrast:** every text token passes 4.5:1 on its allowed backgrounds (see [Color](#2-color)). Control borders and focus rings pass 3:1. `sun` is never text on light backgrounds.
- **Color is never the only signal:** stages show a name, claims show an icon and text, and fit shows a word.
- **Focus:** the global `:focus-visible` outline stays: 2px `action` at 2px offset (light `#5F57D2`, dark `#A7A1F5`). Never use `outline-none` without a replacement.
- **Keyboard:**
  - Everything is reachable in a logical order, with a "Skip to content" link first.
  - Tabs and links use `aria-current`, and the trail uses `aria-current="step"`.
  - Menus and listboxes follow the ARIA Authoring Practices: arrow keys, Enter, Escape, type-ahead.
  - Dialogs trap focus and return it to their trigger on close.
  - Pipeline rows are single links; the row's secondary actions come after it in the tab order.
- **Target size:** 24px minimum (WCAG 2.5.8), 40px by default and 44px on touch screens.
- **Reduced motion:** see [Motion](#10-motion). Nothing in the product depends on animation to make sense.
- **Readable density:** 16px body, 13px floor, 50 to 75 character lines, no more than seven items in a group before it splits or collapses, and one primary action per screen.
- **Zoom and reflow:** usable at 200% zoom and at 320px wide without horizontal scrolling, except inside the Pipeline table view.
- **Forms:** visible labels, errors linked with `aria-describedby`, required fields marked in text ("Required"), not just with an asterisk.
- **Charts:** each chart has a one-sentence summary above it and a "Show as table" toggle. Series are told apart by label, not color alone.
- **Live updates:** toasts and "Saved" notes use `role="status"`; errors that block the user use `role="alert"`.

## 13. How this fits the current code

### The stack today

| Piece | Today | With Trailhead |
|---|---|---|
| Framework | Next.js 16 App Router, client pages wrapped in `<AppShell>` | Unchanged |
| Styling | Tailwind v4, CSS-first tokens in `app/globals.css` (`@theme`), `.dark` class variant | Same mechanism, new tokens (below) |
| Theme switch | `lib/theme-context.tsx` toggles `.dark` on `<html>` | Unchanged; tokens switch through CSS variables |
| Fonts | `next/font/google`: Figtree, Nunito, Geist Mono in `app/layout.tsx` | Add Fraunces; remove Nunito when migration ends |
| Icons | Tabler webfont subset by `scripts/build-icons.mjs` | Unchanged; fewer icons means a smaller font automatically |
| Charts | Recharts on `/analytics` | Colors read from the tokens; one chart color story |
| Shared pieces | `components/` (AppShell, Sidebar, SectionTabs, Toast, Toggle, AddJobModal, EditableField) and utilities `surface`, `page-title`, `section-label`, `glow-gradient`, `sun-orb`, `app-backdrop`, `sunrise` | New primitives in `components/ui/`; the old utilities are deleted at the end |
| Stage styles | `STAGE_META[stage].badge` holds Tailwind classes (`bg-blue-50 text-blue-700`) in `types/job.ts` | `STAGE_META[stage].tone` holds a token name (`"sky"`) and `group` (`"applied"`) |

### Tokens in Tailwind v4

Semantic tokens are plain CSS variables that change under `.dark`, and are exposed to Tailwind through `@theme inline`. Then `text-ink`, `bg-sheet` and `border-control` work in both modes **without `dark:` variants**, which removes most of the roughly 750 `dark:` variants in the code over time.

```css
/* app/globals.css */
:root {
  --canvas: #F6F0E6; --sheet: #FFFBF5; --well: #EFE7DA;
  --ink: #2B2645; --ink-soft: #57516B; --ink-muted: #67616F;
  --rule: #E4DACB; --control: #8C8173;
  --action: #5F57D2; --action-hover: #4D45B5; --action-wash: #ECEAFB;
  --sun: #E8772E; --sun-ink: #A24A15; --sun-wash: #FCE3CF;
  --sky: #3A6696; --sky-wash: #E3ECF6;
  --moss: #3F7350; --moss-wash: #E2EEE3;
  --stone: #6F655E; --stone-wash: #ECE6DE;
  --caution: #8A5A0A; --caution-wash: #F8EBCF;
  --danger: #A63A2E; --danger-wash: #F7E1DD;
}
.dark {
  --canvas: #16132A; --sheet: #221F38; --well: #1C1932;
  --ink: #F3EEE6; --ink-soft: #C9C2D6; --ink-muted: #A39CB4;
  --rule: #37324F; --control: #7A7394;
  --action: #A7A1F5; --action-hover: #C3BEFA; --action-wash: rgb(167 161 245 / 0.16);
  --sun: #F59A52; --sun-ink: #F59A52; --sun-wash: rgb(245 154 82 / 0.16);
  --sky: #8DB6E6; --sky-wash: rgb(141 182 230 / 0.16);
  --moss: #7FBF8E; --moss-wash: rgb(127 191 142 / 0.16);
  --stone: #B3A9A0; --stone-wash: rgb(179 169 160 / 0.16);
  --caution: #E8B45A; --caution-wash: rgb(232 180 90 / 0.16);
  --danger: #F08A7E; --danger-wash: rgb(240 138 126 / 0.16);
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-sheet: var(--sheet);
  --color-well: var(--well);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-muted: var(--ink-muted);
  --color-rule: var(--rule);
  --color-control: var(--control);
  --color-action: var(--action);
  --color-action-hover: var(--action-hover);
  --color-action-wash: var(--action-wash);
  --color-sun: var(--sun);
  --color-sun-ink: var(--sun-ink);
  --color-sun-wash: var(--sun-wash);
  /* …sky, moss, stone, caution, danger and their washes the same way */

  --font-serif: var(--font-fraunces);
  --font-sans: var(--font-figtree);
  --font-mono: var(--font-geist-mono);
}

@theme {
  --text-display: 2.5rem;   --text-display--line-height: 1.1;
  --text-title: 1.875rem;   --text-title--line-height: 1.2;
  --text-heading: 1.375rem; --text-heading--line-height: 1.3;
  --text-reading: 1.0625rem; --text-reading--line-height: 1.65;
  --text-label: 0.8125rem;  --text-label--line-height: 1.4;
  --text-meta: 0.8125rem;   --text-meta--line-height: 1.4;

  --radius-mark: 4px;
  --radius-stamp: 8px;
  --radius-field: 12px;
  --radius-sheet: 20px;
  --radius-dialog: 24px;

  --shadow-sheet: 0 1px 0 rgb(43 38 69 / 0.04), 0 12px 32px -20px rgb(43 38 69 / 0.25);
  --shadow-overlay: 0 24px 48px -16px rgb(22 19 42 / 0.35);

  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

This gives utilities such as `bg-canvas`, `text-ink-soft`, `border-control`, `text-title`, `font-serif`, `rounded-sheet`, `shadow-sheet` and `ease-out`. The new names don't collide with the current `gray-*` and `primary-*` scales, so both systems can live side by side while screens move over.

### Fonts

```ts
// app/layout.tsx
import { Fraunces } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  style: ["normal", "italic"],
});
```

Add `font-variation-settings: "SOFT" 100` to `.font-serif`. Nunito is removed from `layout.tsx` once no page uses `font-display`.

### Shared components to build

Each one is small and replaces repeated class strings in the pages.

| Component | Replaces |
|---|---|
| `ui/PageFrame` (`width="read" \| "wide"`, header slot) | The five different `max-w-*` wrappers and hand-built headers |
| `ui/Button` (`primary`, `secondary`, `quiet`, `danger`, `icon`) | The pill class strings repeated across pages |
| `ui/Field`, `ui/TextArea` | Hand-styled inputs |
| `ui/Select`, `ui/Menu` | Native `<select>`, the stage dropdown, and the trash icon in the job header |
| `ui/Sheet` | `surface` |
| `ui/Dialog` | The `AddJobModal` shell and other modals |
| `ui/StageIndicator` | `STAGE_META[...].badge` chips |
| `ui/Trail` | The step rail on the job page and `SearchTrail` on Today |
| `ui/Monogram` | Building icons on Companies and job rows |
| `ui/EmptyState`, `ui/Milestone` | Ad hoc empty blocks and glow medallions |
| `SectionTabs`, `Sidebar` (restyled) | Pill track tabs, tagline rail |
| `Toast` (restyled) | Already the right behaviour; new tokens only |

### Migration order

Each step is its own PR and leaves the app working.

1. **Foundations.** Add the tokens, Fraunces and the `components/ui` primitives. No screen changes yet.
2. **Frame.** Move `AppShell`, `Sidebar` and `SectionTabs` to the new frame and `PageFrame`, and switch the page background to `canvas`. Every page gets the new frame, header and widths at once.
3. **Today and the job page,** including the trail, the sheet and the letter as paper.
4. **Pipeline and Companies:** the trail map, rows, monograms and the table view.
5. **Me, Settings, Progress, Weekly review,** including chart colors.
6. **Moments:** illustrations, empty states and milestones.
7. **Landing page.**
8. **Clean-up.** Delete `surface`, `glow-gradient`, `sun-orb`, `app-backdrop`, `sunrise`, the lavender `gray-*` overrides, the `primary-*` scale and Nunito. Update the theme paragraph in `CLAUDE.md` to point here.

### Guarding against drift

After step 8, a small check in `npm run lint` (a script like `scripts/build-icons.mjs`) fails the build on any of the following in `app/` or `components/`:

- `backdrop-blur`, `bg-gradient-`, `radial-gradient`
- `text-xs`, `text-[10px]`, `text-[11px]`
- `text-gray-400` (or any `gray-*` text class)
- stock hue classes (`blue-`, `violet-`, `purple-`, `pink-`, `orange-`)
- `uppercase`, `tracking-widest`
- `shadow-lg`, `shadow-xl`, `shadow-md`

## 14. Anti-patterns

| Don't | Why | Do instead |
|---|---|---|
| Wrap a section in a card to make it look finished | Containers everywhere flatten hierarchy and add edges to scan | A `label` or `heading`, then content, with 48px between sections |
| Put a sheet inside a sheet, or a bordered box inside a sheet | Nested containers are the clearest generic-dashboard tell | Rows, fields and at most one inline message inside a sheet |
| Use glass (`backdrop-blur`) or translucent white panels | Startup template look, and low contrast | Solid `sheet` on `canvas` |
| Add gradient blobs, orbs or mesh backgrounds | Decoration with no meaning | Flat `canvas`; the sun is a flat disc that marks position |
| Use three equal cards to explain features | The most recognisable template layout | One trail, one story, or a single list |
| Put an icon in a tinted tile in front of every item | Icon overload; the icons stop meaning anything | Text first; an icon only where it carries meaning |
| Show taglines under navigation items | Doubles the reading in the nav and describes the product to itself | Names only, plus the sun dot for "you are here" |
| Add a shadow or border to make something "pop" | Arbitrary depth makes everything compete | One `shadow-sheet` per screen; space and type for everything else |
| Use `sun` on routine buttons or as decoration | It stops meaning "you are here" and "progress" | `action` for actions, `ink` for everything else |
| Show a rejection in red | Red means error; a rejection is a normal outcome | `stone` and "Not this time" |
| Show a bold zero ("**0** letters written") | Reads as a failure grade | Hide zeros; show what happened |
| Show percentages from one or two data points | False precision; feels like a performance review | A sentence, and percentages only once there's enough data |
| Use uppercase, letter-spaced eyebrows ("YOUR NEXT STEP") | Template signature | A sentence-case `label`, or nothing |
| Celebrate routine actions with confetti or exclamation marks | Cheese, and it wears out within a week | A quiet "Saved" note; milestones only, once each |
| Animate on page load, loop, bounce or shimmer | Noise for focus-sensitive users | Motion only to explain a change or reward a step |
| Add a new color, radius, shadow or text size for one screen | Drift; the system stops being a system | Use a token, or add one to this document first |
| Put body text in Fraunces, or headings in Figtree 700 | Muddles the two voices | Serif names things; sans does the work |
| Use 12px or `ink-muted` for anything people need to read | Fails contrast and readability | 13px floor; `ink-soft` for secondary text |
