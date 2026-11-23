/**
 * Token usage and estimated cost of the Claude Code work behind each commit,
 * for scripts/ai-cost-report.mjs (the "AI cost" comment on a pull request).
 *
 * The numbers are MEASURED, not guessed: Claude Code writes every API call it
 * makes to a session transcript (`~/.claude/projects/<repo>/<session>.jsonl`)
 * with the model, the token counts and the editor that made it. Only the
 * dollar figure is derived, from the rate card in ai-pricing.json.
 *
 * Two traps this file exists to avoid:
 *  - one assistant message is written as SEVERAL rows (one per content block)
 *    that all carry the same message id, so rows are merged per message id —
 *    summing rows would count every message two or three times;
 *  - forked / resumed sessions copy earlier history into a new transcript, so
 *    the merge is global across files, not per file.
 *
 * Zero dependencies: it runs from a git hook or a bare shell.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARKER = 'duncit-ai-cost:v1';
const PRICING_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ai-pricing.json');
const TOKENS_PER_RATE = 1_000_000;
const MAX_SUBJECT = 72;

export function loadPricing(file = PRICING_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** The rate-card entry for a model id; the longest `match` prefix wins (opus-5-5 beats opus-5). */
export function findRates(model, pricing) {
  let best = null;
  for (const entry of pricing.models) {
    if (model.startsWith(entry.match) && (!best || entry.match.length > best.match.length)) best = entry;
  }
  return best;
}

const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/** A transcript `usage` object as the five token counts that are billed at different rates. */
export function normalizeUsage(usage) {
  const split = usage.cache_creation ?? {};
  const written5m = num(split.ephemeral_5m_input_tokens);
  const written1h = num(split.ephemeral_1h_input_tokens);
  return {
    input: num(usage.input_tokens),
    output: num(usage.output_tokens),
    cacheRead: num(usage.cache_read_input_tokens),
    // No TTL split in the row: bill every cache write as the cheaper 5-minute kind.
    cacheWrite5m: written5m + written1h > 0 ? written5m : num(usage.cache_creation_input_tokens),
    cacheWrite1h: written1h,
    fast: usage.speed === 'fast',
  };
}

const TOKEN_FIELDS = ['input', 'output', 'cacheRead', 'cacheWrite5m', 'cacheWrite1h'];

/** Streaming rows of one message only ever grow, so the per-field maximum is the final usage. */
function mergeTokens(a, b) {
  const merged = { fast: a.fast || b.fast };
  for (const field of TOKEN_FIELDS) merged[field] = Math.max(a[field], b[field]);
  return merged;
}

/**
 * Estimated USD for one message, or null when the model has no rate card
 * (the caller reports it as unpriced instead of guessing a price).
 */
export function costUsd(tokens, model, pricing) {
  const rates = findRates(model, pricing);
  if (!rates) return null;
  const promptTokens = tokens.input + tokens.cacheRead + tokens.cacheWrite5m + tokens.cacheWrite1h;
  let scale = tokens.fast ? pricing.fastMultiplier : 1;
  if (rates.longPrompt && promptTokens > rates.longPrompt.aboveTokens) scale *= rates.longPrompt.multiplier;
  const cacheRead = rates.cacheRead ?? rates.input * pricing.cacheReadMultiplier;
  const usd =
    tokens.input * rates.input +
    tokens.output * rates.output +
    tokens.cacheRead * cacheRead +
    tokens.cacheWrite5m * rates.input * pricing.cacheWriteMultiplier['5m'] +
    tokens.cacheWrite1h * rates.input * pricing.cacheWriteMultiplier['1h'];
  return (usd / TOKENS_PER_RATE) * scale;
}

/**
 * Folds one transcript's text into `into` (message id → record). Rows of a
 * message merge: earliest timestamp, per-field maximum tokens.
 */
