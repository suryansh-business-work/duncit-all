import { catalogueDefaults, normalizeToolConfig, parseConfigJson } from '../../tools/challengeTool.config';

const fail = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return { message: (e as Error).message, code: (e as { extensions?: { code?: string } }).extensions?.code };
  }
  return null;
};
const msg = (fn: () => unknown) => fail(fn)?.message;
const norm = (type: string, override: Record<string, unknown>) => () => normalizeToolConfig(type, {}, override);

describe('challengeTool.config normalizeToolConfig', () => {
  it('rejects an unknown tool type', () => {
    expect(fail(() => normalizeToolConfig('NOPE', {}))).toEqual({
      message: 'Unknown tool type NOPE',
      code: 'BAD_USER_INPUT',
    });
  });

  it('fills catalogue defaults and drops unknown keys', () => {
    const cfg = normalizeToolConfig('SCORE_COUNTER', { smuggled: 1 }, { weight: 3 });
    expect(cfg.weight).toBe(3);
    expect(cfg).not.toHaveProperty('smuggled');
    expect(cfg.counts_toward_total).toBe(true);
  });

  it('treats a null override as no override', () => {
    expect(normalizeToolConfig('SCORE_COUNTER', { weight: 2 }, null).weight).toBe(2);
  });

  it('enforces number min and max', () => {
    expect(msg(norm('SCORE_COUNTER', { weight: 101 }))).toBe('weight must be at most 100');
    expect(msg(norm('SCORE_COUNTER', { weight: -101 }))).toBe('weight must be at least -100');
    expect(msg(norm('SCORE_COUNTER', { weight: 'abc' }))).toBe('weight must be a number');
  });

  it('requires booleans to be real booleans', () => {
    expect(msg(norm('SCORE_COUNTER', { allow_negative: 'yes' }))).toBe('allow_negative must be on or off');
  });

  it('trims and truncates text to 40 chars', () => {
    const cfg = normalizeToolConfig('SCORE_COUNTER', {}, { unit: `  ${'x'.repeat(60)}  ` });
    expect(cfg.unit).toBe('x'.repeat(40));
  });

  it('only accepts select values from the options', () => {
    expect(normalizeToolConfig('TIMER', {}, { mode: 'COUNTDOWN' }).mode).toBe('COUNTDOWN');
    expect(msg(norm('TIMER', { mode: 'HOURGLASS' }))).toBe('mode has an unsupported value');
  });

  it('validates number lists: non-empty, non-zero, deduplicated and capped', () => {
    expect(normalizeToolConfig('SCORE_COUNTER', {}, { increments: [1, 1, 5] }).increments).toEqual([1, 5]);
    const many = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(normalizeToolConfig('SCORE_COUNTER', {}, { increments: many }).increments).toHaveLength(12);
    expect(msg(norm('SCORE_COUNTER', { increments: [] }))).toBe('increments needs at least one value');
    expect(msg(norm('SCORE_COUNTER', { increments: [1, 0] }))).toBe('increments values must be non-zero numbers');
    expect(msg(norm('SCORE_COUNTER', { increments: [1, 'x'] }))).toBe('increments values must be non-zero numbers');
  });
});

describe('challengeTool.config labelled lists', () => {
  it('normalises checklist items with generated keys and bounded points', () => {
    const cfg = normalizeToolConfig('CHECKLIST', {}, { items: [{ label: ' Cones ', points: 2 }, { key: 'k', label: 'Flags' }] });
    expect(cfg.items).toEqual([
      { key: 'i1', label: 'Cones', points: 2 },
      { key: 'k', label: 'Flags', points: 1 },
    ]);
  });

  it('refuses empty, label-less and duplicate-key items', () => {
    expect(msg(norm('CHECKLIST', { items: [] }))).toBe('items needs at least 1 entry');
    expect(msg(norm('CHECKLIST', { items: 'x' }))).toBe('items needs at least 1 entry');
    expect(msg(norm('CHECKLIST', { items: [{ label: '  ' }] }))).toBe('Entry 1 needs a label');
    expect(msg(norm('CHECKLIST', { items: [null] }))).toBe('Entry 1 needs a label');
    const dup = [{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }];
    expect(msg(norm('CHECKLIST', { items: dup }))).toBe('items keys must be unique');
    expect(msg(norm('CHECKLIST', { items: [{ label: 'A', points: 5000 }] }))).toBe('points must be between -1000 and 1000');
  });

  it('poll options need at least two entries', () => {
    expect(msg(norm('POLL', { options: [{ label: 'Only' }] }))).toBe('options needs at least 2 entries');
    expect(normalizeToolConfig('POLL', {}, { options: [{ label: 'A' }, { label: 'B' }] }).options).toEqual([
      { key: 'o1', label: 'A' },
      { key: 'o2', label: 'B' },
    ]);
  });

  it('quiz questions validate answers and the correct index', () => {
    const ok = normalizeToolConfig('QUIZ', {}, { questions: [{ label: 'Q', options: [' a ', '', 'b'], correct: 1 }] });
    expect(ok.questions).toEqual([{ key: 'q1', label: 'Q', options: ['a', 'b'], correct: 1, points: 1 }]);
    const defaulted = normalizeToolConfig('QUIZ', {}, { questions: [{ label: 'Q', options: [null, 'a', 'b'] }] });
    expect(defaulted.questions).toEqual([{ key: 'q1', label: 'Q', options: ['a', 'b'], correct: 0, points: 1 }]);
    const q = (question: Record<string, unknown>) => norm('QUIZ', { questions: [question] });
    expect(msg(q({ label: 'Q', options: ['a'] }))).toBe('Question 1 needs at least two answers');
    expect(msg(q({ label: 'Q' }))).toBe('Question 1 needs at least two answers');
    expect(msg(q({ label: 'Q', options: ['a', 'b'], correct: 2 }))).toBe('Question 1 needs a correct answer from its own list');
    expect(msg(q({ label: 'Q', options: ['a', 'b'], correct: 0.5 }))).toBe('Question 1 needs a correct answer from its own list');
  });
});

