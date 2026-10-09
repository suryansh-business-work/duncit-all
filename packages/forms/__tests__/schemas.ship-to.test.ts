import { describe, expect, it } from 'vitest';

import { makeShipToSchema, shipToValues } from '../src/schemas/ship-to';

/** Messages come back as their keys, so a rule is asserted by WHICH one fired. */
const t = (key: string) => key;

const schema = makeShipToSchema(t);

const valid = {
  name: 'Riya Sharma',
  phone: '+91 98450 12345',
  line1: '221B, Indiranagar 2nd Stage',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

const errorsOf = (input: Record<string, unknown>) => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('a courier ship-to', () => {
  it('accepts a complete Indian address with no label', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('needs the recipient name a courier delivers to', () => {
    expect(errorsOf({ ...valid, name: '  ' })).toContain('mweb.address.validation.nameRequired');
    expect(errorsOf({ ...valid, name: 'Riya 99' })).toContain('mweb.address.validation.nameInvalid');
  });

  it('needs an Indian mobile, judged on its last ten digits', () => {
    expect(schema.safeParse({ ...valid, phone: '9845012345' }).success).toBe(true);
    expect(errorsOf({ ...valid, phone: '' })).toContain('mweb.address.validation.phoneInvalid');
    // Ten digits, but no Indian mobile starts with a 1.
    expect(errorsOf({ ...valid, phone: '1234567890' })).toContain('mweb.address.validation.phoneInvalid');
  });

  it('needs a six-digit PIN, not the loose saved-address code', () => {
    expect(errorsOf({ ...valid, pincode: '1010' })).toContain('mweb.address.validation.pincodeInvalid');
    expect(errorsOf({ ...valid, pincode: '056003' })).toContain('mweb.address.validation.pincodeInvalid');
  });

  it('keeps the saved-address rules for the street, city and state', () => {
    expect(errorsOf({ ...valid, line1: '' })).toContain('mweb.address.validation.line1Required');
    expect(errorsOf({ ...valid, city: '' })).toContain('mweb.address.validation.cityRequired');
    expect(errorsOf({ ...valid, state: '' })).toContain('mweb.address.validation.stateRequired');
  });
});

describe('shipToValues', () => {
  it('starts from the order’s own ship-to, every part a string', () => {
    expect(
      shipToValues({ ...valid, line2: null, landmark: undefined, country: 'Nepal' }),
    ).toEqual({ ...valid, line2: '', landmark: '', country: 'Nepal' });
  });

  it('starts blank, in India, when the order has no ship-to', () => {
    expect(shipToValues(null)).toEqual({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    });
    expect(shipToValues({ country: '' }).country).toBe('India');
  });
});
