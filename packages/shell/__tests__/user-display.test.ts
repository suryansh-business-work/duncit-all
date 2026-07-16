import { describe, it, expect } from 'vitest';
import type { DuncitUser } from '@duncit/user-context';
import { accountName, accountEmail, initials } from '../src/chrome/user-display';

describe('accountName', () => {
  it('prefers full_name', () => {
    expect(accountName({ full_name: 'Ada Lovelace' } as DuncitUser, 'Portal')).toBe('Ada Lovelace');
  });

  it('joins first + last when there is no full_name', () => {
    expect(accountName({ first_name: 'Ada', last_name: 'Lovelace' } as DuncitUser, 'Portal')).toBe('Ada Lovelace');
  });

  it('falls back to email, then to the fallback', () => {
    expect(accountName({ email: 'ada@x.test' } as DuncitUser, 'Portal')).toBe('ada@x.test');
    expect(accountName(null, 'Portal')).toBe('Portal');
  });
});

describe('accountEmail', () => {
  it('returns the email or an empty string', () => {
    expect(accountEmail({ email: 'ada@x.test' } as DuncitUser)).toBe('ada@x.test');
    expect(accountEmail(null)).toBe('');
  });
});

describe('initials', () => {
  it('derives up to two upper-cased initials', () => {
    expect(initials({ full_name: 'Ada Lovelace' } as DuncitUser, 'Portal')).toBe('AL');
  });

  it('handles a single-word name', () => {
    expect(initials({ full_name: 'Madonna' } as DuncitUser, 'Portal')).toBe('M');
  });

  it('uses the fallback initial when the name resolves to empty', () => {
    expect(initials(null, 'Zeta')).toBe('Z');
    expect(initials(null, '')).toBe('');
  });
});