describe('challengeTool.config formula and criteria', () => {
  it('formula terms must name a scoring tool, once each', () => {
    const cfg = normalizeToolConfig('CUSTOM_FORMULA', {}, { terms: [{ type: 'SCORE_COUNTER', weight: 2 }, { type: 'MEASUREMENT' }] });
    expect(cfg.terms).toEqual([
      { type: 'SCORE_COUNTER', weight: 2 },
      { type: 'MEASUREMENT', weight: 1 },
    ]);
    expect(msg(norm('CUSTOM_FORMULA', { terms: [] }))).toBe('A formula needs at least one term');
    expect(msg(norm('CUSTOM_FORMULA', { terms: 'x' }))).toBe('A formula needs at least one term');
    expect(msg(norm('CUSTOM_FORMULA', { terms: [{ type: 'POLL' }] }))).toBe('A formula term names a tool that produces no score');
    expect(msg(norm('CUSTOM_FORMULA', { terms: [null] }))).toBe('A formula term names a tool that produces no score');
    expect(msg(norm('CUSTOM_FORMULA', { terms: [{ type: 'SCORE_COUNTER' }, { type: 'SCORE_COUNTER' }] }))).toBe(
      'Each tool can appear once in a formula'
    );
  });

  it('judge criteria apply defaults and reject bad weights, maxima and duplicates', () => {
    const ok = normalizeToolConfig('JUDGE_SCORING', {}, { criteria: [{ label: 'Style' }, { key: 'x', label: 'Tech', weight: 2, max: 20 }] });
    expect(ok.criteria).toEqual([
      { key: 'c1', label: 'Style', weight: 1, max: 10 },
      { key: 'x', label: 'Tech', weight: 2, max: 20 },
    ]);
    const run = (criteria: unknown) => msg(norm('JUDGE_SCORING', { criteria }));
    expect(run([])).toBe('At least one judging criterion is required');
    expect(run([{ label: ' ' }])).toBe('Criterion 1 needs a label');
    expect(run([null])).toBe('Criterion 1 needs a label');
    expect(run([{ label: 'A', weight: 0 }])).toBe('Criterion 1 weight must be positive');
    expect(run([{ label: 'A', max: 0 }])).toBe('Criterion 1 max must be 1-100');
    expect(run([{ label: 'A', max: 101 }])).toBe('Criterion 1 max must be 1-100');
    expect(run([{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }])).toBe('Criterion keys must be unique');
  });
});

describe('challengeTool.config catalogueDefaults and parseConfigJson', () => {
  it('catalogue tools normalise from their own defaults', () => {
    for (const type of ['TIMER', 'QUIZ', 'POLL', 'CUSTOM_FORMULA', 'JUDGE_SCORING', 'CHECKPOINT']) {
      expect(() => catalogueDefaults(type)).not.toThrow();
    }
    expect(catalogueDefaults('TIMER').mode).toBe('STOPWATCH');
  });

  it('parses an object and treats blank input as no config', () => {
    expect(parseConfigJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseConfigJson(null)).toBeNull();
    expect(parseConfigJson(undefined)).toBeNull();
    expect(parseConfigJson('')).toBeNull();
  });

  it('turns malformed or non-object JSON into BAD_USER_INPUT', () => {
    expect(fail(() => parseConfigJson('{oops'))).toEqual({ message: 'Configuration is not valid JSON', code: 'BAD_USER_INPUT' });
    expect(msg(() => parseConfigJson('[1]'))).toBe('Configuration must be an object');
    expect(msg(() => parseConfigJson('null'))).toBe('Configuration must be an object');
  });
});
