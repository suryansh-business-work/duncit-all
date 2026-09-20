/**
 * The Club Admin's by-name mark, as the contract the MUI dialog and the native
 * sheet share. Every assertion is on a KEY: a literal sentence reappearing
 * here is the regression.
 */
import { describe, expect, it } from 'vitest';
import { mwebAttendanceLabels } from '@duncit/utils';

import { forceMarkInitialValues, makeForceMarkSchema } from '../src/schemas';

const labels = mwebAttendanceLabels((key) => key);
const schema = makeForceMarkSchema(labels);

type Companion = { name: string; phone_extension: string; phone_number: string };

const messagesFor = (companion: Companion) => {
  const result = schema.safeParse({ companions: [companion] });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('forceMarkInitialValues', () => {
  it('opens one blank row per seat still unaccounted for, on the default dial code', () => {
    expect(forceMarkInitialValues(2)).toEqual({
      companions: [
        { name: '', phone_extension: '+91', phone_number: '' },
        { name: '', phone_extension: '+91', phone_number: '' },
      ],
    });
  });

  it('never opens a negative number of rows', () => {
    expect(forceMarkInitialValues(-3)).toEqual({ companions: [] });
  });
});

describe('makeForceMarkSchema', () => {
  it('lets a row the admin was told nothing about stay blank', () => {
    expect(messagesFor({ name: '', phone_extension: '  ', phone_number: '' })).toEqual([]);
  });

  it('accepts a usable name and number, trimming the name', () => {
    const typed = { name: '  Ravi ', phone_extension: '+91', phone_number: '9876543210' };
    expect(schema.parse({ companions: [typed] })).toEqual({
      companions: [{ name: 'Ravi', phone_extension: '+91', phone_number: '9876543210' }],
    });
  });

  it('refuses a one-letter name with the shared key', () => {
    expect(messagesFor({ name: 'R', phone_extension: '', phone_number: '' })).toEqual([
      'mweb.attendance.otpNameRequired',
    ]);
  });

  it('refuses a malformed dial code or half a phone number with their keys', () => {
    expect(messagesFor({ name: '', phone_extension: 'abc', phone_number: '12' })).toEqual([
      'mweb.attendance.otpExtensionInvalid',
      'mweb.attendance.otpPhoneInvalid',
    ]);
  });
});
