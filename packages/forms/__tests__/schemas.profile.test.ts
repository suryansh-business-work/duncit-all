/**
 * The bio rule every profile editor shares — one ceiling, the server's.
 */
import { describe, expect, it } from 'vitest';

import { makeProfileBioSchema, PROFILE_BIO_MAX_LENGTH } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  `${key}:${options?.vars?.max ?? ''}`;

describe('makeProfileBioSchema', () => {
  const schema = makeProfileBioSchema(t);

  it('stops at the server ceiling', () => {
    expect(PROFILE_BIO_MAX_LENGTH).toBe(500);
    expect(schema.safeParse('x'.repeat(PROFILE_BIO_MAX_LENGTH)).success).toBe(true);
  });

  it('refuses one character more, naming the limit through the key', () => {
    const result = schema.safeParse('x'.repeat(PROFILE_BIO_MAX_LENGTH + 1));

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'mweb.accountEdit.validation.bioTooLong:500',
    ]);
  });

  it('trims before counting, and takes an empty bio', () => {
    expect(schema.parse(`  ${'x'.repeat(PROFILE_BIO_MAX_LENGTH)}  `)).toHaveLength(500);
    expect(schema.parse('')).toBe('');
  });
});
