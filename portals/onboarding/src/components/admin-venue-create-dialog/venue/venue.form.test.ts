import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
// Import via the parent barrel so both venue.form.ts and the schema module are covered.
import {
  venueStep1Schema,
  venueStep2Schema,
  venueStep3Schema,
  validateVenueCreate,
  validateVenueEdit,
  collectVenueValidationErrors,
  getVenueError,
} from '../venue.form';

const step1 = {
  venue_name: 'The Loft',
  venue_type: 'CAFE',
  capacity: 40,
  description: '',
  cover_image_url: '',
  gallery: [],
  address_line1: '12 Park Road',
  address_line2: '',
  location_id: 'loc1',
  country: 'India',
  country_code: 'IN',
  city: 'Pune',
  state: 'MH',
  state_code: '',
  locality: 'Kothrud',
  postal_code: '411038',
  tags: [],
};
const step2 = { documents: [{ type: 'GST', url: 'https://x/y.pdf' }], gstin: '', pan: '' };
const step3 = {
  owner_name: 'Asha Rao',
  owner_email: 'asha@duncit.com',
  owner_phone: '+919876543210',
  owner_dob: '',
  owner_address: '',
  bank_account: { payout_method: 'UPI', account_holder_name: 'Asha', account_number: '', ifsc_code: '', upi_id: 'asha@okhdfc' },
};

describe('venue step schemas', () => {
  it('validates step1 and rejects missing required fields', async () => {
    await expect(venueStep1Schema.isValid(step1)).resolves.toBe(true);
    await expect(venueStep1Schema.isValid({ ...step1, venue_name: '' })).resolves.toBe(false);
    await expect(venueStep1Schema.isValid({ ...step1, postal_code: '!!' })).resolves.toBe(false);
  });

  it('validates step2 documents, gstin and pan branches', async () => {
    await expect(venueStep2Schema.isValid(step2)).resolves.toBe(true);
    await expect(
      venueStep2Schema.isValid({ ...step2, documents: [{ type: 'GST', url: '' }] }),
    ).resolves.toBe(false);
    // Omitted documents default to [] and pass.
    await expect(venueStep2Schema.isValid({ ...step2, documents: undefined })).resolves.toBe(true);
    // Null documents exercise the `docs ?? []` guard inside the valid-docs test.
    await expect(venueStep2Schema.isValid({ ...step2, documents: null })).resolves.toBe(false);
    await expect(venueStep2Schema.isValid({ ...step2, gstin: '22ABCDE1234F1Z5' })).resolves.toBe(true);
    await expect(venueStep2Schema.isValid({ ...step2, gstin: 'BAD' })).resolves.toBe(false);
    await expect(venueStep2Schema.isValid({ ...step2, pan: 'ABCDE1234F' })).resolves.toBe(true);
    await expect(venueStep2Schema.isValid({ ...step2, pan: 'BAD' })).resolves.toBe(false);
  });

  it('validates step3 owner and dob branches', async () => {
    await expect(venueStep3Schema.isValid(step3)).resolves.toBe(true);
    await expect(venueStep3Schema.isValid({ ...step3, owner_dob: '1990-01-01' })).resolves.toBe(true);
    await expect(venueStep3Schema.isValid({ ...step3, owner_dob: '3000-01-01' })).resolves.toBe(false);
    await expect(venueStep3Schema.isValid({ ...step3, owner_phone: 'abc' })).resolves.toBe(false);
  });
});

describe('venue validate helpers', () => {
  it('validateVenueCreate / validateVenueEdit resolve on valid input', async () => {
    await expect(validateVenueCreate({ owner_user_id: 'u1', step1, step2, step3 })).resolves.toBeTruthy();
    await expect(validateVenueEdit({ step1, step2, step3, status: 'APPROVED' })).resolves.toBeTruthy();
  });

  it('collectVenueValidationErrors flattens inner errors', async () => {
    const error = await validateVenueCreate({
      owner_user_id: '',
      step1: { ...step1, venue_name: '' },
      step2,
      step3,
    }).catch((caught) => caught);
    const map = collectVenueValidationErrors(error);
    expect(map['owner_user_id']).toBeTruthy();
    expect(map['step1.venue_name']).toBeTruthy();
  });

  it('handles a single ValidationError and non-yup errors', () => {
    const single = new yup.ValidationError('Bad name', null, 'step1.venue_name');
    expect(collectVenueValidationErrors(single)).toEqual({ 'step1.venue_name': 'Bad name' });
    expect(collectVenueValidationErrors(new Error('plain'))).toEqual({});
  });

  it('getVenueError reads a path safely', () => {
    expect(getVenueError(undefined, 'a')).toBe('');
    expect(getVenueError({ a: 'msg' }, 'a')).toBe('msg');
    expect(getVenueError({ a: 'msg' }, 'b')).toBe('');
  });
});
