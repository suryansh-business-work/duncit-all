/**
 * A11Y status report — the body of the sticky PR comment posted by
 * .github/workflows/a11y-report.yml, and the run summary on a push.
 *
 *   node scripts/a11y-report.mjs \
 *     --web=<eslint json> --native=<eslint json> \
 *     --contrast=<verify-contrast stdout> --contrast-exit=<exit code> \
 *     --out=<markdown file>
 *
 * Reads what the three checks already produced; runs nothing itself. Node
 * built-ins only. Always exits 0 — the contrast gate in shared-gates.yml and the
 * workflow's own "Enforce" step are what fail a run (docs/accessibility.md).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, sep } from 'node:path';

const MARKER = '<!-- duncit-a11y-status -->';
const TOP = 10;

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

/** Which WCAG 2.2 success criterion each lint rule stands for. */
const WCAG = new Map([
  ['jsx-a11y/alt-text', '1.1.1 Non-text Content'],
  ['jsx-a11y/media-has-caption', '1.2.2 Captions'],
  ['jsx-a11y/heading-has-content', '1.3.1 Info and Relationships'],
  ['jsx-a11y/label-has-associated-control', '1.3.1 Info and Relationships'],
  ['jsx-a11y/autocomplete-valid', '1.3.5 Identify Input Purpose'],
  ['jsx-a11y/click-events-have-key-events', '2.1.1 Keyboard'],
  ['jsx-a11y/no-static-element-interactions', '2.1.1 Keyboard'],
  ['jsx-a11y/no-noninteractive-element-interactions', '2.1.1 Keyboard'],
  ['jsx-a11y/interactive-supports-focus', '2.1.1 Keyboard'],
  ['jsx-a11y/no-autofocus', '2.4.3 Focus Order'],
  ['jsx-a11y/no-noninteractive-tabindex', '2.4.3 Focus Order'],
  ['jsx-a11y/tabindex-no-positive', '2.4.3 Focus Order'],
  ['jsx-a11y/anchor-has-content', '2.4.4 Link Purpose'],
  ['jsx-a11y/anchor-ambiguous-text', '2.4.4 Link Purpose'],
  ['jsx-a11y/anchor-is-valid', '2.4.4 Link Purpose'],
  ['jsx-a11y/lang', '3.1.1 Language of Page'],
  ['jsx-a11y/control-has-associated-label', '4.1.2 Name, Role, Value'],
  ['jsx-a11y/no-aria-hidden-on-focusable', '4.1.2 Name, Role, Value'],
  ['jsx-a11y/no-noninteractive-element-to-interactive-role', '4.1.2 Name, Role, Value'],
  ['jsx-a11y/role-has-required-aria-props', '4.1.2 Name, Role, Value'],
  ['jsx-a11y/aria-role', '4.1.2 Name, Role, Value'],
  ['react-native-a11y/has-accessibility-hint', '3.3.2 Labels or Instructions'],
  ['react-native-a11y/has-valid-accessibility-descriptors', '4.1.2 Name, Role, Value'],
  ['react-native-a11y/has-valid-accessibility-role', '4.1.2 Name, Role, Value'],
  ['react-native-a11y/has-valid-accessibility-state', '4.1.2 Name, Role, Value'],
  ['react-native-a11y/has-valid-accessibility-ignores-invert-colors', '1.4.3 Contrast'],
  ['react-native-a11y/no-nested-touchables', '2.1.1 Keyboard'],
]);

/** Loads an ESLint JSON report; `null` when the lint did not produce one. */
function readLint(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** The workspace a file belongs to: app/mweb, portals/tech, packages/table, app/mobile-app/screens. */
function surfaceOf(filePath) {
  const parts = relative(process.cwd(), filePath).split(sep);
  if (parts[0] === 'app' && parts[1] === 'mobile-app' && parts[2] === 'src') return `app/mobile-app/${parts[3]}`;
  return parts.slice(0, 2).join('/');
}

const increment = (counts, key) => counts.set(key, (counts.get(key) ?? 0) + 1);
const sorted = (counts) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

function summariseLint(results) {
  const byRule = new Map();
  const bySurface = new Map();
  let findings = 0;
  let errors = 0;
  for (const file of results) {
    for (const message of file.messages) {
      findings += 1;
      if (message.severity === 2) errors += 1;
      increment(byRule, message.ruleId ?? '(parse error)');
      increment(bySurface, surfaceOf(file.filePath));
    }
  }
  return { files: results.length, findings, errors, byRule: sorted(byRule), bySurface: sorted(bySurface) };
}

/** Parses the verify-contrast table: `ok  ` / `FAIL` rows, then the ratio and the minimum. */
function summariseContrast(path, exitCode) {
  if (!path || !existsSync(path)) return null;
  const rows = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('ok  ') || line.startsWith('FAIL'));
  const failures = rows.filter((line) => line.startsWith('FAIL')).map((line) => line.replace(/^FAIL\s+/, '').replaceAll(/\s{2,}/g, ' · '));
  return { pairs: rows.length, failures, passed: exitCode === 0 && failures.length === 0 };
}

