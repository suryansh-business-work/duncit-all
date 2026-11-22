/**
 * The handover mWeb and the native app both send when Ask Duncit cannot
 * resolve something. Every assertion is on a KEY, never a sentence.
 */
import { describe, expect, it } from 'vitest';

import { askDuncitHandoverDefaults, makeAskDuncitHandoverSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeAskDuncitHandoverSchema(t);

const messagesFor = (values: { team: string; summary: string }) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeAskDuncitHandoverSchema', () => {
  it('accepts every server team, with the summary trimmed and optional', () => {
    expect(schema.parse({ team: 'OPERATIONS', summary: '  Refund for a cancelled pod  ' })).toEqual({
      team: 'OPERATIONS',
      summary: 'Refund for a cancelled pod',
    });
    expect(schema.parse(askDuncitHandoverDefaults)).toEqual({ team: 'SUPPORT', summary: '' });
    expect(messagesFor({ team: 'ADMIN', summary: '' })).toEqual([]);
  });

  it('refuses an unknown or empty team', () => {
    expect(messagesFor({ team: 'FINANCE', summary: '' })).toEqual(['askDuncit.handover.teamRequired']);
    expect(messagesFor({ team: '', summary: '' })).toEqual(['askDuncit.handover.teamRequired']);
  });

  it('refuses a summary past the server limit, naming the limit', () => {
    expect(messagesFor({ team: 'SUPPORT', summary: 'x'.repeat(601) })).toEqual(['askDuncit.handover.summaryTooLong:{"max":"600"}']);
    expect(messagesFor({ team: 'SUPPORT', summary: 'x'.repeat(600) })).toEqual([]);
  });
});
