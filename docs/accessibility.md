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
| `pnpm lint:a11y` (web) | `eslint-plugin-jsx-a11y` over mWeb, portals, packages | **Yes** — errors, `--max-warnings 0` (A11Y Report) |
| `npm run lint:a11y` (native) | `eslint-plugin-react-native-a11y` + the pressable-role rule over `app/mobile-app/src` | **Yes** — errors, `--max-warnings 0` (A11Y Report) |

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
- **2.5.7** Nothing is drag-only. Every drag has a single-pointer, keyboard-reachable
  alternative: the dashboard's **Arrange** menu (`@duncit/dashboard`), move up / down
  buttons on a reorderable list, an attach button beside a drop zone, minimise /
  maximise on a floating window.
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

- Every pressable has `accessibilityRole` (or `role`), an `accessibilityLabel` when it has
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
- A long-press action has a screen-reader route too: a named
  `accessibilityActions` entry on an accessible element (see `CommentRow`).
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
  at `error`. Tests (`__tests__`, `*.cy.*`, `*.test.*`) and
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
- Rules: `eslint-plugin-react-native-a11y`'s `all` preset, every rule at `error`
  except `has-accessibility-hint`, which is off: it asks for a hint on every
  labelled element, which contradicts the checklist above (hints only where the
  result is not obvious).
- The plugin recognises React Native's own touchables (`Pressable`,
  `Touchable*`) only. A raw Tamagui / RN primitive (`XStack`, `YStack`, `View`,
  `Text`, `Image`, …) with `onPress` / `onLongPress` is caught by the config's
  own `no-restricted-syntax` rule instead: it must carry `role` /
  `accessibilityRole`, or `accessible={false}` when it only blocks or forwards
  touches. Wrapper components (`DuncitButton`, `PressScale`, …) set the role
  inside, and a `{...spread}` is trusted to carry it.

### In CI

- **Shared gates › Contrast tokens** — blocking.
- **A11Y Report** (`.github/workflows/a11y-report.yml`) — **blocking**. Runs the
  contrast check, the web lint and the native lint, and `scripts/a11y-report.mjs`
  turns them into one table: status per check, findings per rule with the WCAG
  criterion it stands for, and findings per surface. On a pull request it is
  posted as ONE sticky comment (marker `<!-- duncit-a11y-status -->`, rewritten
  on every push); on a push to staging it lands on the run summary. The lint
  steps continue on error so the report always lands; the last step then fails
  the run if either lint found anything.

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

## Enforcement (2026-09-18)

Every surface reached zero (web 0 findings across 3,026 files, native 0 across
1,395, contrast 173 / 173 pairs), so both lints flipped from warnings to errors
in one step rather than surface by surface. A new finding now fails the A11Y
Report run instead of joining a backlog. An intentional exception (for example
`autoFocus` on the only field of a dialog that just opened) is an inline
`// eslint-disable-next-line jsx-a11y/no-autofocus -- reason`, never a rule change.

The same pass closed the gaps the lints could not see:

- **Native pressables without a role** — the `no-restricted-syntax` rule above,
  which surfaced the last two (a comment row and a dismissable status line).
- **2.5.7 Dragging Movements** — `@duncit/dashboard` could only be rearranged by
  dragging; every widget now has an Arrange menu.
- **4.1.3 Status Messages** — the checkout processing overlay (mWeb and native)
  announces "processing" and "confirming", and on native keeps a screen reader
  out of the form beneath it.

### Known gap

- **1.1.1 Non-text Content — the captcha** (`@duncit/captcha`, on the grievance,
  contact and newsletter forms) is a code drawn as an image with no second way
  to answer it. The WCAG CAPTCHA exception still requires an alternative in a
  different modality (audio, or a non-visual check), so a screen-reader user
  cannot submit those forms today. Open: it needs a product decision on the
  alternative.
