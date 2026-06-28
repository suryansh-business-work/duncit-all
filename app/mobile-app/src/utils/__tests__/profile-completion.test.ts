import { COMPLETION_FIELDS, profileCompletion } from '@/utils/profile-completion';

describe('profileCompletion', () => {
  it('is 0% for an empty profile', () => {
    expect(profileCompletion({})).toBe(0);
  });

  it('is 100% when every meaningful field is filled', () => {
    const full = Object.fromEntries(COMPLETION_FIELDS.map((f) => [f, 'x']));
    expect(profileCompletion(full)).toBe(100);
  });

  it('rounds the percentage of filled fields and ignores blanks/null/undefined', () => {
    // 8 of 10 fields filled → 80%; whitespace, null and undefined do not count.
    expect(
      profileCompletion({
        first_name: 'Jane',
        last_name: 'Doe',
        bio: 'Hi',
        dob: '1990-01-02',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        phone_number: '9876543210',
        whatsapp_number: '   ',
        profile_photo: null,
      }),
    ).toBe(80);
  });

  it('counts a single filled field as 10%', () => {
    expect(profileCompletion({ first_name: 'Jane' })).toBe(10);
  });
});
