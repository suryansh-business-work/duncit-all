#!/usr/bin/env node
/**
 * WCAG 2.2 AA contrast gate for the design tokens.
 *
 *   node scripts/verify-contrast.mjs
 *
 * Reads the two token sources every surface is painted from and checks each
 * text/fill pair a surface actually renders, in light and dark mode:
 *
 * - `packages/auth-tokens/tokens.json` — mWeb's MUI theme and the native
 *   Tamagui theme. Parsed as JSON.
 * - `packages/theme/src/tokens.ts` — the 17 portals' `@duncit/theme`. A plain
 *   node script cannot import TypeScript, so the hexes are read out of the
 *   source text: each group is located by its indentation (`  semantic: {` is
 *   top level, `    semantic: {` is nested under `dark`), brace-matched, and its
 *   `key: '#rrggbb'` pairs collected. Nothing is copied into this file — a token
 *   edit is checked on the next run.
 *
 * Thresholds: 4.5:1 for text (1.4.3), 3:1 for a field outline or focus
 * indicator against what surrounds it (1.4.11). Decorative values (`brand`,
 * hairline `border`) are listed but not gated. The mode-less auth-tokens
 * `semantic` group is gated as text on a white card and a 3:1 icon in both modes,
 * because no single colour can be 4.5:1 text on a light and a dark page. A portal's own accent is not a
 * token — `buildThemeCtx` derives an AA-safe one at runtime and its unit tests
 * cover that; only `defaultAccent` is checked here.
 *
 * The luminance formula is the same one `packages/theme/src/contrast.ts` runs.
 * Prints a table and exits 1 when any gated pair is under its threshold.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT = 4.5;
const UI = 3;

// ---------------------------------------------------------------- colour maths

function channels(hex) {
  const body = hex.slice(1);
  return [0, 2, 4].map((at) => Number.parseInt(body.slice(at, at + 2), 16));
}

function linear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---------------------------------------------------------------- token sources

const authTokens = JSON.parse(readFileSync(join(ROOT, 'packages/auth-tokens/tokens.json'), 'utf8'));
const themeSource = readFileSync(join(ROOT, 'packages/theme/src/tokens.ts'), 'utf8');

/** The source text of the `<indent><name>: { … }` group, braces matched. */
function block(source, name, indent) {
  const header = `\n${indent}${name}: {`;
  const start = source.indexOf(header);
  if (start === -1) {
    throw new Error(`packages/theme/src/tokens.ts: group "${name}" not found`);
  }
  let depth = 0;
  for (let i = start + header.length - 1; i < source.length; i += 1) {
    if (source[i] === '{') {
      depth += 1;
    } else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`packages/theme/src/tokens.ts: group "${name}" is not closed`);
}

/** Every `key: '#rrggbb'` pair in a block of source text. */
function hexes(body) {
  return Object.fromEntries(
    [...body.matchAll(/(\w+): '(#[\da-f]{6})'/gi)].map(([, key, hex]) => [key, hex.toLowerCase()])
  );
}

const darkBlock = block(themeSource, 'dark', '  ');
const portal = {
  neutral: hexes(block(themeSource, 'neutral', '  ')),
  semantic: hexes(block(themeSource, 'semantic', '  ')),
  surface: hexes(block(themeSource, 'surface', '  ')),
  dark: hexes(darkBlock),
  darkSemantic: hexes(block(darkBlock, 'semantic', '    ')),
  defaultAccent: hexes(block(themeSource, 'defaultAccent', '  ')),
  white: hexes(block(themeSource, 'common', '  ')).white,
};

// ---------------------------------------------------------------- the pairs

const rows = [];

/** Gate `fg` against every ground at `min`. */
function check(surface, label, fg, grounds, min) {
  for (const [groundName, ground] of Object.entries(grounds)) {
    const value = ratio(fg, ground);
    rows.push({ surface, pair: `${label} on ${groundName}`, fg, bg: ground, value, min, ok: value >= min });
  }
}

/** A state fill must be darker than the one it steps from. */
function darker(surface, label, step, rest) {
  const ok = luminance(step) < luminance(rest);
  rows.push({ surface, pair: `${label} darker than rest`, fg: step, bg: rest, value: null, min: null, ok });
}

const STATUS = ['success', 'warning', 'error', 'info'];

