import { toPostalAddress, hasPostalAddress, composeAddressLine } from '@utils/address';

describe('toPostalAddress', () => {
  it('normalizes a partial/dirty address and defaults the country', () => {
    const a = toPostalAddress({ line1: '  12 Baker St ', city: 'Pune', pincode: 411001, extra: 'x' });
    expect(a).toEqual({
      line1: '12 Baker St',
      line2: '',
      landmark: '',
      city: 'Pune',
      state: '',
      pincode: '', // non-string dropped to ''
      country: 'India',
    });
  });

  it('keeps a provided country and handles null/undefined input', () => {
    expect(toPostalAddress({ country: 'Nepal' }).country).toBe('Nepal');
    expect(toPostalAddress(null).country).toBe('India');
    expect(toPostalAddress(undefined).line1).toBe('');
  });
});

describe('hasPostalAddress', () => {
  it('is true only with line1 + city + pincode', () => {
    expect(hasPostalAddress(toPostalAddress({ line1: 'A', city: 'B', pincode: '400001' }))).toBe(true);
    expect(hasPostalAddress(toPostalAddress({ line1: 'A', city: 'B' }))).toBe(false);
    expect(hasPostalAddress(toPostalAddress({}))).toBe(false);
  });
});

describe('composeAddressLine', () => {
  it('joins non-empty parts with commas', () => {
    expect(
      composeAddressLine(
        toPostalAddress({ line1: '12 Baker St', landmark: 'Near Park', city: 'Pune', pincode: '411001' })
      )
    ).toBe('12 Baker St, Near Park, Pune, 411001, India');
  });

  it('returns just the country when nothing else is set', () => {
    expect(composeAddressLine(toPostalAddress({}))).toBe('India');
  });
});
