import { describe, expect, it } from 'vitest';
import {
  venueStep1Schema,
  venueStep2Schema,
  venueStep3Schema,
  validateVenueCreate,
  validateVenueEdit,
} from './venue.form';

const step1 = {
  venue_name: 'Cafe Mocha',
  venue_type: 'Cafe',
  capacity: 30,
  description: '',
  cover_image_url: '',
  address_line1: '12 Main Street',
  address_line2: '',
  location_id: 'loc-1',
  country: 'India',
  country_code: 'IN',
  city: 'Bengaluru',
  state: 'Karnataka',
  state_code: 'KA',
  locality: 'Indiranagar',
  postal_code: '560038',
  tags: [],
};

const step2 = {
  documents: [{ type: 'PAN Card', url: 'https://cdn.example.com/pan.pdf' }],
  gstin: '',
  pan: '',
};

const step3 = {
  owner_name: 'Owner Name',
  owner_email: 'owner@example.com',
  owner_phone: '+919876543210',
  owner_dob: '',
  owner_address: '',
  bank_account: {
    payout_method: 'NEFT' as const,
    account_holder_name: 'Owner Name',
    account_number: '123456789012',
    ifsc_code: 'HDFC0001234',
    upi_id: '',
  },
};

describe('venue step1', () => {
  it('rejects too-small capacity', async () => {
    const error = await venueStep1Schema.validate({ ...step1, capacity: 0 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/capacity/i);
  });

  it('rejects bad postal code', async () => {
    const error = await venueStep1Schema.validate({ ...step1, postal_code: '!!' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/postal/i);
  });
});

describe('venue step2', () => {
  it('rejects malformed PAN', async () => {
    const error = await venueStep2Schema.validate({ ...step2, pan: 'BADPAN' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/PAN/i);
  });

  it('rejects malformed GSTIN', async () => {
    const error = await venueStep2Schema.validate({ ...step2, gstin: 'JUNK' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/GSTIN/i);
  });
});

describe('venue step3', () => {
  it('rejects owner phone with letters', async () => {
    const error = await venueStep3Schema.validate({ ...step3, owner_phone: '98abc' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('rejects owner name with special chars', async () => {
    const error = await venueStep3Schema.validate({ ...step3, owner_name: 'Owner@!' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/owner name/i);
  });
});

describe('combined schemas', () => {
  it('validateVenueCreate requires an owner_user_id', async () => {
    const error = await validateVenueCreate({ owner_user_id: '', step1, step2, step3 }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/owner/i);
  });

  it('validateVenueEdit requires a status', async () => {
    const error = await validateVenueEdit({ step1, step2, step3, status: '' as any }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/status/i);
  });

  it('accepts a valid edit payload', async () => {
    await validateVenueEdit({ step1, step2, step3, status: 'APPROVED' });
  });
});
