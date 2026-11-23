/**
 * Run with `node --test scripts/lib/ai-cost.test.mjs`.
 * Money maths is checked against figures worked out by hand from the rate card.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MARKER,
  attribute,
  buildWindows,
  collectMessages,
  costUsd,
  findRates,
  loadPricing,
  normalizeUsage,
  parseReported,
  renderComment,
} from './ai-cost.mjs';

const pricing = loadPricing();

const row = (over = {}) =>
  JSON.stringify({
    type: 'assistant',
    timestamp: '2026-11-23T10:00:00.000Z',
    entrypoint: 'claude-vscode',
    version: '2.1.330',
    message: {
      id: 'msg_1',
      model: 'claude-sonnet-5-5',
      usage: { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 0 },
      ...over.message,
    },
    ...over.entry,
  });

describe('findRates', () => {
  it('prefers the longest matching model id', () => {
    assert.equal(findRates('claude-opus-5-5', pricing).label, 'Claude Opus 5.5');
    assert.equal(findRates('claude-opus-5', pricing).label, 'Claude Opus 5');
  });

  it('matches a dated snapshot of a known model', () => {
    assert.equal(findRates('claude-sonnet-5-5-20261101', pricing).label, 'Claude Sonnet 5.5');
  });

  it('returns null for a model without a rate card', () => {
    assert.equal(findRates('claude-unknown-9', pricing), null);
  });
});

describe('costUsd', () => {
  it('prices every token class at its own rate (Sonnet 5.5)', () => {
    const tokens = { input: 1000, output: 500, cacheRead: 10000, cacheWrite5m: 0, cacheWrite1h: 2000, fast: false };
    // 1000*$2 + 500*$10 + 10000*$0.10 + 2000*($2*2) per 1M = 0.002 + 0.005 + 0.001 + 0.008
    assert.ok(Math.abs(costUsd(tokens, 'claude-sonnet-5-5', pricing) - 0.016) < 1e-12);
  });

  it('bills a 5-minute cache write at 1.25x input', () => {
    const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite5m: 1_000_000, cacheWrite1h: 0, fast: false };
    assert.ok(Math.abs(costUsd(tokens, 'claude-opus-5-5', pricing) - 5) < 1e-9);
  });

  it('falls back to 0.1x input when a model lists no cache-read rate', () => {
    const tokens = { input: 0, output: 0, cacheRead: 1_000_000, cacheWrite5m: 0, cacheWrite1h: 0, fast: false };
    assert.ok(Math.abs(costUsd(tokens, 'claude-opus-4-8', pricing) - 0.5) < 1e-9);
  });

  it('doubles the price in fast mode', () => {
    const tokens = { input: 0, output: 1_000_000, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, fast: true };
    assert.ok(Math.abs(costUsd(tokens, 'claude-opus-5-5', pricing) - 40) < 1e-9);
  });

  it('applies the Haiku 5.5 long-prompt multiplier only above 100K prompt tokens', () => {
    const short = { input: 100_000, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, fast: false };
    const long = { ...short, input: 100_001 };
    assert.ok(Math.abs(costUsd(short, 'claude-haiku-5-5', pricing) - 0.01) < 1e-9);
    // 100,001 tokens * $0.10 per 1M, times the x5 long-prompt multiplier
    assert.ok(Math.abs(costUsd(long, 'claude-haiku-5-5', pricing) - 0.0500005) < 1e-9);
  });

  it('returns null, not zero, for an unpriced model', () => {
    const tokens = { input: 5, output: 5, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, fast: false };
    assert.equal(costUsd(tokens, 'claude-unknown-9', pricing), null);
  });
});

describe('normalizeUsage', () => {
  it('splits cache writes by TTL when the row carries the split', () => {
    const usage = { cache_creation_input_tokens: 70, cache_creation: { ephemeral_5m_input_tokens: 20, ephemeral_1h_input_tokens: 50 } };
    assert.deepEqual(
      { w5: normalizeUsage(usage).cacheWrite5m, w1: normalizeUsage(usage).cacheWrite1h },
      { w5: 20, w1: 50 },
    );
  });

  it('bills a write without a TTL split as 5-minute', () => {
    const tokens = normalizeUsage({ cache_creation_input_tokens: 70 });
    assert.equal(tokens.cacheWrite5m, 70);
    assert.equal(tokens.cacheWrite1h, 0);
  });

  it('treats missing or non-numeric counts as zero', () => {
    const tokens = normalizeUsage({ input_tokens: 'x', output_tokens: null });
    assert.deepEqual([tokens.input, tokens.output, tokens.cacheRead], [0, 0, 0]);
  });
});

describe('collectMessages', () => {
  it('counts a message written as several rows once', () => {
    const text = [row(), row({ entry: { timestamp: '2026-11-23T10:00:05.000Z' } }), row({ entry: { timestamp: '2026-11-23T10:00:09.000Z' } })].join('\n');
    const messages = collectMessages(text);
    assert.equal(messages.size, 1);
    const [only] = messages.values();
    assert.equal(only.tokens.output, 20);
    assert.equal(only.ts, Date.parse('2026-11-23T10:00:00.000Z'));
  });

  it('keeps the larger count when a later row of a message has more output', () => {
    const grown = row({ message: { usage: { input_tokens: 10, output_tokens: 99, cache_read_input_tokens: 30 } } });
    const [only] = collectMessages([row(), grown].join('\n')).values();
    assert.equal(only.tokens.output, 99);
  });

  it('merges the same message across two transcripts (a forked session)', () => {
    const into = collectMessages(row());
    collectMessages(row(), into);
    assert.equal(into.size, 1);
  });

  it('ignores user rows, synthetic models, rows without usage and a half-written last line', () => {
    const text = [
      JSON.stringify({ type: 'user', message: { usage: { input_tokens: 1 } } }),
      row({ message: { id: 'msg_syn', model: '<synthetic>' } }),
      JSON.stringify({ type: 'assistant', timestamp: '2026-11-23T10:00:00.000Z', message: { id: 'm', model: 'claude-sonnet-5-5' } }),
      '{"type":"assistant","message":{"usage":',
    ].join('\n');
    assert.equal(collectMessages(text).size, 0);
  });

  it('records the editor and Claude Code version of the row', () => {
    const [only] = collectMessages(row()).values();
    assert.equal(only.editor, 'claude-vscode');
    assert.equal(only.version, '2.1.330');
  });
});

describe('buildWindows + attribute', () => {
  const t = (iso) => Date.parse(iso);
  const commits = [
    { sha: 'aaa', committedMs: t('2026-11-23T10:00:00Z') },
    { sha: 'bbb', committedMs: t('2026-11-23T11:00:00Z') },
  ];
  const windows = buildWindows(commits, t('2026-11-23T09:00:00Z'));
  const record = (id, iso, output) => ({
    id,
    ts: t(iso),
    model: 'claude-sonnet-5-5',
    editor: 'claude-vscode',
    version: '2.1.330',
    tokens: { input: 0, output, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, fast: false },
  });

  it('gives each message to the commit whose window holds it', () => {
    const totals = attribute(
      [record('1', '2026-11-23T09:30:00Z', 100), record('2', '2026-11-23T10:30:00Z', 7)],
      windows,
      pricing,
    );
    assert.equal(totals.get('aaa').output, 100);
    assert.equal(totals.get('bbb').output, 7);
  });

  it('counts the instant of a commit in that commit and the parent instant in the parent', () => {
    const totals = attribute(
      [record('1', '2026-11-23T10:00:00.500Z', 5), record('2', '2026-11-23T09:00:00Z', 9)],
      windows,
      pricing,
    );
    assert.equal(totals.get('aaa').output, 5);
    assert.equal(totals.get('aaa').messages, 1); // the parent-second message is not counted
  });

  it('drops usage before the first window and after the last commit', () => {
    const totals = attribute(
      [record('1', '2026-11-23T08:00:00Z', 1), record('2', '2026-11-23T12:00:00Z', 1)],
      windows,
      pricing,
    );
    assert.equal(totals.get('aaa').messages + totals.get('bbb').messages, 0);
  });

  it('keeps windows disjoint when a commit is dated before its parent', () => {
    const out = buildWindows(
      [
        { sha: 'x', committedMs: t('2026-11-23T10:00:00Z') },
        { sha: 'y', committedMs: t('2026-11-23T09:00:00Z') },
      ],
      t('2026-11-23T08:00:00Z'),
    );
    assert.equal(out[1].startMs, out[0].endMs);
    assert.ok(out[1].endMs >= out[1].startMs);
  });

  it('reports an unpriced model instead of adding a made-up cost', () => {
    const odd = { ...record('1', '2026-11-23T09:30:00Z', 100), model: 'claude-unknown-9' };
    const totals = attribute([odd], windows, pricing).get('aaa');
    assert.equal(totals.costUsd, 0);
    assert.deepEqual([...totals.unpriced], ['claude-unknown-9']);
  });
});

describe('parseReported + renderComment', () => {
  const totalsFor = (costUsd, over = {}) => ({
    messages: 2,
    input: 10,
    output: 4,
    cacheRead: 100,
    cacheWrite: 50,
    costUsd,
    models: new Map([['claude-sonnet-5-5', costUsd]]),
    editors: new Map([['VS Code extension', new Set(['2.1.330'])]]),
    unpriced: new Set(),
    ...over,
  });

  it('round-trips the commits a comment covered, so a second run skips them', () => {
    const body = renderComment({ rows: [{ sha: 'abc1234567', subject: 'feat: x', totals: totalsFor(1.5) }], priorUsd: 0, pricing });
    assert.ok(body.includes(`<!-- ${MARKER} `));
    assert.deepEqual([...parseReported([body, 'unrelated comment'])], [['abc1234567', 1.5]]);
  });

  it('ignores a marker whose JSON was edited by hand', () => {
    assert.equal(parseReported([`<!-- ${MARKER} {not json} -->`]).size, 0);
  });

  it('shows total input as fresh + cache read + cache write, plus the LLM and the editor', () => {
    const body = renderComment({ rows: [{ sha: 'abc1234567', subject: 'feat: x', totals: totalsFor(0.25) }], priorUsd: 1, pricing });
    assert.ok(body.includes('| 160 | 100 | 50 | 4 | $0.250 |'));
    assert.ok(body.includes('Claude Sonnet 5.5'));
    assert.ok(body.includes('VS Code extension (Claude Code 2.1.330)'));
    assert.ok(body.includes('**PR total so far:** $1.25'));
  });

  it('shows a dash for a commit with no recorded usage and escapes pipes in the subject', () => {
    const empty = totalsFor(0, { messages: 0, models: new Map(), editors: new Map() });
    const body = renderComment({ rows: [{ sha: 'abc1234567', subject: 'a | b', totals: empty }], priorUsd: 0, pricing });
    assert.ok(body.includes(String.raw`a \| b`));
    assert.ok(body.includes('| — | — | — | — | — | — |'));
  });

  it('names an unpriced model and notes skipped older commits', () => {
    const odd = totalsFor(0, { unpriced: new Set(['claude-unknown-9']) });
    const body = renderComment({ rows: [{ sha: 'abc1234567', subject: 's', totals: odd }], priorUsd: 0, pricing, skippedOlder: 3 });
    assert.ok(body.includes('No rate card for claude-unknown-9'));
    assert.ok(body.includes('3 older unreported commits not shown.'));
    assert.ok(body.includes('+ unpriced'));
  });
});
