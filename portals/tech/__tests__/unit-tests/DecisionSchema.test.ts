import { describe, expect, it } from 'vitest';
import {
  NOTE_MAX_LENGTH,
  blankDecision,
  decisionSchema,
  toDecisionInput,
} from '../../src/pages/security/verification-requests/decision';

const schema = decisionSchema({ noteTooLong: 'Too long' });

describe('the decision note rules', () => {
  it('keeps the same ceiling the server enforces', () => {
    // portalSecurity.validator.ts: exceptionDecisionSchema.note = optionalText(300)
    expect(NOTE_MAX_LENGTH).toBe(300);
  });

  it('starts blank, because the note is optional', () => {
    expect(schema.safeParse(blankDecision).success).toBe(true);
  });

  it('trims the note before it is measured or sent', () => {
    expect(schema.parse({ note: '  looks fine  ' })).toEqual({ note: 'looks fine' });
  });

  it('accepts a note of exactly the maximum length', () => {
    expect(schema.safeParse({ note: 'a'.repeat(NOTE_MAX_LENGTH) }).success).toBe(true);
  });

  it('does not count the padding around a note that fits', () => {
    expect(schema.safeParse({ note: `  ${'a'.repeat(NOTE_MAX_LENGTH)}  ` }).success).toBe(true);
  });

  it('refuses a note one character over, with the message it was given', () => {
    const result = schema.safeParse({ note: 'a'.repeat(NOTE_MAX_LENGTH + 1) });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Too long']);
    expect(result.error?.issues[0]?.path).toEqual(['note']);
  });
});

describe('toDecisionInput', () => {
  it('names the request, the decision and the note', () => {
    expect(toDecisionInput('req-1', true, { note: 'ok' })).toEqual({ id: 'req-1', approve: true, note: 'ok' });
    expect(toDecisionInput('req-1', false, { note: 'no' })).toEqual({ id: 'req-1', approve: false, note: 'no' });
  });

  it('sends a blank note as no note at all', () => {
    expect(toDecisionInput('req-1', true, { note: '' })).toEqual({ id: 'req-1', approve: true, note: null });
  });
});
