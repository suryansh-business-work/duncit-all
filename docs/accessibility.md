# Accessibility

Duncit targets **WCAG 2.2 Level AA** on every surface a person uses: mWeb
(`app/mweb`, MUI), the native app (`app/mobile-app`, React Native + Tamagui,
which also ships as Native Web), every portal (`portals/*`) and the shared web
packages (`packages/*`) they render.

AA means all Level A and Level AA success criteria of WCAG 2.2, including the
2.2 additions that matter most here: 2.4.11 Focus Not Obscured, 2.5.7 Dragging
Movements, 2.5.8 Target Size (Minimum) and 3.3.8 Accessible Authentication.

Two automated checks back this up. Neither replaces testing with a keyboard,
VoiceOver / TalkBack and a zoomed browser — they catch the mechanical part.

| Check | What it covers | Blocks CI? |
| --- | --- | --- |
| `node scripts/verify-contrast.mjs` | Theme colour tokens clear their contrast ratios | **Yes** — Shared gates › Contrast tokens |
| `pnpm lint:a11y` (web) | `eslint-plugin-jsx-a11y` over mWeb, portals, packages | No — warnings, report only |
| `npm run lint:a11y` (native) | `eslint-plugin-react-native-a11y` over `app/mobile-app/src` | No — warnings, report only |

---

## Colour token decisions

| Token | Hex | Use | Ratio on white |
| --- | --- | --- | --- |
| Primary (`palette.primary.main`, native `$primary`) | `#D92D2D` | Text, filled buttons with white labels, links, focus rings, any fill that carries meaning | 4.81 : 1 — passes 1.4.3 for normal text |
| Brand red | `#F82C2E` | Decoration only: illustrations, logo, large display accents that carry no information | 3.90 : 1 — **fails** 1.4.3 for normal text |

Rules that follow from this:

- Never put `#F82C2E` behind or in front of body-size text, and never use it as
  the only indicator of a state. Where a red carries meaning, it is `#D92D2D`.
- Never hardcode a colour in `sx` / styles for real content. Use the theme
  tokens (`text.primary`, `text.secondary`, `$color`, `$muted`) — they are what
  `verify-contrast.mjs` checks. `text.disabled`, `grey.400`, `#9ca3af` and text
  opacity below 0.7 are for genuinely disabled UI, not for content.
- Ratios depend on the surface. A red that passes on white can fail on a dark
  surface (`#D92D2D` on `#121212` is 3.89 : 1), so dark-theme tokens are checked
  against dark surfaces, not assumed from the light ones.
- 1.4.11: borders of inputs, focus indicators and meaningful icons need 3 : 1
  against what is next to them.

---

## Web checklist (mWeb, portals, web packages — MUI)

- **1.1.1** Every `<img>` / `Avatar` / `CardMedia` has `alt` (`alt=""` when
  decorative). Icon-only `IconButton` / `DuncitIconButton` / `DuncitRoundButton`
  / `Fab` has an accessible name. A `Tooltip` with a string title *is* the
  child's accessible name — make the title specific instead of adding
  `aria-label`.
- **1.3.1** Inputs have a real label (a placeholder is not one). Radio and
  checkbox groups have a `FormLabel` + `aria-labelledby`. Page and section
  titles are real headings in order, one `h1` per page. Layouts have
  header / nav / main / footer landmarks.
- **1.3.5** Personal inputs carry `autoComplete` (`name`, `email`, `tel`,
  `username`, `current-password`, `new-password`, `one-time-code`, …).
- **1.4.1** Status is never colour alone — chips and dots carry text or a name.
- **1.4.4 / 1.4.10** No `maximum-scale` / `user-scalable=no`; no fixed heights
  that clip text at 200 % zoom.
- **2.1.1** Anything clickable is a button or link (`ButtonBase`,
  `CardActionArea`, `ListItemButton`, `Link`). If it must stay a `Box`, give it
  `role="button"`, `tabIndex={0}` and an Enter / Space `onKeyDown`. No positive
  `tabIndex`, no keyboard traps.
