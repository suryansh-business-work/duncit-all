/**
 * "Request an event" — the member's optional note, one rule for the mWeb
 * dialog and the native sheet. The bound is the server's
 * (EVENT_REQUEST_NOTE_MAX). Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';

import { EVENT_REQUEST_NOTE_MAX, eventRequestDefaults, makeEventRequestSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeEventRequestSchema(t);

const issuesFor = (note: string) => {
  const result = schema.safeParse({ note });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeEventRequestSchema', () => {
  it('needs no note at all', () => {
    expect(eventRequestDefaults).toEqual({ note: '' });
    expect(schema.parse(eventRequestDefaults)).toEqual({ note: '' });
  });

  it('trims the note', () => {
    expect(schema.parse({ note: '  A board games night?  ' })).toEqual({ note: 'A board games night?' });
  });

  it('takes a note up to the server’s bound, counted after trimming', () => {
    expect(EVENT_REQUEST_NOTE_MAX).toBe(280);
    expect(issuesFor('x'.repeat(EVENT_REQUEST_NOTE_MAX))).toEqual([]);
    expect(issuesFor(`  ${'x'.repeat(EVENT_REQUEST_NOTE_MAX)}  `)).toEqual([]);
  });

  it('refuses a longer note, naming the bound', () => {
    expect(issuesFor('x'.repeat(EVENT_REQUEST_NOTE_MAX + 1))).toEqual([
      `note=publicPage.eventRequest.noteTooLong:{"max":${EVENT_REQUEST_NOTE_MAX}}`,
    ]);
  });

  it('refuses a note that is not text', () => {
    expect(schema.safeParse({ note: 42 }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
