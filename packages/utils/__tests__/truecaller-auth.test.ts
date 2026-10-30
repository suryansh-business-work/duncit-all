import { describe, expect, it } from 'vitest';

import {
  readTruecallerSignupProof,
  TRUECALLER_COPY,
  TRUECALLER_SIGNUP_STATE_KEY,
  TRUECALLER_WEB_POLL_MS,
  TRUECALLER_WEB_TIMEOUT_MS,
  truecallerDetailsShortcut,
  truecallerSignupPrefill,
  truecallerTokenFor,
  type TruecallerSignupProof,
} from '../src/truecaller-auth';

const proof: TruecallerSignupProof = {
  whatsapp_token: 'otp123.secret',
  phone_extension: '+91',
  phone_number: '9845012345',
  first_name: 'Riya',
  last_name: 'Sharma',
  email: 'riya@example.com',
};

describe('readTruecallerSignupProof', () => {
  it('reads a whole proof back off navigation state', () => {
    expect(readTruecallerSignupProof({ ...proof })).toEqual(proof);
  });

  it('treats anything that is not an object as no proof', () => {
    expect(readTruecallerSignupProof(undefined)).toBeNull();
    expect(readTruecallerSignupProof(null)).toBeNull();
    expect(readTruecallerSignupProof('otp123.secret')).toBeNull();
  });

  it('refuses a proof missing its token or either half of the number', () => {
    expect(readTruecallerSignupProof({ ...proof, whatsapp_token: '' })).toBeNull();
    expect(readTruecallerSignupProof({ ...proof, phone_extension: undefined })).toBeNull();
    expect(readTruecallerSignupProof({ ...proof, phone_number: 9845012345 })).toBeNull();
  });

  it('blanks the optional fields that arrive as something other than text', () => {
    const read = readTruecallerSignupProof({ ...proof, first_name: 42, last_name: null, email: {} });
    expect(read).toEqual({ ...proof, first_name: '', last_name: '', email: '' });
  });
});

describe('truecallerSignupPrefill', () => {
  it('starts the form from the name, address and proven number, as the mobile number', () => {
    expect(truecallerSignupPrefill(proof)).toEqual({
      name: 'Riya Sharma',
      email: 'riya@example.com',
      phoneExtension: '+91',
      phoneNumber: '9845012345',
      whatsappIsMobile: true,
    });
  });

  it('does not leave a trailing space when Truecaller has no surname', () => {
    expect(truecallerSignupPrefill({ ...proof, last_name: '' }).name).toBe('Riya');
  });
});

describe('truecallerTokenFor', () => {
  const fields = { phoneExtension: '+91', phoneNumber: '9845012345', whatsappIsMobile: true };

  it('hands back the token when the form signs up with the proven number', () => {
    expect(truecallerTokenFor(proof, fields)).toBe('otp123.secret');
  });

  it('ignores spacing and the plus sign when comparing the number', () => {
    expect(truecallerTokenFor(proof, { ...fields, phoneExtension: '91', phoneNumber: '98450 12345' })).toBe(
      'otp123.secret',
    );
  });

  it('asks for a code again once the number or the country code was changed', () => {
    expect(truecallerTokenFor(proof, { ...fields, phoneNumber: '9845012346' })).toBeNull();
    expect(truecallerTokenFor(proof, { ...fields, phoneExtension: '+1' })).toBeNull();
  });

  it('has nothing to offer without a proof', () => {
    expect(truecallerTokenFor(null, fields)).toBeNull();
  });
});

describe('truecallerDetailsShortcut', () => {
  const google = { idToken: 'apple-token', policyIds: ['p1'], provider: 'APPLE' as const };
  const details = {
    phoneExtension: '+91',
    phoneNumber: '9845012345',
    whatsappIsMobile: false,
    dob: '1999-04-01',
    ageConfirmed: true,
    name: '  Riya Sharma ',
  };

  it('creates the Google/Apple account straight away for the proven number, with the asked name', () => {
    expect(truecallerDetailsShortcut(proof, details, google)).toEqual({
      token: 'otp123.secret',
      google: { ...google, name: 'Riya Sharma' },
      number: { extension: '+91', number: '9845012345', alsoMobile: false },
      dob: '1999-04-01',
      ageConfirmed: true,
    });
  });

  it('keeps the credential as it is when the step asked no name', () => {
    expect(truecallerDetailsShortcut(proof, { ...details, name: '' }, google)?.google).toBe(google);
  });

  it('falls back to the code step for another number or without a held credential', () => {
    expect(truecallerDetailsShortcut(proof, { ...details, phoneNumber: '9000000000' }, google)).toBeNull();
    expect(truecallerDetailsShortcut(proof, details, null)).toBeNull();
  });
});

describe('Truecaller constants', () => {
  it('names the navigation key and waits longer than it polls', () => {
    expect(TRUECALLER_SIGNUP_STATE_KEY).toBe('truecallerSignup');
    expect(TRUECALLER_WEB_TIMEOUT_MS).toBeGreaterThan(TRUECALLER_WEB_POLL_MS);
  });

  it('keeps every copy key literal so the translation gate can find it', () => {
    for (const key of Object.values(TRUECALLER_COPY)) {
      expect(key).toMatch(/^mweb\.(auth|signupSteps)\.truecaller[A-Z]\w+$/);
    }
  });
});