- **2.4.1** Every app shell has a skip link to `<main id="main-content" tabIndex={-1}>`.
- **2.4.3** Dialogs and drawers are `aria-labelledby` their title; focus returns
  to the trigger on close.
- **2.4.4 / 2.4.6** Repeated row actions name the row ("Delete {name}").
- **2.4.7 / 2.4.11** Never remove an outline without a `:focus-visible`
  replacement; a focused element is never hidden under a sticky header.
- **2.5.3 / 2.5.8** An `aria-label` starts with the visible text; targets are at
  least 24 × 24 CSS px.
- **3.1.1** `<html lang>` follows the active locale.
- **3.3.1–3.3.3** Errors in text, `aria-invalid` on invalid fields, `required`
  marked, helper text linked (MUI does this when `error` / `helperText` are passed).
- **4.1.2** Custom toggles expose `aria-pressed` / `aria-checked`; disclosures
  `aria-expanded` + `aria-controls`; the active nav item `aria-current="page"`.
  Tab strips are `DuncitTabs`, never raw MUI `Tabs`.
- **4.1.3** Async results, toasts and inline success use `role="status"`;
  errors `role="alert"`; loading regions `aria-busy`.

Every new accessible name, hint or live-region text is a localization key
(CLAUDE.md rule 38) — never a literal.

## Native checklist (React Native + Tamagui)

- Every pressable has `accessibilityRole`, an `accessibilityLabel` when it has
  no text or ambiguous text, and `accessibilityState` (`disabled`, `selected`,
  `checked`, `expanded`, `busy`) that matches reality. `accessibilityHint` only
  where the result is not obvious.
- Screen titles and section headers: `accessibilityRole="header"`.
- Meaningful images get a label; decorative ones `accessible={false}` /
  `importantForAccessibility="no"`. Icons inside a labelled control are hidden
  from the tree so they are not read twice.
- A card or row that is one tap target is ONE accessible element with one
  combined label.
- Touch targets are at least 44 × 44 pt — use `hitSlop` rather than resizing.
- Never `allowFontScaling={false}` on content; use `maxFontSizeMultiplier` (≥ 1.5)
  if a layout truly breaks.
- Inputs: the label equals the visible label; error text is announced
  (`accessibilityLiveRegion="polite"` and/or `AccessibilityInfo.announceForAccessibility`).
- Modals and sheets: `accessibilityViewIsModal`, and `onAccessibilityEscape`
  closes them when closable.
- Toggles: `accessibilityRole="switch"` + `checked`. Tabs: `tab` + `selected`.
  Loaders: `progressbar` + a label.
- Tamagui's web build drops some RN-only props — pair them with the web
  equivalents, as `FormTextField` does.
- mWeb and native are twins (rule 27): a fix on one screen lands on its twin
  with the same keys and the same test ids.

---

## Running the checks

```bash
# Web — mWeb, portals, packages (from the repo root)
pnpm lint:a11y

# Only one surface, e.g. while fixing it
pnpm exec eslint -c eslint.a11y.config.mjs --no-warn-ignored portals/finance

# Native (from app/mobile-app)
npm run lint:a11y

# Contrast tokens (from the repo root) — blocking in CI
node scripts/verify-contrast.mjs
```

### How the web lint is set up

- Config: `eslint.a11y.config.mjs` (ESLint 9 flat config). It runs **only**
  jsx-a11y: the `strict` preset, plus `anchor-ambiguous-text`,
  `control-has-associated-label`, `no-aria-hidden-on-focusable` and `lang`, all
  at `warn`. Tests (`__tests__`, `*.cy.*`, `*.test.*`) and
  `portals/crm/open-wa-server/**` are ignored.
- Parser: `@babel/eslint-parser` with the `typescript` + `jsx` syntax plugins.
  `@typescript-eslint/parser` cannot run at the root, because it needs the
  classic TypeScript JS API and the root ships TypeScript 7.
