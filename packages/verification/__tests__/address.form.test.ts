/**
 * The address form is where mWeb and the app disagreed most: one validated on
 * submit against a hand-written list of required fields, the other through a
 * Zod schema. These pin both answers to the same rules.
 */
import { describe, expect, it } from 'vitest';

import {
  ADDRESS_FIELDS,
  ADDRESS_ROWS,
  addressValuesFrom,
  blankAddressValues,
  buildAddressInput,
  isAddressComplete,
  makeAddressSchema,
  type AddressValues,
} from '../src';

/** A translator that hands back the key, so a message failure names its key. */
const t = (key: string) => key;

const filled: AddressValues = {
  line1: '  12 Turner Road  ',
  line2: ' Flat 4B ',
  city: ' Mumbai ',
  state: ' Maharashtra ',
  pincode: ' 400050 ',
  country: ' India ',
};

describe('blankAddressValues', () => {
  it('starts every field as a string, because RN inputs are', () => {
    expect(Object.values(blankAddressValues).every((v) => v === '')).toBe(true);
  });
});

describe('addressValuesFrom', () => {
  it('seeds the form from what the account already submitted', () => {
    const values = addressValuesFrom({
      address: {
        line1: '12 Turner Road',
        line2: null,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        country: null,
      },
    });
    expect(values).toEqual({
      line1: '12 Turner Road',
      line2: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: '',
    });
  });

  it('falls back to blanks when nothing was submitted', () => {
    expect(addressValuesFrom({ address: null })).toEqual(blankAddressValues);
  });
});

describe('makeAddressSchema', () => {
  it('accepts a complete address and trims it', () => {
    const parsed = makeAddressSchema(t).parse(filled);
    expect(parsed.line1).toBe('12 Turner Road');
    expect(parsed.city).toBe('Mumbai');
  });

  it('accepts blank line2 and country — both are optional', () => {
    const parsed = makeAddressSchema(t).parse({ ...filled, line2: '', country: '' });
    expect(parsed.line2).toBe('');
    expect(parsed.country).toBe('');
  });

  it('names the missing field with a localized key, one per required field', () => {
    const result = makeAddressSchema(t).safeParse({
      ...blankAddressValues,
      line2: '',
      country: '',
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toEqual(
      expect.arrayContaining([
        'verification.line1Required',
        'verification.cityRequired',
        'verification.stateRequired',
        'verification.pincodeRequired',
      ]),
    );
  });

  it('rejects whitespace-only input, which a min(1) on the raw string would pass', () => {
    const result = makeAddressSchema(t).safeParse({ ...blankAddressValues, line1: '   ' });
    expect(result.success).toBe(false);
  });
});

describe('isAddressComplete', () => {
  it('is true when the four required fields carry text', () => {
    expect(isAddressComplete(filled)).toBe(true);
  });

  it('is false when any required field is blank or whitespace', () => {
    expect(isAddressComplete({ ...filled, line1: '' })).toBe(false);
    expect(isAddressComplete({ ...filled, city: '   ' })).toBe(false);
    expect(isAddressComplete({ ...filled, state: '' })).toBe(false);
    expect(isAddressComplete({ ...filled, pincode: '' })).toBe(false);
  });

  it('ignores the optional fields', () => {
    expect(isAddressComplete({ ...filled, line2: '', country: '' })).toBe(true);
  });

  it('agrees with the schema on the same values', () => {
    const values = { ...filled, pincode: '  ' };
    expect(isAddressComplete(values)).toBe(false);
    expect(makeAddressSchema(t).safeParse(values).success).toBe(false);
  });
});

describe('buildAddressInput', () => {
  it('trims every field on the way to the server', () => {
    expect(buildAddressInput(filled)).toEqual({
      line1: '12 Turner Road',
      line2: 'Flat 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India',
    });
  });

  it('drops the optional fields rather than sending an empty string', () => {
    const input = buildAddressInput({ ...filled, line2: '  ', country: '' });
    expect(input.line2).toBeUndefined();
    expect(input.country).toBeUndefined();
  });
});

describe('ADDRESS_FIELDS', () => {
  it('describes every value the form holds, exactly once', () => {
    const names = ADDRESS_FIELDS.map((f) => f.name).sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(['city', 'country', 'line1', 'line2', 'pincode', 'state']);
  });

  it('marks the same four fields required that the schema enforces', () => {
    const required = ADDRESS_FIELDS.filter((f) => f.required).map((f) => f.name);
    expect(required.sort((a, b) => a.localeCompare(b))).toEqual([
      'city',
      'line1',
      'pincode',
      'state',
    ]);
  });

  it('carries a label and a placeholder key for every field', () => {
    for (const field of ADDRESS_FIELDS) {
      expect(field.labelKey.startsWith('verification.')).toBe(true);
      expect(field.placeholderKey.startsWith('verification.')).toBe(true);
    }
  });
});

describe('ADDRESS_ROWS', () => {
  it('lays out every field exactly once, in the order ADDRESS_FIELDS declares', () => {
    const laidOut = ADDRESS_ROWS.flat().map((f) => f.name);
    expect(laidOut).toEqual(ADDRESS_FIELDS.map((f) => f.name));
  });

  it('runs the address lines full width and pairs the rest', () => {
    expect(ADDRESS_ROWS.map((row) => row.length)).toEqual([1, 1, 2, 2]);
  });
});
