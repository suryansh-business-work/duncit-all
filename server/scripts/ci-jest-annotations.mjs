/**
 * Turns a captured jest log into GitHub annotations + a job summary.
 *
 * Why this exists: a failing `server` job used to report nothing but
 * "Process completed with exit code 1". The step logs need a token to read
 * (`/actions/jobs/<id>/logs` answers 403 anonymously), so the only readable
 * signal was that bare line — which says nothing about WHICH test failed, or
 * even whether a test ran at all. Annotations and the job summary are rendered
 * on the run page and served by the public check-runs API, so putting the
 * failure there is what makes the next failure diagnosable in seconds.
 *
 * Usage: node scripts/ci-jest-annotations.mjs <jest-log-file>
 */
import { appendFileSync, readFileSync } from 'node:fs';

/** GitHub workflow commands are line-oriented; these characters must be encoded. */
function encodeMessage(text) {
  return text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

/** Property values additionally reserve the separators of the command itself. */
function encodeProperty(text) {
  return encodeMessage(text).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

/**
 * The `●` blocks jest prints for each failed assertion, as
 * `{ title, body }`. `● Console` is jest's log passthrough, not a failure.
 */
function failureBlocks(lines) {
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const header = /^\s*●\s+(?!Console\b)(.+?)\s*$/.exec(line);
    if (header) {
      current = { title: header[1], body: [] };
      blocks.push(current);
    } else if (current && current.body.length < 25) {
      current.body.push(line);
    }
  }
  return blocks;
}

/**
 * The suite paths jest lists, from both the inline `FAIL unit src/x.test.ts`
 * and the summary's `FAIL src/x.test.ts`. Deduplicated, workspace-relative.
 */
function failedFiles(lines) {
  const files = new Set();
  for (const line of lines) {
    const m = /^\s*FAIL\s+(.+)$/.exec(line);
    const suite = m?.[1].trim().split(/\s+/).find((t) => t.endsWith('.ts'));
    if (suite) files.add(`server/${suite}`);
  }
  return [...files];
}

/**
 * Anchor a block to its source line via the stack frame jest prints under it —
 * `at Object.<anonymous> (src/…/x.test.ts:230:28)`. Positional pairing with the
 * FAIL list is wrong as soon as one suite reports two failures.
 */
function anchorOf(body) {
  const m = /\((src\/[^\s:()]+\.ts):(\d+):\d+\)/.exec(body);
  return m ? { file: `server/${m[1]}`, line: m[2] } : null;
}

function emit(title, body) {
  const at = anchorOf(body);
  const where = at ? `file=${encodeProperty(at.file)},line=${at.line},` : '';
  console.log(`::error ${where}title=${encodeProperty(title)}::${encodeMessage(body)}`);
}

const logPath = process.argv[2];
const raw = readFileSync(logPath, 'utf8');
const lines = raw.split('\n');

const blocks = failureBlocks(lines);
const files = failedFiles(lines);
const summaryLine = lines.find((l) => l.startsWith('Tests:')) ?? '';

// GitHub renders at most 10 error annotations per step; past that they are
// dropped silently, so cap deliberately and say how many were left out.
const shown = blocks.slice(0, 10);
for (const block of shown) {
  emit(block.title, block.body.join('\n').trim());
}

if (blocks.length === 0) {
  // No `●` block means jest never got to reporting a test — a globalSetup
  // throw, an OOM kill, a module that failed to load. The tail is the evidence.
  const tail = lines.filter((l) => l.trim()).slice(-30).join('\n');
  emit('server tests failed before any test result was reported', tail);
}

const parts = [
  '## server test failure',
  '',
  summaryLine ? `\`${summaryLine.trim()}\`` : '_jest produced no test summary._',
  '',
  ...(files.length > 0 ? ['### Failing suites', '', ...files.map((f) => `- \`${f}\``), ''] : []),
  ...(blocks.length > shown.length ? [`_${blocks.length - shown.length} further failures omitted._`, ''] : []),
  '<details><summary>Last 200 log lines</summary>',
  '',
  '```',
  lines.slice(-200).join('\n'),
  '```',
  '',
  '</details>',
];

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${parts.join('\n')}\n`);
}
