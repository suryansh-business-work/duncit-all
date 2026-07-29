import { contactNumber, userContactNumber } from '@utils/contact';

describe('contactNumber', () => {
  it('prefixes a bare dialling code so every surface renders one dialable form', () => {
    // extRegex (/^\+?\d{1,5}$/) accepts "91" as readily as "+91", so both shapes
    // exist in the user collection and must not render differently.
    expect(contactNumber('91', '9876543210')).toBe('+91 9876543210');
    expect(contactNumber('+91', '9876543210')).toBe('+91 9876543210');
  });

  it('returns the bare number when no dialling code is stored', () => {
    expect(contactNumber('', '9876543210')).toBe('9876543210');
    expect(contactNumber(null, '9876543210')).toBe('9876543210');
    expect(contactNumber(undefined, '9876543210')).toBe('9876543210');
  });

  it('is null without a number — a dialling code alone is not a phone number', () => {
    expect(contactNumber('+91', '')).toBeNull();
    expect(contactNumber('+91', null)).toBeNull();
    expect(contactNumber('+91', undefined)).toBeNull();
  });

  it('trims stored whitespace on both parts', () => {
    expect(contactNumber('  +91 ', ' 9876543210 ')).toBe('+91 9876543210');
  });
});

describe('userContactNumber', () => {
  it('reads the phone subdoc off a user document', () => {
    expect(userContactNumber({ auth: { phone: { extension: '91', number: '9876543210' } } })).toBe(
      '+91 9876543210',
    );
  });

  it('is null for a user with no phone on file, and for no user at all', () => {
    expect(userContactNumber({ auth: { email: 'a@b.com' } })).toBeNull();
    expect(userContactNumber({})).toBeNull();
    expect(userContactNumber(null)).toBeNull();
    expect(userContactNumber(undefined)).toBeNull();
  });
});
