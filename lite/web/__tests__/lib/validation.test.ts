import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { createTranslator } from '@duncit/i18n';
import { WEB_FALLBACK } from '../../../shared/i18n';
import { blankToNull, countProblem, digitsToNumber, isHttpUrl, rules } from '../../lib/validation';

/** The web app's English copy, exactly as `useWebT()` answers without a provider. */
const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

/** Every message the schema raised for `value`, in order (empty when it passed). */
const messages = (schema: z.ZodType, value: unknown): string[] => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

/** The value the schema hands the form once it passed. */
const parsed = (schema: z.ZodType, value: unknown): unknown => {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`expected ${JSON.stringify(value)} to pass, got ${result.error.issues[0]?.message}`);
  return result.data;
};

describe('isHttpUrl', () => {
  it('accepts full http and https links', () => {
    expect(isHttpUrl('https://lite.example/e/garden-party')).toBe(true);
    expect(isHttpUrl('http://localhost:2041')).toBe(true);
  });

  it('refuses other schemes, bare hosts and text', () => {
    expect(isHttpUrl('ftp://files.example/a.zip')).toBe(false);
    expect(isHttpUrl('mailto:asha@example.com')).toBe(false);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('lite.example')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });
});

describe('countProblem', () => {
  const range = { min: 1, max: 100 };

  it('is null for a whole number inside the range, including both ends', () => {
    expect(countProblem('1', range, t)).toBeNull();
    expect(countProblem('100', range, t)).toBeNull();
    expect(countProblem(' 42 ', range, t)).toBeNull();
  });

  it('names each kind of problem in its own words', () => {
    expect(countProblem('-1', range, t)).toBe('This cannot be negative');
    expect(countProblem('1.5', range, t)).toBe('Enter a whole number');
    expect(countProblem('ten', range, t)).toBe('Enter a whole number');
    expect(countProblem('0', range, t)).toBe('Enter 1 or more');
    expect(countProblem('101', range, t)).toBe('Enter 100 or less');
  });
});

describe('rules.count', () => {
  const schema = rules.count(t, { min: 1, max: 100 });

  it('passes a whole number, trimmed but still text', () => {
    expect(parsed(schema, ' 42 ')).toBe('42');
  });

  it('refuses negatives, decimals and blanks, and the values just outside the range', () => {
    expect(messages(schema, '-3')).toEqual(['This cannot be negative']);
    expect(messages(schema, '2.5')).toEqual(['Enter a whole number']);
    expect(messages(schema, '1e3')).toEqual(['Enter a whole number']);
    expect(messages(schema, '')).toEqual(['Enter a whole number']);
    expect(messages(schema, '0')).toEqual(['Enter 1 or more']);
    expect(messages(schema, '101')).toEqual(['Enter 100 or less']);
  });
});

describe('rules.countOrBlank', () => {
  const schema = rules.countOrBlank(t, { min: 1, max: 5_000 });

  it('reads a blank box (even spaces) as "no limit"', () => {
    expect(parsed(schema, '')).toBe('');
    expect(parsed(schema, '   ')).toBe('');
  });

  it('still checks anything typed', () => {
    expect(parsed(schema, '5000')).toBe('5000');
    expect(messages(schema, '-1')).toEqual(['This cannot be negative']);
    expect(messages(schema, '0')).toEqual(['Enter 1 or more']);
    expect(messages(schema, '5001')).toEqual(['Enter 5000 or less']);
  });
});

describe('rules.email', () => {
  const schema = rules.email(t);

  it('trims and lower-cases a valid address', () => {
    expect(parsed(schema, '  Asha@Example.COM ')).toBe('asha@example.com');
  });

  it('asks for an address when the box is blank', () => {
    expect(messages(schema, '   ')).toContain('This is required');
  });

  it('refuses an address without a domain or with spaces', () => {
    expect(messages(schema, 'asha@example')).toEqual(['Enter a valid email address']);
    expect(messages(schema, 'asha rao@example.com')).toEqual(['Enter a valid email address']);
  });

  it('refuses an address longer than 254 characters', () => {
    const long = `${'a'.repeat(250)}@x.io`;
    expect(messages(schema, long)).toContain('Keep this to 254 characters or fewer');
  });
});

describe('rules.phone', () => {
  const schema = rules.phone(t);

  it('accepts a national number or a full number, with the usual separators', () => {
    expect(parsed(schema, '98765 43210')).toBe('98765 43210');
    expect(parsed(schema, '+91 (98765) 43-210')).toBe('+91 (98765) 43-210');
    expect(parsed(schema, '12345678')).toBe('12345678');
  });

  it('refuses fewer than eight digits, letters and more than fifteen digits', () => {
    expect(messages(schema, '1234567')).toEqual(['Enter a valid phone number']);
    expect(messages(schema, '98765abcde')).toEqual(['Enter a valid phone number']);
    expect(messages(schema, '+1234567890123456')).toEqual(['Enter a valid phone number']);
    expect(messages(schema, '')).toEqual(['Enter a valid phone number']);
  });
});

describe('rules.code', () => {
  const schema = rules.code(t);

  it('accepts exactly six digits, trimmed', () => {
    expect(parsed(schema, ' 123456 ')).toBe('123456');
  });

  it('refuses five or seven digits and letters', () => {
    expect(messages(schema, '12345')).toEqual(['Enter the 6-digit code']);
    expect(messages(schema, '1234567')).toEqual(['Enter the 6-digit code']);
    expect(messages(schema, '12a456')).toEqual(['Enter the 6-digit code']);
  });
});

