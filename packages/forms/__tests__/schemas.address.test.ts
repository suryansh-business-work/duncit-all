import { describe, expect, it } from 'vitest';

import { blankAddress, makeAddressSchema } from '../src/schemas/address';

/** Messages come back as their keys, so a rule is asserted by WHICH one fired. */
const t = (key: string) => key;

const schema = makeAddressSchema(t);

const valid = {
  label: 'Home',
  name: 'Riya Sharma',
  phone: '+91 98450 12345',
  line1: '221B, Indiranagar 2nd Stage',
  line2: 'Above the bakery',
  landmark: 'Opposite Metro Pillar 42',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

const errorsOf = (input: Record<string, unknown>) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('the one address contract', () => {
  it('accepts a complete, valid address', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('ships an empty address that defaults to the market it serves', () => {
    expect(blankAddress.country).toBe('India');
    expect(blankAddress.label).toBe('');
    expect(blankAddress.pincode).toBe('');
  });
});

describe('the parts an address cannot go out without', () => {
  it('needs a label, a street, a city and a state', () => {
    expect(errorsOf({ ...valid, label: '' })).toContain('mweb.address.validation.labelRequired');
    expect(errorsOf({ ...valid, line1: '' })).toContain('mweb.address.validation.line1Required');
    expect(errorsOf({ ...valid, city: '' })).toContain('mweb.address.validation.cityRequired');
    expect(errorsOf({ ...valid, state: '' })).toContain('mweb.address.validation.stateRequired');
  });

  it('trims before it judges, so a box of spaces is still empty', () => {
    expect(errorsOf({ ...valid, city: '   ' })).toContain('mweb.address.validation.cityRequired');
  });
});

describe('the recipient, which neither surface used to check at all', () => {
  it('leaves the name optional', () => {
    expect(schema.safeParse({ ...valid, name: '' }).success).toBe(true);
  });

  it('refuses a name that cannot be one', () => {
    expect(errorsOf({ ...valid, name: 'Riya 99' })).toContain(
      'mweb.address.validation.nameInvalid',
    );
  });

  it('leaves the number optional', () => {
    expect(schema.safeParse({ ...valid, phone: '' }).success).toBe(true);
  });

  it('judges a pasted number on its digits, not its spacing', () => {
    // The whole point of reading it through toDigits: a courier form pastes
    // "+91 98450 12345" and the spaces are not the customer's mistake.
    expect(schema.safeParse({ ...valid, phone: '+91 98450 12345' }).success).toBe(true);
    expect(schema.safeParse({ ...valid, phone: '9845012345' }).success).toBe(true);
  });

  it('still refuses something that is not a number', () => {
    expect(errorsOf({ ...valid, phone: 'call me' })).toContain(
      'mweb.address.validation.phoneInvalid',
    );
  });
});

describe('the postal code', () => {
  it('takes an Indian PIN', () => {
    expect(schema.safeParse({ ...valid, pincode: '560038' }).success).toBe(true);
  });

  it('takes a shorter non-Indian one, which is why the loose rule is used', () => {
    expect(schema.safeParse({ ...valid, pincode: '1010' }).success).toBe(true);
  });

  it('refuses a blank or malformed code', () => {
    expect(errorsOf({ ...valid, pincode: '' })).toContain(
      'mweb.address.validation.pincodeInvalid',
    );
    expect(errorsOf({ ...valid, pincode: 'SW1A 1AA' })).toContain(
      'mweb.address.validation.pincodeInvalid',
    );
  });
});

describe('the optional lines', () => {
  it('lets line 2, the landmark and the country be left blank', () => {
    const bare = { ...valid, line2: '', landmark: '', country: '' };
    expect(schema.safeParse(bare).success).toBe(true);
  });
});
