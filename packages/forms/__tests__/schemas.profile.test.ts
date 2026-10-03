/**
 * The profile rules every profile editor shares — mWeb's About form and the
 * portals' Profile tab — each ceiling the server's.
 */
import { describe, expect, it } from 'vitest';

import {
  cleanProfileLinks,
  makeProfileBioSchema,
  makeProfileLinksSchema,
  makeProfileNameSchemas,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_LINK_LABEL_MAX_LENGTH,
  PROFILE_LINKS_MAX,
  PROFILE_NAME_MAX_LENGTH,
} from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  `${key}:${options?.vars?.max ?? ''}`;

const messages = (result: { error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => [issue.path.join('.'), issue.message]) ?? [];

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

describe('makeProfileNameSchemas', () => {
  const { first_name, last_name } = makeProfileNameSchemas(t);

  it('takes a name signup would take, trimmed, up to the server ceiling', () => {
    expect(PROFILE_NAME_MAX_LENGTH).toBe(60);
    expect(first_name.parse("  Mary Ann O'Neil ")).toBe("Mary Ann O'Neil");
    expect(first_name.safeParse('A'.repeat(PROFILE_NAME_MAX_LENGTH)).success).toBe(true);
  });

  it('requires a first name', () => {
    expect(first_name.safeParse('   ').error?.issues[0].message).toBe(
      'mweb.accountEdit.validation.firstNameRequired:',
    );
  });

  it('refuses a first name signup would refuse, and one past the ceiling', () => {
    expect(first_name.safeParse('R2D2').error?.issues[0].message).toBe(
      'mweb.accountEdit.validation.firstNamePattern:',
    );
    expect(first_name.safeParse('A'.repeat(PROFILE_NAME_MAX_LENGTH + 1)).error?.issues[0].message).toBe(
      'mweb.accountEdit.validation.nameTooLong:60',
    );
  });

  it('lets the last name stay empty but holds a filled one to the same shape', () => {
    expect(last_name.parse('  ')).toBe('');
    expect(last_name.parse('Smith')).toBe('Smith');
    expect(last_name.safeParse('smith_99').error?.issues[0].message).toBe(
      'mweb.accountEdit.validation.lastNamePattern:',
    );
    expect(last_name.safeParse('B'.repeat(PROFILE_NAME_MAX_LENGTH + 1)).error?.issues[0].message).toBe(
      'mweb.accountEdit.validation.nameTooLong:60',
    );
  });
});

describe('makeProfileLinksSchema', () => {
  const schema = makeProfileLinksSchema(t);

  it('takes complete links and a completely blank row', () => {
    const result = schema.safeParse([
      { label: 'Site', url: 'https://duncit.com' },
      { label: '  ', url: ' ' },
    ]);

    expect(result.success).toBe(true);
  });

  it('puts each missing half on the row that left it out', () => {
    const result = schema.safeParse([
      { label: 'Site', url: '' },
      { label: '', url: 'https://duncit.com' },
    ]);

    expect(messages(result)).toEqual([
      ['0.url', 'mweb.accountEdit.validation.linkUrlRequired:'],
      ['1.label', 'mweb.accountEdit.validation.linkLabelRequired:'],
    ]);
  });

  it('refuses a URL that does not parse', () => {
    expect(messages(schema.safeParse([{ label: 'Site', url: 'not a url' }]))).toEqual([
      ['0.url', 'mweb.accountEdit.validation.linkUrlInvalid:'],
    ]);
  });

  it('caps the label length and the number of links at the server limits', () => {
    expect(PROFILE_LINK_LABEL_MAX_LENGTH).toBe(40);
    expect(PROFILE_LINKS_MAX).toBe(5);
    const longLabel = { label: 'x'.repeat(PROFILE_LINK_LABEL_MAX_LENGTH + 1), url: 'https://a.co' };
    expect(messages(schema.safeParse([longLabel]))).toEqual([
      ['0.label', 'mweb.accountEdit.validation.linkLabelTooLong:40'],
    ]);

    const six = Array.from({ length: PROFILE_LINKS_MAX + 1 }, () => ({ label: 'a', url: 'https://a.co' }));
    expect(messages(schema.safeParse(six))).toEqual([['', 'mweb.accountEdit.validation.linksMax:5']]);
  });
});

describe('cleanProfileLinks', () => {
  it('trims both halves and drops rows missing either', () => {
    expect(
      cleanProfileLinks([
        { label: ' Site ', url: ' https://duncit.com ' },
        { label: '', url: 'https://orphan.com' },
        { label: 'Orphan', url: '  ' },
      ]),
    ).toEqual([{ label: 'Site', url: 'https://duncit.com' }]);
  });
});
