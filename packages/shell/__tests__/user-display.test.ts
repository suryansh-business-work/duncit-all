import { describe, it, expect } from 'vitest';
import type { DuncitUser } from '@duncit/user-context';
import { accountName, accountEmail, initials } from '../src/chrome/user-display';

// The helpers delegate to `@duncit/user-core`, whose `normalizeMe` treats an
// object without a `user_id` as "no session" — so every fixture carries one.
const user = (over: Partial<DuncitUser>): DuncitUser => ({ user_id: 'u1', ...over }) as DuncitUser;

describe('accountName', () => {
  it('prefers full_name', () => {
    expect(accountName(user({ full_name: 'Ada Lovelace' }), 'Portal')).toBe('Ada Lovelace');
  });

  it('joins first + last when there is no full_name', () => {
    expect(accountName(user({ first_name: 'Ada', last_name: 'Lovelace' }), 'Portal')).toBe('Ada Lovelace');
  });

  it('falls back to email, then to the fallback', () => {
    expect(accountName(user({ email: 'ada@x.test' }), 'Portal')).toBe('ada@x.test');
    expect(accountName(null, 'Portal')).toBe('Portal');
  });

  it('treats an object with no user_id as no session at all', () => {
    expect(accountName({ full_name: 'Ghost' } as DuncitUser, 'Portal')).toBe('Portal');
  });
});

describe('accountEmail', () => {
  it('returns the email or an empty string', () => {
    expect(accountEmail(user({ email: 'ada@x.test' }))).toBe('ada@x.test');
    expect(accountEmail(user({ email: null }))).toBe('');
    expect(accountEmail(null)).toBe('');
  });
});

describe('initials', () => {
  it('derives up to two upper-cased initials from first + last name', () => {
    expect(initials(user({ first_name: 'ada', last_name: 'lovelace' }), 'Portal')).toBe('AL');
  });

  it('falls back to the first letter of the display name when the parts are missing', () => {
    // "Asha Kumari Rao" is why the parts win over the words of the display
    // name — but with no parts at all, the first letter of the name is it.
    expect(initials(user({ full_name: 'Ada Lovelace' }), 'Portal')).toBe('A');
    expect(initials(user({ full_name: 'Madonna' }), 'Portal')).toBe('M');
  });

  it('uses the fallback initial when the name resolves to empty', () => {
    expect(initials(null, 'Z')).toBe('Z');
    expect(initials(null, '')).toBe('');
  });
});