function lintSection(title, summary) {
  if (!summary) return [`### ${title}`, '', '> ⚠️ The lint did not produce a report on this run — see the job log.', ''];
  const lines = [`### ${title}`, ''];
  if (summary.findings === 0) {
    return [...lines, `✅ No findings across ${summary.files} files.`, ''];
  }
  lines.push(
    `${summary.findings} finding(s) across ${summary.files} files — blocking: the A11Y check fails until they are fixed.`,
    '',
    '| Rule | WCAG 2.2 | Count |',
    '| --- | --- | ---: |',
    ...summary.byRule.slice(0, TOP).map(([rule, count]) => `| \`${rule}\` | ${WCAG.get(rule) ?? '—'} | ${count} |`),
    '',
    '<details><summary>By surface</summary>',
    '',
    '| Surface | Count |',
    '| --- | ---: |',
    ...summary.bySurface.map(([surface, count]) => `| \`${surface}\` | ${count} |`),
    '',
    '</details>',
    '',
  );
  return lines;
}

function statusRow(label, ok, detail) {
  const icon = ok ? '✅' : '⚠️';
  return `| ${label} | ${icon} ${detail} |`;
}

function contrastStatus(contrast) {
  if (!contrast) return statusRow('Colour contrast (1.4.3 / 1.4.11)', false, 'did not run');
  if (contrast.passed) return statusRow('Colour contrast (1.4.3 / 1.4.11)', true, `${contrast.pairs}/${contrast.pairs} token pairs meet AA`);
  return `| Colour contrast (1.4.3 / 1.4.11) | ❌ ${contrast.failures.length} of ${contrast.pairs} token pairs under AA — blocking |`;
}

function lintStatus(label, summary) {
  if (!summary) return statusRow(label, false, 'did not run');
  const ok = summary.findings === 0;
  const detail = ok ? `clean (${summary.files} files)` : `${summary.findings} finding(s) in ${summary.files} files — blocking`;
  return statusRow(label, ok, detail);
}

const web = readLint(arg('web'));
const native = readLint(arg('native'));
const webSummary = web && summariseLint(web);
const nativeSummary = native && summariseLint(native);
const contrast = summariseContrast(arg('contrast'), Number(arg('contrast-exit') ?? 1));
const sha = (process.env.GITHUB_SHA ?? '').slice(0, 9);

const body = [
  MARKER,
  '## ♿ A11Y status — WCAG 2.2 AA',
  '',
  sha ? `Commit \`${sha}\` · native, mWeb and every portal.` : 'Native, mWeb and every portal.',
  '',
  '| Check | Result |',
  '| --- | --- |',
  contrastStatus(contrast),
  lintStatus('Web lint — mWeb, portals, packages (jsx-a11y)', webSummary),
  lintStatus('Native lint — app/mobile-app (react-native-a11y)', nativeSummary),
  '',
];

if (contrast && !contrast.passed && contrast.failures.length > 0) {
  body.push('### Contrast pairs under AA', '', ...contrast.failures.map((f) => `- ${f}`), '');
}

body.push(
  ...lintSection('Web lint', webSummary),
  ...lintSection('Native lint', nativeSummary),
  '> Lint finds structure (names, roles, keyboard handlers), not everything AA asks for. Screen-reader passes',
  '> (TalkBack / VoiceOver / NVDA) and a keyboard-only walk-through stay manual — see `docs/accessibility.md`.',
  '',
);

writeFileSync(arg('out') ?? 'a11y-report.md', `${body.join('\n')}\n`, 'utf8');
console.log(body.join('\n'));
