import { describe, expect, it } from 'vitest';
import { MEDIA_NAME_MAX, makeMediaNameSchema } from '../src/schemas/media-name';

/** Renaming a CRM library image: the key is echoed, so each assertion names the message shown. */
const messages = (name: string) => {
  const result = makeMediaNameSchema((key) => key).safeParse({ name });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeMediaNameSchema', () => {
  it('takes a name up to the server cap, trimmed', () => {
    expect(messages('  Hero banner ')).toEqual([]);
    expect(messages('x'.repeat(MEDIA_NAME_MAX))).toEqual([]);
  });

  it('refuses a blank or too long name', () => {
    expect(messages('   ')).toEqual(['crm.media.nameRequired']);
    expect(messages('x'.repeat(MEDIA_NAME_MAX + 1))).toEqual(['crm.media.nameTooLong']);
  });
});
