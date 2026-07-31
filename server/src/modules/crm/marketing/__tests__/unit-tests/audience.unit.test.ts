import { toAudienceRow, yearsSince } from '../../audience.service';

describe('yearsSince', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

  it('is null without a birthdate', () => {
    expect(yearsSince(null)).toBeNull();
    expect(yearsSince(undefined)).toBeNull();
  });

  it('counts whole years only once the birthday has passed', () => {
    const justTurned = new Date();
    justTurned.setFullYear(justTurned.getFullYear() - 30);
    justTurned.setDate(justTurned.getDate() - 1);
    expect(yearsSince(justTurned)).toBe(30);

    // Birthday is later this month: still 29.
    const notYet = new Date();
    notYet.setFullYear(notYet.getFullYear() - 30);
    notYet.setDate(notYet.getDate() + 2);
    expect(yearsSince(notYet)).toBe(29);
  });

  it('handles the birthday month being later in the year', () => {
    const laterMonth = new Date();
    laterMonth.setFullYear(laterMonth.getFullYear() - 40);
    laterMonth.setMonth(laterMonth.getMonth() + 3);
    expect(yearsSince(laterMonth)).toBe(39);
  });

  // A typo'd future birthdate is not a negative age.
  it('is null for a birthdate in the future', () => {
    expect(yearsSince(daysAgo(-400))).toBeNull();
  });
});

describe('toAudienceRow', () => {
  it('maps a fully populated account', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 26);
    dob.setMonth(dob.getMonth() - 1);

    expect(
      toAudienceRow({
        _id: 'u1',
        profile: {
          first_name: 'Ravi',
          last_name: 'Kumar',
          dob,
          city: 'Pune',
          state: 'MH',
          zone: 'West',
          pincode: '411001',
          country: 'India',
          locale: 'en-IN',
        },
        auth: {
          email: 'ravi@x.com',
          is_email_verified: true,
          phone: { number: '9999999999', is_verified: true },
          last_login_provider: 'GOOGLE',
          last_login_at: new Date('2026-05-01T00:00:00.000Z'),
        },
        communication: { whatsapp: { verified_at: new Date('2026-04-01T00:00:00.000Z') } },
        metadata: {
          status: 'ACTIVE',
          role_keys: ['USER', 'HOST'],
          created_at: new Date('2026-01-01T00:00:00.000Z'),
        },
      }),
    ).toEqual({
      id: 'u1',
      full_name: 'Ravi Kumar',
      email: 'ravi@x.com',
      phone: '9999999999',
      age: 26,
      city: 'Pune',
      state: 'MH',
      zone: 'West',
      pincode: '411001',
      country: 'India',
      locale: 'en-IN',
      status: 'ACTIVE',
      roles: ['USER', 'HOST'],
      email_verified: true,
      phone_verified: true,
      whatsapp_reachable: true,
      last_login_provider: 'GOOGLE',
      last_login_at: '2026-05-01T00:00:00.000Z',
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });

  // Accounts predating the communication subdoc, and Google signups with no
  // phone or birthdate, really do arrive this sparse.
  it('maps an account carrying nothing but an id', () => {
    expect(toAudienceRow({ _id: 'u2' })).toEqual({
      id: 'u2',
      full_name: '',
      email: null,
      phone: null,
      age: null,
      city: null,
      state: null,
      zone: null,
      pincode: null,
      country: null,
      locale: null,
      status: null,
      roles: [],
      email_verified: false,
      phone_verified: false,
      whatsapp_reachable: false,
      last_login_provider: null,
      last_login_at: null,
      created_at: null,
    });
  });

  it('joins a single-word name without a trailing space', () => {
    expect(toAudienceRow({ _id: 'u3', profile: { first_name: 'Cher' } }).full_name).toBe('Cher');
  });
});
