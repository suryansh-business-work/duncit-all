/**
 * A venue chat line its author rewrites — one rule for mWeb, the Partners app
 * and the native app. Every assertion is on a KEY.
 */
import { describe, expect, it } from 'vitest';

import { makeVenueChatEditSchema, VENUE_CHAT_TEXT_MAX } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeVenueChatEditSchema(t);

const messagesFor = (text: string) => {
  const result = schema.safeParse({ text });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeVenueChatEditSchema', () => {
  it("mirrors the server's bound on one line", () => {
    expect(VENUE_CHAT_TEXT_MAX).toBe(2000);
  });

  it('takes the rewritten words, trimmed', () => {
    expect(schema.parse({ text: '  Set up at 5 instead?  ' })).toEqual({ text: 'Set up at 5 instead?' });
  });

  it('needs something to say', () => {
    for (const text of ['', '   ', '\n\t']) expect(messagesFor(text)).toEqual(['text=availability.offers.chat.editRequired']);
  });

  it('takes a line up to the bound, counting only what is left after trimming', () => {
    expect(messagesFor('w'.repeat(VENUE_CHAT_TEXT_MAX))).toEqual([]);
    expect(schema.parse({ text: ` ${'w'.repeat(VENUE_CHAT_TEXT_MAX)} ` }).text).toHaveLength(VENUE_CHAT_TEXT_MAX);
  });

  it('refuses a line past the bound', () => {
    expect(messagesFor('w'.repeat(VENUE_CHAT_TEXT_MAX + 1))).toEqual([
      `text=availability.offers.chat.editTooLong:${JSON.stringify({ max: VENUE_CHAT_TEXT_MAX })}`,
    ]);
  });
});
