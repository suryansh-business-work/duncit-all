import { describe, expect, it } from 'vitest';
import { toStep1Input, toStep2Input, toStep3Input, venueToValues } from './register-venue.mappers';
import { blankRegisterVenueValues, type RegisterVenueValues } from './register-venue.types';

const account = { name: 'Asha Rao', email: 'asha@duncit.com' };

/** An admin Location doc as the MyVenue query returns it. */
const bengaluru = {
  id: 'loc-blr',
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  location_name: 'Bengaluru',
  location_pincode: '560001',
  location_zones: [
    { zone_name: 'Indiranagar', zone_code: 'IND', pincode: '560038' },
    { zone_name: 'Koramangala', zone_code: 'KOR', pincode: '560034' },
  ],
};

/** A Location saved before cities carried their own name — only location_name is set. */
const goa = {
  id: 'loc-goa',
  country: 'India',
  country_code: 'IN',
  state: 'Goa',
  state_code: 'GA',
  city: '',
  location_name: 'Panaji',
  location_pincode: '403001',
  location_zones: [],
};

describe('venueToValues — a brand-new registration', () => {
  it('starts blank with the owner taken from the signed-in account', () => {
    expect(venueToValues(null, [bengaluru], account)).toEqual({
      ...blankRegisterVenueValues,
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
    });
  });
});

describe('venueToValues — a stored venue', () => {
  it('fills every missing field with its blank default', () => {
    const values = venueToValues({ id: 'v1' }, [], account);

    expect(values).toEqual({
      ...blankRegisterVenueValues,
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
    });
  });

  it('prefers the stored owner name, and the stored owner email only when the account has none', () => {
    const venue = { id: 'v1', owner_name: 'Stored Owner', owner_email: 'stored@duncit.com' };

    expect(venueToValues(venue, [], account)).toMatchObject({
      owner_name: 'Stored Owner',
      owner_email: 'asha@duncit.com',
    });
    expect(venueToValues(venue, [], { name: 'Asha Rao', email: '' }).owner_email).toBe('stored@duncit.com');
  });

  it('reads the payout method back from the stored bank account', () => {
    const values = venueToValues(
      {
        id: 'v1',
        bank_account: {
          payout_method: 'NEFT',
          account_holder_name: 'Asha Rao',
          account_number: '123456789',
          ifsc_code: 'HDFC0001234',
          upi_id: null,
        },
      },
      [],
      account
    );

    expect(values).toMatchObject({
      payout_method: 'NEFT',
      account_holder_name: 'Asha Rao',
      account_number: '123456789',
      ifsc_code: 'HDFC0001234',
      upi_id: '',
    });
  });

  it('keeps the stored gallery, tax ids and trims the date of birth to a day', () => {
    const values = venueToValues(
      {
        id: 'v1',
        cover_image_url: 'https://cdn.duncit.com/cover.jpg',
        gallery: ['https://cdn.duncit.com/1.jpg'],
        gstin: '29ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        owner_dob: '1991-02-03T00:00:00.000Z',
        documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf', extra: 'ignored' }],
      },
      [],
      account
    );

    expect(values).toMatchObject({
      cover_image_url: 'https://cdn.duncit.com/cover.jpg',
      gallery: ['https://cdn.duncit.com/1.jpg'],
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      owner_dob: '1991-02-03',
      documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf' }],
    });
  });
});

