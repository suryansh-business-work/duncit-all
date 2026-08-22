import { describe, expect, it } from 'vitest';

import { accountEmail, accountName, can, canAny, hasAppAccess, initials, normalizeMe } from '../src/derive';

const RAW = {
  user_id: ' u-1 ',
  first_name: ' Asha ',
  last_name: ' Rao ',
  email: '  asha@duncit.com ',
  phone_number: '9000000000',
  phone_extension: '+91',
  profile_photo: 'https://cdn/pic.png',
  bio: 'Plays badminton.',
  roles: ['HOST', 'USER'],
  locale: 'hi-IN',
  timezone: 'Asia/Kolkata',
  country: 'India',
  city: 'Bengaluru',
  state: 'KA',
  zone: 'South',
  assigned_city: 'Bengaluru',
  assigned_zones: ['South', 'East'],
  selected_location_id: 'loc-9',
  is_email_verified: true,
  is_phone_verified: true,
  onboarding_survey_completed: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
};

describe('normalizeMe', () => {
  it('trims every string and keeps the whole session shape', () => {
    expect(normalizeMe(RAW)).toEqual({
      user_id: 'u-1',
      first_name: 'Asha',
      last_name: 'Rao',
      full_name: 'Asha Rao',
      email: 'asha@duncit.com',
      phone_number: '9000000000',
      phone_extension: '+91',
      avatar: 'https://cdn/pic.png',
      bio: 'Plays badminton.',
      roles: ['HOST', 'USER'],
      locale: 'hi-IN',
      timezone: 'Asia/Kolkata',
      country: 'India',
      city: 'Bengaluru',
      state: 'KA',
      zone: 'South',
      assigned_city: 'Bengaluru',
      assigned_zones: ['South', 'East'],
      selected_location_id: 'loc-9',
      is_email_verified: true,
      is_phone_verified: true,
      onboarding_survey_completed: true,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-02-01T00:00:00.000Z',
    });
  });

  it('prefers the server full_name when it has one', () => {
    expect(normalizeMe({ ...RAW, full_name: ' Asha R. ' })?.full_name).toBe('Asha R.');
  });

  it.each([[null], [undefined], ['a string'], [42], [{}], [{ user_id: '  ' }]])(
    'returns null for %j rather than a session with an empty id',
    (raw) => {
      expect(normalizeMe(raw)).toBeNull();
    }
  );

  it('flattens the empty-vs-null traps to null so no surface has to guess', () => {
    const me = normalizeMe({ user_id: 'u-2', email: '', city: '', state: null, profile_photo: '   ' });

    expect(me).toMatchObject({
      email: null,
      city: null,
      state: null,
      zone: null,
      avatar: null,
      bio: null,
      assigned_city: null,
      selected_location_id: null,
      created_at: null,
      updated_at: null,
    });
  });

  it('applies the India / en-IN defaults when the server sends nothing', () => {
    const me = normalizeMe({ user_id: 'u-3' });

    expect(me?.locale).toBe('en-IN');
    expect(me?.country).toBe('India');
    expect(me?.timezone).toBe('');
    expect(me?.full_name).toBe('');
  });

  it('treats absent verification flags as false and anything non-true as false', () => {
    const me = normalizeMe({ user_id: 'u-4', is_email_verified: 'yes', is_phone_verified: 1 });

    expect(me?.is_email_verified).toBe(false);
    expect(me?.is_phone_verified).toBe(false);
  });

  it('routes back into the survey only on an explicit false, never on an absent field', () => {
    expect(normalizeMe({ user_id: 'u-5' })?.onboarding_survey_completed).toBe(true);
    expect(normalizeMe({ user_id: 'u-5', onboarding_survey_completed: null })?.onboarding_survey_completed).toBe(true);
    expect(normalizeMe({ user_id: 'u-5', onboarding_survey_completed: false })?.onboarding_survey_completed).toBe(
      false
    );
  });

  it('coerces role and zone lists to strings and drops the empty entries', () => {
    const me = normalizeMe({ user_id: 'u-6', roles: ['HOST', '', 7], assigned_zones: 'South' });

    expect(me?.roles).toEqual(['HOST', '7']);
    expect(me?.assigned_zones).toEqual([]);
  });
});

describe('accountName', () => {
  const user = normalizeMe(RAW);

  it('prefers the full name', () => {
    expect(accountName(user)).toBe('Asha Rao');
  });

  it('falls back through first name and then email', () => {
    expect(accountName(normalizeMe({ user_id: 'u', first_name: 'Solo' }))).toBe('Solo');
    expect(accountName(normalizeMe({ user_id: 'u', email: 'only@duncit.com' }))).toBe('only@duncit.com');
  });

  it('never returns empty — a signed-out shell still needs a label', () => {
    expect(accountName(null)).toBe('User');
    expect(accountName(normalizeMe({ user_id: 'u' }))).toBe('User');
    expect(accountName(null, 'Guest')).toBe('Guest');
  });
});

describe('accountEmail', () => {
  it('returns the email, or the caller fallback when there is none', () => {
    expect(accountEmail(normalizeMe(RAW))).toBe('asha@duncit.com');
    expect(accountEmail(normalizeMe({ user_id: 'u' }))).toBe('');
    expect(accountEmail(null, 'no email')).toBe('no email');
  });
});

describe('initials', () => {
  it('uses the first letter of each name, upper cased', () => {
    expect(initials(normalizeMe(RAW))).toBe('AR');
  });

  it('uses one letter when only one name is known', () => {
    expect(initials(normalizeMe({ user_id: 'u', first_name: 'asha' }))).toBe('A');
    expect(initials(normalizeMe({ user_id: 'u', last_name: 'rao' }))).toBe('R');
  });

  it('falls back to the display name when there is no first or last name', () => {
    expect(initials(normalizeMe({ user_id: 'u', email: 'zed@duncit.com' }))).toBe('Z');
  });

  it('falls back to the caller letter for a signed-out shell', () => {
    expect(initials(null)).toBe('U');
    expect(initials(null, 'g')).toBe('G');
    expect(initials(normalizeMe({ user_id: 'u' }))).toBe('U');
  });
});

describe('hasAppAccess', () => {
  it('lets any signed-in account into a surface that requires no role', () => {
    expect(hasAppAccess([], [])).toBe(true);
    expect(hasAppAccess(['USER'], [])).toBe(true);
  });

  it('needs one of the required roles otherwise', () => {
    expect(hasAppAccess(['USER', 'HOST'], ['HOST', 'ADMIN'])).toBe(true);
    expect(hasAppAccess(['USER'], ['HOST', 'ADMIN'])).toBe(false);
    expect(hasAppAccess([], ['HOST'])).toBe(false);
  });
});

describe('can / canAny', () => {
  const roles = ['USER', 'HOST'];

  it('can requires every role', () => {
    expect(can(roles, 'USER', 'HOST')).toBe(true);
    expect(can(roles, 'USER', 'ADMIN')).toBe(false);
    expect(can(roles)).toBe(true);
  });

  it('canAny requires one', () => {
    expect(canAny(roles, 'ADMIN', 'HOST')).toBe(true);
    expect(canAny(roles, 'ADMIN')).toBe(false);
    expect(canAny(roles)).toBe(false);
  });
});
