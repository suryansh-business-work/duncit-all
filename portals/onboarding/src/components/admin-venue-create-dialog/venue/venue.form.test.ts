import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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

const isValid = (schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) =>
  schema.safeParse(value).success;

describe('venue step schemas', () => {
  it('validates step1 and rejects missing required fields', () => {
    expect(isValid(venueStep1Schema, step1)).toBe(true);
    expect(isValid(venueStep1Schema, { ...step1, venue_name: '' })).toBe(false);
    expect(isValid(venueStep1Schema, { ...step1, postal_code: '!!' })).toBe(false);
    // A missing capacity and a non-numeric one are both refused.
    expect(isValid(venueStep1Schema, { ...step1, capacity: undefined })).toBe(false);
    expect(isValid(venueStep1Schema, { ...step1, capacity: Number.NaN })).toBe(false);
  });

  it('validates step2 documents, gstin and pan branches', () => {
    expect(isValid(venueStep2Schema, step2)).toBe(true);
    expect(isValid(venueStep2Schema, { ...step2, documents: [{ type: 'GST', url: '' }] })).toBe(false);
    // Omitted documents default to [] and pass.
    expect(isValid(venueStep2Schema, { ...step2, documents: undefined })).toBe(true);
    // Null documents are not a list at all.
    expect(isValid(venueStep2Schema, { ...step2, documents: null })).toBe(false);
    expect(isValid(venueStep2Schema, { ...step2, gstin: '22ABCDE1234F1Z5' })).toBe(true);
    expect(isValid(venueStep2Schema, { ...step2, gstin: 'BAD' })).toBe(false);
    expect(isValid(venueStep2Schema, { ...step2, pan: 'ABCDE1234F' })).toBe(true);
    expect(isValid(venueStep2Schema, { ...step2, pan: 'BAD' })).toBe(false);
  });

  it('validates step3 owner and dob branches', () => {
    expect(isValid(venueStep3Schema, step3)).toBe(true);
    expect(isValid(venueStep3Schema, { ...step3, owner_dob: '1990-01-01' })).toBe(true);
    expect(isValid(venueStep3Schema, { ...step3, owner_dob: '3000-01-01' })).toBe(false);
    expect(isValid(venueStep3Schema, { ...step3, owner_phone: 'abc' })).toBe(false);
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
    // A field that fails twice keeps its first message.
    expect(map['step1.venue_name']).toBe('Venue name must be at least 2 characters');
  });

  it('collectVenueValidationErrors spells a list index the way the sections look it up', async () => {
    const error = await validateVenueEdit({
      step1,
      step2: { ...step2, documents: [{ type: 'GST', url: '' }] },
      step3,
      status: 'APPROVED',
    }).catch((caught) => caught);
    const map = collectVenueValidationErrors(error);
    expect(map['step2.documents[0].url']).toBe('Document URL is required');
    expect(map['step2.documents']).toBe('Each document must have both a type and a URL');
  });

  it('handles a single issue, an issue with no path and non-validation errors', () => {
    const single = new z.ZodError([
      { code: 'custom', path: ['step1', 'venue_name'], message: 'Bad name', input: '' },
    ]);
    expect(collectVenueValidationErrors(single)).toEqual({ 'step1.venue_name': 'Bad name' });
    const rootOnly = new z.ZodError([{ code: 'custom', path: [], message: 'Bad input', input: null }]);
    expect(collectVenueValidationErrors(rootOnly)).toEqual({});
    expect(collectVenueValidationErrors(new Error('plain'))).toEqual({});
  });

  it('getVenueError reads a path safely', () => {
    expect(getVenueError(undefined, 'a')).toBe('');
    expect(getVenueError({ a: 'msg' }, 'a')).toBe('msg');
    expect(getVenueError({ a: 'msg' }, 'b')).toBe('');
  });
});
