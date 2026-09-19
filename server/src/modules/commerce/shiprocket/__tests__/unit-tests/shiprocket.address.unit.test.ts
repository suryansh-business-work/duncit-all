import { addressProblems, type CourierAddress } from '../../shiprocket.address';

/**
 * Whether an address can be handed to a courier. The two orders that got
 * stuck in production carried "India" as the street and the city — the
 * browser's autofill — which passes a "not empty" check and fails ShipRocket.
 */
const noida: CourierAddress = {
  line1: 'Flat 402, Tower C, Supertech Capetown',
  city: 'Noida',
  state: 'Uttar Pradesh',
  pincode: '201301',
  country: 'India',
  phone: '9876543210',
};

const STREET = 'the house number and street';
const CITY = 'the city';

describe('addressProblems', () => {
  it('accepts a real street address', () => {
    expect(addressProblems(noida)).toEqual([]);
  });

  it('rejects the autofilled "India / India" address the stuck orders carried', () => {
    expect(addressProblems({ ...noida, line1: 'India', city: 'India', pincode: '201017' })).toEqual([STREET, CITY]);
  });

  it('rejects the country as the city even when the country is not India', () => {
    expect(addressProblems({ ...noida, city: 'Bharat', country: 'Bharat' })).toEqual([CITY]);
  });

  it.each([
    ['the city', 'Noida'],
    ['the state, in any case', 'uttar pradesh'],
    ['the pincode', '201301'],
    ['only digits', '1204'],
    ['under three characters', 'A1'],
    ['blank after trimming', '   '],
  ])('rejects a street that is %s', (_why, line1) => {
    expect(addressProblems({ ...noida, line1 })).toEqual([STREET]);
  });

  it('rejects a city shorter than three characters', () => {
    expect(addressProblems({ ...noida, city: 'NO' })).toEqual([CITY]);
  });

  it('asks for the state when it is missing', () => {
    expect(addressProblems({ ...noida, state: '' })).toEqual(['the state']);
  });

  it('reads the pincode and phone by their digits alone', () => {
    expect(addressProblems({ ...noida, pincode: '201 301', phone: '+91 98765-43210' })).toEqual([]);
  });

  it('asks for a six-digit pincode and a ten-digit phone', () => {
    expect(addressProblems({ ...noida, pincode: '2013', phone: '98765' })).toEqual([
      'a 6-digit pincode',
      'a 10-digit phone number',
    ]);
  });

  it('names every problem, in form order, for an empty address', () => {
    expect(addressProblems({ line1: null, city: undefined, state: null, pincode: null, phone: null })).toEqual([
      STREET,
      CITY,
      'the state',
      'a 6-digit pincode',
      'a 10-digit phone number',
    ]);
  });
});