describe('rules.required and rules.optional', () => {
  it('required trims, refuses blank and caps the length', () => {
    const schema = rules.required(t, 5);
    expect(parsed(schema, '  Asha ')).toBe('Asha');
    expect(messages(schema, '   ')).toEqual(['This is required']);
    expect(messages(schema, 'abcdef')).toEqual(['Keep this to 5 characters or fewer']);
  });

  it('optional allows blank but still caps the length', () => {
    const schema = rules.optional(t, 3);
    expect(parsed(schema, '')).toBe('');
    expect(parsed(schema, 'abc')).toBe('abc');
    expect(messages(schema, 'abcd')).toEqual(['Keep this to 3 characters or fewer']);
  });
});

describe('rules.optionalUrl', () => {
  const schema = rules.optionalUrl(t);

  it('allows a blank box or a full http(s) link', () => {
    expect(parsed(schema, '')).toBe('');
    expect(parsed(schema, ' https://meet.example/abc ')).toBe('https://meet.example/abc');
  });

  it('refuses a bare host or another scheme', () => {
    expect(messages(schema, 'meet.example/abc')).toEqual(['Enter a full link starting with http:// or https://']);
    expect(messages(schema, 'ftp://files.example')).toEqual(['Enter a full link starting with http:// or https://']);
  });

  it('refuses a link longer than 2048 characters', () => {
    expect(messages(schema, `https://x.example/${'a'.repeat(2048)}`)).toContain('Keep this to 2048 characters or fewer');
  });
});

describe('rules.optionalUpi', () => {
  const schema = rules.optionalUpi(t);

  it('allows blank and lower-cases a valid UPI ID', () => {
    expect(parsed(schema, '')).toBe('');
    expect(parsed(schema, 'Asha.Rao@OKAXIS')).toBe('asha.rao@okaxis');
  });

  it('refuses an ID without a bank handle', () => {
    expect(messages(schema, 'asha')).toEqual(['Enter a valid UPI ID, like name@bank']);
    expect(messages(schema, 'asha@ok')).toEqual(['Enter a valid UPI ID, like name@bank']);
  });
});

describe('rules.handle', () => {
  const schema = rules.handle(t);
  const invalid = 'A handle is 3 to 30 lowercase letters, numbers or underscores';

  it('lower-cases a valid handle and accepts underscores inside it', () => {
    expect(parsed(schema, 'Asha_Rao')).toBe('asha_rao');
    expect(parsed(schema, 'a'.repeat(30))).toBe('a'.repeat(30));
  });

  it('refuses one or two characters, 31 characters, and an underscore at either end', () => {
    expect(messages(schema, 'a')).toEqual([invalid]);
    expect(messages(schema, 'ab')).toEqual([invalid]);
    expect(messages(schema, 'a'.repeat(31))).toEqual([invalid]);
    expect(messages(schema, '_asha')).toEqual([invalid]);
    expect(messages(schema, 'asha_')).toEqual([invalid]);
    expect(messages(schema, 'asha.rao')).toEqual([invalid]);
  });
});

describe('rules.socialHandle', () => {
  const schema = rules.socialHandle(t);

  it('keeps a handle typed with or without the leading @', () => {
    expect(parsed(schema, '@asha.rao')).toBe('asha.rao');
    expect(parsed(schema, ' asha_rao ')).toBe('asha_rao');
    expect(parsed(schema, '')).toBe('');
  });

  it('refuses a pasted link', () => {
    expect(messages(schema, 'https://instagram.com/asha')).toEqual(['Enter just the handle, without the full link']);
    expect(messages(schema, 'instagram.com/asha')).toEqual(['Enter just the handle, without the full link']);
  });
});

describe('rules.slug', () => {
  const schema = rules.slug(t);
  const invalid = 'Use lowercase letters, numbers and hyphens only';

  it('lower-cases a valid link of 3 to 80 characters', () => {
    expect(parsed(schema, 'Summer-Fest-2026')).toBe('summer-fest-2026');
    expect(parsed(schema, 'abc')).toBe('abc');
    expect(parsed(schema, 'a'.repeat(80))).toBe('a'.repeat(80));
  });

  it('refuses too short, too long, spaces and stray hyphens', () => {
    expect(messages(schema, 'ab')).toEqual([invalid]);
    expect(messages(schema, 'a'.repeat(81))).toEqual([invalid]);
    expect(messages(schema, 'summer fest')).toEqual([invalid]);
    expect(messages(schema, 'summer--fest')).toEqual([invalid]);
    expect(messages(schema, '-summer')).toEqual([invalid]);
  });
});

describe('blankToNull and digitsToNumber', () => {
  it('turns a blank box into null and trims everything else', () => {
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull(' Lodhi Garden ')).toBe('Lodhi Garden');
  });

  it('reads digits as a number and a blank box as null', () => {
    expect(digitsToNumber('')).toBeNull();
    expect(digitsToNumber('  ')).toBeNull();
    expect(digitsToNumber(' 120 ')).toBe(120);
    expect(digitsToNumber('007')).toBe(7);
  });
});
