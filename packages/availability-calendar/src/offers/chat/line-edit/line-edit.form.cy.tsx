import { describe, expect, it } from 'vitest';
import { VENUE_CHAT_TEXT_MAX, makeVenueChatEditSchema } from '@duncit/forms/schemas';

/** Reads the key and its vars back, so a message names the rule it came from. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}(${JSON.stringify(options.vars)})` : key;
const schema = makeVenueChatEditSchema(t);

const messageOf = (text: string) => {
  const result = schema.safeParse({ text });
  return result.success ? null : result.error.issues[0]?.message;
};

describe('the line edit rule', () => {
  it('accepts a rewrite with something to say, trimmed', () => {
    expect(schema.parse({ text: '  Fine by us  ' })).toEqual({ text: 'Fine by us' });
    expect(messageOf('x'.repeat(VENUE_CHAT_TEXT_MAX))).toBeNull();
  });

  it('refuses an empty or blank line', () => {
    expect(messageOf('')).toBe('availability.offers.chat.editRequired');
    expect(messageOf('   ')).toBe('availability.offers.chat.editRequired');
  });

  it("refuses a line past the server's bound", () => {
    expect(messageOf('x'.repeat(VENUE_CHAT_TEXT_MAX + 1))).toBe(`availability.offers.chat.editTooLong({"max":${VENUE_CHAT_TEXT_MAX}})`);
  });
});
