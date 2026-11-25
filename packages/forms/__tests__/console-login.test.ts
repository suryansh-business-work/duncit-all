import { describe, expect, it } from 'vitest';
import { consoleLoginDefaults, makeConsoleLoginSchema } from '../src/schemas';

/** The console login card's rules: the key is echoed, so each assertion names the message shown. */
const t = (key: string) => key;
const schema = makeConsoleLoginSchema(t);
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeConsoleLoginSchema', () => {
  it('asks for both boxes when they are empty', () => {
    expect(messages(consoleLoginDefaults)).toEqual([
      'session.login.emailRequired',
      'session.login.passwordRequired',
    ]);
  });

  it('refuses an address without a domain, and trims the one it accepts', () => {
    expect(messages({ email: 'asha@', password: 'x' })).toEqual(['session.login.emailInvalid']);
    expect(schema.parse({ email: '  asha@duncit.com ', password: 'x' }).email).toBe('asha@duncit.com');
  });

  it('accepts any non-empty password — the console sets no length floor', () => {
    expect(messages({ email: 'asha@duncit.com', password: '1' })).toEqual([]);
  });
});