describe('venueToValues — lining the location pickers up with the admin locations', () => {
  it('matches by location id and takes the zone pincode for a known locality name', () => {
    const values = venueToValues(
      { id: 'v1', location_id: 'loc-blr', city: 'Old name', locality: 'Indiranagar', postal_code: '000000' },
      [goa, bengaluru],
      account
    );

    expect(values).toMatchObject({
      location_id: 'loc-blr',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      state_code: 'KA',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      postal_code: '560038',
    });
  });

  it('matches a stored zone code to its zone name', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-blr', locality: 'KOR' }, [bengaluru], account);

    expect(values.locality).toBe('Koramangala');
    expect(values.postal_code).toBe('560034');
  });

  it('falls back to the city pincode when the locality is not one of its zones', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-blr', locality: 'Whitefield' }, [bengaluru], account);

    expect(values.locality).toBe('Whitefield');
    expect(values.postal_code).toBe('560001');
  });

  it('finds a legacy venue with no location id by its city, state and country code', () => {
    // A location saved with no name at all can never be the venue's city.
    const nameless = { id: 'loc-x', country_code: 'IN', state: 'Karnataka' };
    const values = venueToValues(
      { id: 'v1', city: 'Bengaluru', state: 'Karnataka', country_code: 'IN', locality: 'Indiranagar' },
      [nameless, goa, bengaluru],
      account
    );

    expect(values.location_id).toBe('loc-blr');
    expect(values.postal_code).toBe('560038');
  });

  it('matches on the city when no state was stored', () => {
    // A blank stored country code reads as IN, so the city (and IN) decide.
    const values = venueToValues({ id: 'v1', city: 'Bengaluru', country_code: '' }, [bengaluru], account);

    expect(values.location_id).toBe('loc-blr');
    expect(values.state).toBe('Karnataka');
  });

  it('does not match a city in a different state', () => {
    const values = venueToValues(
      { id: 'v1', city: 'Bengaluru', state: 'Kerala', postal_code: '682001' },
      [bengaluru],
      account
    );

    expect(values).toMatchObject({ location_id: '', state: 'Kerala', city: 'Bengaluru', postal_code: '682001' });
  });

  it('uses the location name for a zoneless city and makes it the locality', () => {
    const values = venueToValues({ id: 'v1', location_id: 'loc-goa' }, [goa], account);

    expect(values).toMatchObject({ city: 'Panaji', locality: 'Panaji', postal_code: '403001', state: 'Goa' });
  });

  it('matches a zoneless legacy city by its location name', () => {
    const values = venueToValues({ id: 'v1', city: 'Panaji', state: 'Goa' }, [goa], account);

    expect(values.location_id).toBe('loc-goa');
  });

  it('keeps the stored values when a location has no zones list and nothing to add', () => {
    const bare = { id: 'loc-bare', city: 'Mysuru', location_name: 'Mysuru' };
    const values = venueToValues(
      { id: 'v1', location_id: 'loc-bare', country: 'India', state: 'Karnataka', locality: 'Gokulam', postal_code: '570002' },
      [bare],
      account
    );

    expect(values).toMatchObject({
      location_id: 'loc-bare',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      city: 'Mysuru',
      locality: 'Gokulam',
      postal_code: '570002',
    });
  });
});

const filled: RegisterVenueValues = {
  ...blankRegisterVenueValues,
  venue_name: 'Cafe Mocha',
  documents: [
    { type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf', hash: 'h1' },
    { type: 'Trade License', url: '' },
    { type: '', url: 'https://cdn.duncit.com/orphan.pdf' },
  ],
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  owner_name: 'Asha Rao',
  owner_email: 'owner@duncit.com',
  owner_phone: '+919876543210',
  owner_dob: '1991-02-03',
  owner_address: '12 Main Street',
  payout_method: 'IMPS',
  account_holder_name: 'Asha Rao',
  account_number: '123456789',
  ifsc_code: 'hdfc0001234',
  upi_id: 'asha@okaxis',
};

describe('toStep1Input', () => {
  it('drops blank capacity rows and counts a non-numeric capacity as zero', () => {
    const input = toStep1Input({
      ...filled,
      capacity_items: [
        { label: ' Hall ', capacity: '40' },
        { label: '', capacity: '' },
        { label: 'Terrace', capacity: 'lots' },
      ],
    });

    expect(input.capacity_items).toEqual([
      { label: 'Hall', capacity: 40 },
      { label: 'Terrace', capacity: 0 },
    ]);
    expect(input.capacity).toBe(40);
    expect(input.location_id).toBeNull();
  });
});

describe('toStep2Input', () => {
  it('sends only the documents that have both a type and a file, without the client-side hash', () => {
    expect(toStep2Input(filled)).toEqual({
      documents: [{ type: 'PAN Card', url: 'https://cdn.duncit.com/pan.pdf' }],
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
    });
  });
});

describe('toStep3Input', () => {
  it('sends bank details (IFSC upper-cased) and blanks the UPI id for a bank transfer', () => {
    expect(toStep3Input(filled, 'asha@duncit.com')).toEqual({
      owner_name: 'Asha Rao',
      owner_email: 'asha@duncit.com',
      owner_phone: '+919876543210',
      owner_dob: '1991-02-03',
      owner_address: '12 Main Street',
      bank_account: {
        payout_method: 'IMPS',
        account_holder_name: 'Asha Rao',
        account_number: '123456789',
        ifsc_code: 'HDFC0001234',
        upi_id: '',
      },
    });
  });

  it('sends only the UPI id for a UPI payout', () => {
    expect(toStep3Input({ ...filled, payout_method: 'UPI' }, 'asha@duncit.com').bank_account).toEqual({
      payout_method: 'UPI',
      account_holder_name: 'Asha Rao',
      account_number: '',
      ifsc_code: '',
      upi_id: 'asha@okaxis',
    });
  });

  it('falls back to the typed owner email, and sends null for an unset date of birth and method', () => {
    const input = toStep3Input({ ...filled, owner_dob: '', payout_method: '' }, '');

    expect(input.owner_email).toBe('owner@duncit.com');
    expect(input.owner_dob).toBeNull();
    expect(input.bank_account.payout_method).toBeNull();
  });
});
