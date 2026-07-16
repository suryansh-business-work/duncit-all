import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  zodRules,
  validationRules,
  optionalText,
  requiredText,
  optionalUrl,
} from '../src/zodRules';

const msg = (schema: z.ZodTypeAny, value: unknown): string | undefined => {
  const r = schema.safeParse(value);
  return r.success ? undefined : r.error.issues[0].message;
};

describe('zodRules.email', () => {
  it('requires a value and lowercases/trims valid input', () => {
    expect(msg(zodRules.email(), '')).toBe('Email is required');
    expect(zodRules.email().parse('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });

  it('rejects a malformed email (format checked first by default)', () => {
    expect(msg(zodRules.email(), 'nope')).toBe('Enter a valid email');
  });

  it('reports too-long for a valid-format but over-254 email (default order)', () => {
    const longEmail = `${'a'.repeat(250)}@ex.com`;
    expect(msg(zodRules.email(), longEmail)).toBe('Email is too long');
  });

  it('with lengthFirst checks max before format and honors a custom label', () => {
    const schema = zodRules.email('Work Email', { lengthFirst: true });
    expect(msg(schema, 'x'.repeat(300))).toBe('Work Email is too long');
    expect(msg(schema, 'bad')).toBe('Enter a valid work email');
  });
});

describe('zodRules.password', () => {
  it('enforces min 8 and max 128 with the default label', () => {
    expect(msg(zodRules.password(), 'short')).toBe('Password must be at least 8 characters');
    expect(msg(zodRules.password(), 'x'.repeat(129))).toBe('Password is too long');
    expect(zodRules.password().parse('longenough')).toBe('longenough');
  });

  it('with required prepends a min(1) required check', () => {
    expect(msg(zodRules.password('Pass', { required: true }), '')).toBe('Pass is required');
  });

  it('with requiredError uses required_error for an undefined value', () => {
    expect(msg(zodRules.password('Pass', { requiredError: true }), undefined)).toBe(
      'Pass is required',
    );
  });
});

describe('zodRules.personName', () => {
  it('requires a value, enforces the character set, and passes valid names', () => {
    expect(msg(zodRules.personName('First name'), '')).toBe('First name is required');
    expect(msg(zodRules.personName('First name'), 'A1')).toBe(
      "First name can use letters, spaces, apostrophes, periods and hyphens only",
    );
    expect(zodRules.personName('First name').parse('Mary Jane')).toBe('Mary Jane');
  });
});

describe('optionalText', () => {
  it('trims and caps length', () => {
    expect(msg(optionalText('Bio', 5), 'toolong')).toBe('Bio must be 5 characters or fewer');
    expect(optionalText('Bio', 20).parse('  hi ')).toBe('hi');
  });

  it('with defaultEmpty parses undefined to an empty string', () => {
    expect(optionalText('Bio', 20, { defaultEmpty: true }).parse(undefined)).toBe('');
  });
});

describe('requiredText', () => {
  it('enforces min and max', () => {
    expect(msg(requiredText('Note', 3, 10), 'hi')).toBe('Note must be at least 3 characters');
    expect(msg(requiredText('Note', 3, 10), 'x'.repeat(11))).toBe(
      'Note must be 10 characters or fewer',
    );
    expect(requiredText('Note', 3, 10).parse('hello')).toBe('hello');
  });
});

describe('zodRules.optionalEmail', () => {
  it('accepts empty string, lowercases valid emails, and rejects invalid input', () => {
    expect(zodRules.optionalEmail().parse('')).toBe('');
    expect(zodRules.optionalEmail('Alt Email').parse('User@Mail.COM')).toBe('user@mail.com');
    expect(zodRules.optionalEmail().safeParse('nope').success).toBe(false);
  });
});

describe('zodRules.phoneNumber / phoneExtension', () => {
  it('validates phone numbers', () => {
    expect(zodRules.phoneNumber().parse('9876543210')).toBe('9876543210');
    expect(msg(zodRules.phoneNumber('Mobile'), '12')).toBe(
      'Mobile must contain only digits (6-15 digits)',
    );
  });

  it('validates phone extensions', () => {
    expect(zodRules.phoneExtension().parse('+91')).toBe('+91');
    expect(msg(zodRules.phoneExtension('Code'), 'abc')).toBe('Code is invalid');
  });
});

describe('optionalUrl / isValidUrl branches', () => {
  it('passes blank input and valid absolute urls', () => {
    expect(optionalUrl('Site').parse('')).toBe('');
    expect(optionalUrl('Site').parse('https://duncit.com')).toBe('https://duncit.com');
  });

  it('rejects disallowed protocols and malformed urls', () => {
    expect(msg(optionalUrl('Site'), 'ftp://x.com')).toBe('Site must be a valid URL');
    expect(msg(optionalUrl('Site'), 'not a url')).toBe('Site must be a valid URL');
  });

  it('rejects a relative path when relatives are not allowed', () => {
    expect(msg(optionalUrl('Site', false), '/dashboard')).toBe('Site must be a valid URL');
  });

  it('accepts a relative path when allowRelative is true', () => {
    expect(optionalUrl('Site', true).parse('/dashboard')).toBe('/dashboard');
  });

  it('still parses absolute urls when allowRelative is true', () => {
    expect(optionalUrl('Site', true).parse('https://x.com')).toBe('https://x.com');
  });

  it('with defaultEmpty parses undefined to an empty string', () => {
    expect(optionalUrl('Site', false, { defaultEmpty: true }).parse(undefined)).toBe('');
    expect(optionalUrl('Site', true, { defaultEmpty: true }).parse('/x')).toBe('/x');
  });
});

describe('rule aliases', () => {
  it('exposes validationRules as an alias of zodRules', () => {
    expect(validationRules).toBe(zodRules);
    expect(typeof zodRules.optionalUrl).toBe('function');
  });
});
