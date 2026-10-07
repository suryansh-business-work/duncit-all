/**
 * Pod Request rules shared by the Partners console, mWeb and native: the note,
 * the partner's own monthly cap, and the admin override. Every assertion is on
 * a KEY: a literal sentence reappearing here is the regression.
 */
import { describe, expect, it } from 'vitest';

import {
  POD_REQUEST_LIMIT_MAX,
  POD_REQUEST_NOTE_MAX,
  POD_REQUEST_OVERRIDE_MAX,
  makePodRequestLimitSchema,
  makePodRequestNoteSchema,
  makePodRequestOverrideSchema,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message);

describe('makePodRequestNoteSchema', () => {
  const schema = makePodRequestNoteSchema(t);

  it('accepts an empty note and trims a written one', () => {
    expect(schema.parse({ note: '' })).toEqual({ note: '' });
    expect(schema.parse({ note: '  Weekend board games  ' })).toEqual({ note: 'Weekend board games' });
  });

  it('allows exactly the cap and refuses one character more, naming the cap', () => {
    const atCap = 'a'.repeat(POD_REQUEST_NOTE_MAX);
    expect(issues(schema.safeParse({ note: atCap }))).toEqual([]);
    expect(issues(schema.safeParse({ note: `${atCap}a` }))).toEqual([
      `podRequests.noteTooLong:${JSON.stringify({ max: POD_REQUEST_NOTE_MAX })}`,
    ]);
  });

  it('measures the cap after trimming', () => {
    expect(issues(schema.safeParse({ note: `  ${'a'.repeat(POD_REQUEST_NOTE_MAX)}  ` }))).toEqual([]);
  });
});

describe('makePodRequestLimitSchema', () => {
  const schema = makePodRequestLimitSchema(t);

  it('accepts the whole range, coercing typed text to a number', () => {
    expect(schema.parse({ limit: '0' })).toEqual({ limit: 0 });
    expect(schema.parse({ limit: 10 })).toEqual({ limit: 10 });
    expect(schema.parse({ limit: String(POD_REQUEST_LIMIT_MAX) })).toEqual({ limit: POD_REQUEST_LIMIT_MAX });
  });

  it('refuses negatives, fractions, values past the cap and text with the shared key', () => {
    for (const limit of [-1, 2.5, POD_REQUEST_LIMIT_MAX + 1, 'ten', '', '   ']) {
      expect(issues(schema.safeParse({ limit }))).toEqual(['podRequests.limitInvalid']);
    }
  });
});

describe('makePodRequestOverrideSchema', () => {
  const schema = makePodRequestOverrideSchema(t);

  it('turns an empty field into null, which clears the override', () => {
    expect(schema.parse({ limit: '' })).toEqual({ limit: null });
  });

  it('accepts a whole number up to the override cap, past the partner range', () => {
    expect(schema.parse({ limit: String(POD_REQUEST_LIMIT_MAX + 50) })).toEqual({ limit: POD_REQUEST_LIMIT_MAX + 50 });
    expect(schema.parse({ limit: POD_REQUEST_OVERRIDE_MAX })).toEqual({ limit: POD_REQUEST_OVERRIDE_MAX });
  });

  it('refuses anything else with the override key', () => {
    for (const limit of [-1, 1.5, POD_REQUEST_OVERRIDE_MAX + 1, 'lots']) {
      expect(issues(schema.safeParse({ limit }))).toContain('podRequests.overrideInvalid');
    }
  });
});