- ESLint is held at **9**: `eslint-plugin-jsx-a11y` 6.10 does not declare
  support for ESLint 10. Do not take the major in a dependency sweep.
- jsx-a11y only judges DOM elements, so `settings['jsx-a11y'].components` maps
  the MUI / Duncit components onto the element they render (`DuncitIconButton`
  → `button`, `Box` → `div`, `Link` → `a`, …) and `component="img"` is read as
  the element it names. A component not in that map is invisible to the lint.
- Inline `// eslint-disable-next-line react-hooks/…` / `@typescript-eslint/…`
  directives resolve to inert rules, so they do not error; `jsx-a11y/*`
  directives work normally.

### How the native lint is set up

- Config: `app/mobile-app/.eslintrc.a11y.js`, run with `--no-eslintrc`, so it is
  independent of `.eslintrc.js` and its zero-warning `npm run lint` gate.
- Rules: `eslint-plugin-react-native-a11y`'s `all` preset, every rule at `warn`.
- The plugin recognises React Native's own touchables (`Pressable`,
  `Touchable*`). A Tamagui `XStack` / `YStack` with `onPress` is not a touchable
  to it — those are covered by review against the checklist above.

### In CI

- **Shared gates › Contrast tokens** — blocking.
- **Shared gates › Shared packages › Accessibility lint (report only)** —
  `continue-on-error`, writes a per-rule and per-surface table to the run
  summary page.
- **Apps CI › Mobile App › Accessibility lint (report only)** —
  `continue-on-error`, findings in the job log.

---

## Baseline (2026-09-14)

Web — 177 warnings across 2,887 files:

| Rule | Count |
| --- | ---: |
| `no-autofocus` | 56 |
| `click-events-have-key-events` | 42 |
| `no-static-element-interactions` | 40 |
| `media-has-caption` | 15 |
| `control-has-associated-label` | 6 |
| `interactive-supports-focus` | 5 |
| `anchor-has-content` | 3 |
| `no-noninteractive-element-to-interactive-role` | 3 |
| `heading-has-content` | 3 |
| `no-noninteractive-tabindex` | 1 |
| `no-noninteractive-element-interactions` | 1 |
| `no-aria-hidden-on-focusable` | 1 |
| `alt-text` | 1 |

By surface: `app/mweb` 93, `packages/shell` 27, `portals/crm` 15,
`portals/tech` 13, `portals/legal` 5, `portals/support` 4, and 1–2 in each of
fifteen other portals and packages.

Native — 32 warnings across 1,344 files: `has-accessibility-hint` 21,
`has-valid-accessibility-descriptors` 8,
`has-valid-accessibility-ignores-invert-colors` 3.

## Plan: warnings to errors

The lint reports today so the backlog is visible without turning CI red. Each
surface flips on its own, as soon as it is clean, rather than the whole repo
waiting on the slowest one:

1. **Fix a surface to zero** — the per-surface table on the Shared gates run
   summary says which ones are closest. Intentional exceptions (for example
   `autoFocus` on the only field of a dialog that just opened) get a
   `// eslint-disable-next-line jsx-a11y/no-autofocus -- reason` rather than a
   rule change.
2. **Flip it** — add a config block to `eslint.a11y.config.mjs` whose `files`
   cover only that surface and sets its rules to `error`, and add a blocking
   step (no `continue-on-error`) that lints only that path with
   `--max-warnings 0`. A surface that is flipped can never regress while the
   others are still reporting.
3. **Native** — before flipping, turn off `has-accessibility-hint`: it asks for
   a hint on every labelled element, which contradicts the checklist above
   (hints only where the result is not obvious). Then set the rest to `error`
   and add `--max-warnings 0` to `npm run lint:a11y` in the Mobile App job.
4. **Finish** — once every surface is flipped, drop `continue-on-error` from
   both report steps and fold the per-surface blocks into one.