export function collectMessages(text, into = new Map()) {
  for (const line of text.split('\n')) {
    if (!line.includes('"usage"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // the last line of a transcript a live session is still writing
    }
    const message = entry.message;
    if (entry.type !== 'assistant' || !message?.usage || !message.model || message.model.startsWith('<')) continue;
    const ts = Date.parse(entry.timestamp);
    if (Number.isNaN(ts)) continue;
    const id = message.id ?? entry.requestId ?? entry.uuid;
    const tokens = normalizeUsage(message.usage);
    const seen = into.get(id);
    if (seen) {
      seen.ts = Math.min(seen.ts, ts);
      seen.tokens = mergeTokens(seen.tokens, tokens);
    } else {
      into.set(id, { id, ts, model: message.model, editor: entry.entrypoint ?? 'unknown', version: entry.version ?? '', tokens });
    }
  }
  return into;
}

function emptyTotals() {
  return { messages: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, models: new Map(), editors: new Map(), unpriced: new Set() };
}

function addMessage(totals, record, pricing) {
  const { tokens } = record;
  totals.messages += 1;
  totals.input += tokens.input;
  totals.output += tokens.output;
  totals.cacheRead += tokens.cacheRead;
  totals.cacheWrite += tokens.cacheWrite5m + tokens.cacheWrite1h;
  const usd = costUsd(tokens, record.model, pricing);
  if (usd === null) totals.unpriced.add(record.model);
  else totals.costUsd += usd;
  totals.models.set(record.model, (totals.models.get(record.model) ?? 0) + (usd ?? 0));
  const editor = pricing.editors[record.editor] ?? record.editor;
  if (!totals.editors.has(editor)) totals.editors.set(editor, new Set());
  if (record.version) totals.editors.get(editor).add(record.version);
}

/**
 * Gives every message to the commit whose window holds it. A window is
 * (startMs, endMs]: everything after the previous commit up to and including
 * this one. Returns sha → totals for every window, empty ones included.
 */
export function attribute(records, windows, pricing) {
  const bySha = new Map(windows.map((win) => [win.sha, emptyTotals()]));
  for (const record of records) {
    const win = windows.find((w) => record.ts > w.startMs && record.ts <= w.endMs);
    if (win) addMessage(bySha.get(win.sha), record, pricing);
  }
  return bySha;
}

/**
 * Commit windows from `[{ sha, committedMs }]` in history order. A rebased or
 * cherry-picked commit can carry an earlier date than its parent; the window
 * start never moves backwards, so windows never overlap.
 */
export function buildWindows(commits, parentCommittedMs) {
  let cursor = parentCommittedMs + 999; // the parent's own window ended here
  return commits.map(({ sha, committedMs }) => {
    const endMs = Math.max(cursor, committedMs + 999);
    const win = { sha, startMs: cursor, endMs };
    cursor = endMs;
    return win;
  });
}

/** Marker comments already on the PR → the commits they covered and what they cost. */
export function parseReported(commentBodies) {
  const costBySha = new Map();
  const pattern = new RegExp(`<!-- ${MARKER} (\\{.*?\\}) -->`);
  for (const body of commentBodies) {
    const found = pattern.exec(body);
    if (!found) continue;
    try {
      for (const [sha, usd] of Object.entries(JSON.parse(found[1]).commits ?? {})) costBySha.set(sha, num(usd));
    } catch {
      continue; // a hand-edited marker: treat that comment as not covering any commit
    }
  }
  return costBySha;
}

const fmtInt = (value) => value.toLocaleString('en-US');
const fmtUsd = (value) => `$${value.toFixed(value >= 1 ? 2 : 3)}`;
const cell = (text) => text.replaceAll('|', '\\|').replaceAll('\n', ' ');

function modelsCell(totals, pricing) {
  if (totals.models.size === 0) return '—';
  return [...totals.models]
    .sort((a, b) => b[1] - a[1])
    .map(([model, usd]) => `${findRates(model, pricing)?.label ?? model} · ${fmtUsd(usd)}`)
    .join('<br>');
}

function editorsCell(totals) {
  if (totals.editors.size === 0) return '—';
  return [...totals.editors]
    .map(([editor, versions]) => (versions.size ? `${editor} (Claude Code ${[...versions].sort().join(', ')})` : editor))
    .join('<br>');
}

function costCell(totals) {
  if (totals.messages === 0) return '—';
  return totals.unpriced.size ? `${fmtUsd(totals.costUsd)} + unpriced` : fmtUsd(totals.costUsd);
}

/** Input is everything sent to the model: fresh tokens plus what was written to and read from the cache. */
function tokenCells(totals) {
  if (totals.messages === 0) return ['—', '—', '—', '—'];
  const input = totals.input + totals.cacheWrite + totals.cacheRead;
  return [input, totals.cacheRead, totals.cacheWrite, totals.output].map(fmtInt);
}

/**
 * The PR comment. `rows` are `{ sha, subject, totals }`; `priorUsd` is what
 * earlier AI-cost comments on this PR already reported.
 */
export function renderComment({ rows, priorUsd, pricing, skippedOlder = 0 }) {
  const pushUsd = rows.reduce((sum, row) => sum + row.totals.costUsd, 0);
  const marker = { commits: Object.fromEntries(rows.map((row) => [row.sha, Number(row.totals.costUsd.toFixed(6))])) };
  const unpriced = new Set(rows.flatMap((row) => [...row.totals.unpriced]));
  const lines = [
    `<!-- ${MARKER} ${JSON.stringify(marker)} -->`,
    `### AI cost: ${rows.length} commit${rows.length === 1 ? '' : 's'}, about ${fmtUsd(pushUsd)}`,
    '',
    '| Commit | LLM | Editor | Input tokens | of it cache read | of it cache write | Output tokens | Est. cost |',
    '|---|---|---|---:|---:|---:|---:|---:|',
  ];
  for (const { sha, subject, totals } of rows) {
    const title = subject.length > MAX_SUBJECT ? `${subject.slice(0, MAX_SUBJECT - 1)}…` : subject;
    lines.push(
      `| \`${sha.slice(0, 9)}\` ${cell(title)} | ${modelsCell(totals, pricing)} | ${editorsCell(totals)} | ${tokenCells(totals).join(' | ')} | ${costCell(totals)} |`,
    );
  }
  lines.push('', `**This push:** ${fmtUsd(pushUsd)} · **PR total so far:** ${fmtUsd(priorUsd + pushUsd)}`);
  if (unpriced.size) lines.push('', `No rate card for ${[...unpriced].join(', ')}; add it to scripts/lib/ai-pricing.json.`);
  if (skippedOlder) lines.push('', `${skippedOlder} older unreported commit${skippedOlder === 1 ? '' : 's'} not shown.`);
  lines.push(
    '',
    `<sub>Measured from Claude Code session transcripts: every call between the previous commit and this one, across all sessions on this machine, so concurrent sessions land in the commit they overlapped. Cost is an estimate at Anthropic list API prices (${pricing.asOf}); a subscription plan bills differently. Input tokens = everything sent to the model (fresh + cache read + cache write). A dash means no recorded AI usage in that window.</sub>`,
  );
  return lines.join('\n');
}
