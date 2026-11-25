import { describe, expect, it } from 'vitest';
import { emailVerifyDefaults, makeEmailVerifySchema } from '../src/schemas';

/** The Email Verifier's one-address check: the key is echoed, so each assertion names the message shown. */
const schema = makeEmailVerifySchema((key) => key);
const messages = (input: unknown) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeEmailVerifySchema', () => {
  it('asks for an address, then for a well-formed one', () => {
    expect(messages(emailVerifyDefaults)).toContain('crm.emailVerifier.emailRequired');
    expect(messages({ email: 'asha@' })).toEqual(['crm.emailVerifier.emailInvalid']);
  });

  it('accepts and trims a well-formed address', () => {
    expect(schema.parse({ email: ' asha@duncit.com ' })).toEqual({ email: 'asha@duncit.com' });
  });
});
