import { describe, expect, it } from 'vitest';
import {
  validateStep,
  validateAllSteps,
  venueStep1Schema,
  venueStep2Schema,
  venueStep3Schema,
  getStepErrors,
} from './register-venue.form';

const step1 = {
  venue_name: 'Cafe Mocha',
  venue_type: 'Cafe',
  capacity: 30,
  description: '',
  location_id: 'loc-1',
  country: 'India',
  country_code: 'IN',
  state: 'KA',
  state_code: 'KA',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  postal_code: '560038',
  address_line1: '12 Main Street',
  address_line2: '',
  cover_image_url: '',
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
};

describe('register venue step schemas', () => {
  it('step1 rejects bad postal_code', async () => {
    const error = await venueStep1Schema
      .validate({ ...step1, postal_code: '!!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/pin code/i);
  });

  it('step2 rejects empty documents', async () => {
    const error = await venueStep2Schema
      .validate({ ...step2, documents: [] }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/document/i);
  });

  it('step3 rejects owner_phone with letters', async () => {
    const error = await venueStep3Schema
      .validate({ ...step3, owner_phone: 'abc1234' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/digits/i);
  });

  it('step3 rejects owner_name with special chars', async () => {
    const error = await venueStep3Schema
      .validate({ ...step3, owner_name: 'Owner!' }, { abortEarly: false })
      .catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/owner name/i);
  });
});

describe('validateStep helper', () => {
  it('returns null for valid step 0', async () => {
    const err = await validateStep(0, step1, step2, step3);
    expect(err).toBeNull();
  });
  it('returns a string for invalid step 2', async () => {
    const err = await validateStep(2, step1, step2, { ...step3, owner_phone: 'bad' });
    expect(typeof err).toBe('string');
  });
});

describe('validateAllSteps', () => {
  it('accepts a fully valid 3-step payload', async () => {
    await expect(validateAllSteps(step1, step2, step3)).resolves.toBeTruthy();
  });
});

describe('getStepErrors', () => {
  it('returns a map of field-name -> error', () => {
    const errors = getStepErrors(venueStep3Schema, { ...step3, owner_phone: 'abc', owner_name: '' });
    expect(errors.owner_phone).toBeTruthy();
    expect(errors.owner_name).toBeTruthy();
  });
});
