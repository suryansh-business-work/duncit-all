/**
 * The appeal mWeb and the native app both send against a health deduction.
 * Every assertion is on a KEY: a literal sentence reappearing here is the
 * regression.
 */
import { describe, expect, it } from 'vitest';

import { healthAppealDefaults, makeHealthAppealSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeHealthAppealSchema(t);

const messagesFor = (values: { reason: string; message: string }) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeHealthAppealSchema', () => {
  it('accepts a known reason with an explanation, trimmed', () => {
    expect(schema.parse({ reason: 'INCORRECT', message: '  I was at the venue on time  ' })).toEqual({
      reason: 'INCORRECT',
      message: 'I was at the venue on time',
    });
    expect(schema.parse({ reason: 'WONT_HAPPEN_AGAIN', message: 'Sorry' }).reason).toBe('WONT_HAPPEN_AGAIN');
  });

  it('asks for a reason when none, or an unknown one, was picked', () => {
    expect(messagesFor({ reason: '', message: 'Explained' })).toEqual(['healthAppeal.reasonRequired']);
    expect(messagesFor({ reason: 'OTHER', message: 'Explained' })).toEqual(['healthAppeal.reasonRequired']);
  });

  it('asks for the words when they are blank or only spaces', () => {
    for (const message of ['', '    ']) {
      expect(messagesFor({ reason: 'INCORRECT', message })).toEqual(['healthAppeal.messageRequired']);
    }
  });

  it('stops at the server limit of 1000 characters, and says so', () => {
    expect(messagesFor({ reason: 'INCORRECT', message: 'a'.repeat(1000) })).toEqual([]);
    expect(messagesFor({ reason: 'INCORRECT', message: 'a'.repeat(1001) })).toEqual([
      'healthAppeal.messageTooLong:{"max":"1000"}',
    ]);
  });

  it('starts with nothing picked', () => {
    expect(healthAppealDefaults).toEqual({ reason: '', message: '' });
  });
});