for (const mode of ['light', 'dark']) {
  const m = authTokens[mode];
  const surface = `mWeb + native (${mode})`;
  const grounds = { bg: m.bg, surface: m.surface, soft: m.soft };

  check(surface, 'ink', m.ink, grounds, TEXT);
  check(surface, 'muted', m.muted, grounds, TEXT);
  check(surface, 'accent (red text, focus ring)', m.accent, grounds, TEXT);
  for (const status of STATUS) {
    check(surface, `${status} text`, m[status], grounds, TEXT);
    check(surface, 'onSemantic', m.onSemantic, { [status]: m[status] }, TEXT);
  }
  check(surface, 'onPrimary', m.onPrimary, {
    primary: m.primary,
    primaryHover: m.primaryHover,
    primaryActive: m.primaryActive,
  }, TEXT);
  check(surface, 'onAccent', m.onAccent, { accent: m.accent }, TEXT);
  check(surface, 'inputBorder', m.inputBorder, grounds, UI);
  check(surface, 'primary (button ring, focused field)', m.primary, grounds, UI);
  darker(surface, 'primaryHover', m.primaryHover, m.primary);
  darker(surface, 'primaryActive', m.primaryActive, m.primaryHover);
}

// The mode-less `semantic` group renders in either mode without knowing which:
// text on a white card, a fill under white, and a 3:1 icon on every ground.
for (const status of STATUS) {
  const surface = 'mode-less semantic';
  const hex = authTokens.semantic[status];
  const { light, dark } = authTokens;
  check(surface, `${status} text`, hex, { 'light surface': light.surface }, TEXT);
  check(surface, 'white', light.onPrimary, { [status]: hex }, TEXT);
  check(surface, `${status} icon`, hex, {
    'light bg': light.bg,
    'light soft': light.soft,
    'dark bg': dark.bg,
    'dark surface': dark.surface,
    'dark soft': dark.soft,
  }, UI);
}

function checkPortalLight() {
  const surface = 'portals (light)';
  const grounds = { paper: portal.surface.paper, bg: portal.surface.bg, soft: portal.surface.soft };
  check(surface, 'ink', portal.neutral['900'], grounds, TEXT);
  check(surface, 'muted', portal.surface.muted, grounds, TEXT);
  for (const status of [...STATUS, 'secondary']) {
    check(surface, `${status} text`, portal.semantic[status], grounds, TEXT);
    check(surface, 'white', portal.white, { [status]: portal.semantic[status] }, TEXT);
  }
  check(surface, 'inputBorder', portal.surface.inputBorder, grounds, UI);
  check(surface, 'white', portal.white, {
    'defaultAccent.main': portal.defaultAccent.main,
    'defaultAccent.hover': portal.defaultAccent.hover,
    'defaultAccent.active': portal.defaultAccent.active,
  }, TEXT);
  darker(surface, 'defaultAccent.hover', portal.defaultAccent.hover, portal.defaultAccent.main);
  darker(surface, 'defaultAccent.active', portal.defaultAccent.active, portal.defaultAccent.hover);
}

function checkPortalDark() {
  const surface = 'portals (dark)';
  const grounds = { bg: portal.dark.bg, surface: portal.dark.surface, soft: portal.dark.soft, raised: portal.dark.raised };
  check(surface, 'ink', portal.dark.ink, grounds, TEXT);
  check(surface, 'muted', portal.dark.muted, grounds, TEXT);
  for (const status of [...STATUS, 'secondary']) {
    check(surface, `${status} text`, portal.darkSemantic[status], grounds, TEXT);
    check(surface, 'neutral900', portal.neutral['900'], { [status]: portal.darkSemantic[status] }, TEXT);
  }
  check(surface, 'inputBorder', portal.dark.inputBorder, grounds, UI);
}

checkPortalLight();
checkPortalDark();

// ---------------------------------------------------------------- report

const fmt = (value) => (value === null ? '-' : value.toFixed(2));
const header = ['', 'surface', 'pair', 'fg', 'bg', 'ratio', 'min'];
const table = rows.map((row) => [
  row.ok ? 'ok  ' : 'FAIL',
  row.surface,
  row.pair,
  row.fg,
  row.bg,
  fmt(row.value),
  fmt(row.min),
]);
const widths = header.map((_, col) => Math.max(header[col].length, ...table.map((cells) => cells[col].length)));
const line = (cells) => cells.map((cell, col) => cell.padEnd(widths[col])).join('  ');

console.log(line(header));
console.log(widths.map((width) => '-'.repeat(width)).join('  '));
for (const cells of table) {
  console.log(line(cells));
}

const decorative = [
  `auth-tokens light.brand ${authTokens.light.brand} / dark.brand ${authTokens.dark.brand}`,
  `auth-tokens light.border ${authTokens.light.border} / dark.border ${authTokens.dark.border}`,
  `theme surface.border ${portal.surface.border}`,
];
console.log(`\nDecorative, not gated: ${decorative.join('; ')}`);

const failures = rows.filter((row) => !row.ok);
if (failures.length > 0) {
  console.error(`\nverify-contrast: ${failures.length} of ${rows.length} pairs are under WCAG 2.2 AA.`);
  process.exitCode = 1;
} else {
  console.log(`\nverify-contrast: all ${rows.length} pairs meet WCAG 2.2 AA.`);
}
