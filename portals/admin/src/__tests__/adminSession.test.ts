import { describe, expect, it } from 'vitest';
import { getAdminDisplayName, type AdminSessionUser } from '../adminSession';

const admin = (over: Partial<AdminSessionUser> = {}): AdminSessionUser => ({
  user_id: 'u-admin-1',
  first_name: 'Asha',
  last_name: 'Rao',
  full_name: 'Asha Rao',
  email: 'asha.rao@duncit.com',
  ...over,
});

describe('getAdminDisplayName', () => {
  it('prefers the stored full name', () => {
    expect(getAdminDisplayName(admin({ full_name: 'Asha R.' }))).toBe('Asha R.');
  });

  it('joins first and last name when no full name was stored', () => {
    expect(getAdminDisplayName(admin({ full_name: null }))).toBe('Asha Rao');
  });

  it('uses whichever half of the name exists', () => {
    expect(getAdminDisplayName(admin({ full_name: '', last_name: null }))).toBe('Asha');
    expect(getAdminDisplayName(admin({ full_name: '', first_name: null }))).toBe('Rao');
  });

  it('falls back to the email for an account with no name at all', () => {
    expect(getAdminDisplayName(admin({ full_name: null, first_name: null, last_name: null }))).toBe(
      'asha.rao@duncit.com',
    );
  });

  it('says "Admin" before the session has loaded, or when there is nothing to show', () => {
    expect(getAdminDisplayName(undefined)).toBe('Admin');
    expect(getAdminDisplayName(null)).toBe('Admin');
    expect(
      getAdminDisplayName(admin({ full_name: null, first_name: null, last_name: null, email: null })),
    ).toBe('Admin');
  });
});
