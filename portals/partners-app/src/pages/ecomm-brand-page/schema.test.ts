import { describe, expect, it } from 'vitest';
import { blankBrand, toFormValues, toSaveInput } from './schema';
import type { EcommBrand } from './queries';

/** A brand as the server returns it — every string field is non-null, blank when unset. */
const serverBrand = (over: Partial<EcommBrand> = {}): EcommBrand => ({
  id: 'b1',
  brand_name: 'Chai Point',
  logo_url: 'https://cdn.test/logo.png',
  cover_image_url: 'https://cdn.test/cover.png',
  tagline: 'Chai, delivered',
  description: 'Small-batch masala chai kits.',
  product_categories: ['Beverages'],
  website_url: 'https://chaipoint.example.com',
  instagram_url: 'https://instagram.com/chaipoint',
  contact_person: 'Asha Rao',
  contact_email: 'hello@chaipoint.example.com',
  contact_phone: '9876543210',
  registered_business_name: 'Chai Point Pvt Ltd',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  established_year: 2019,
  address_line1: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
  account_holder_name: 'Chai Point Pvt Ltd',
  account_number: '000123456789',
  ifsc_code: 'HDFC0000123',
  upi_id: 'chaipoint@upi',
  documents: [{ type: 'GST', url: 'https://cdn.test/gst.pdf' }],
  tags: [],
  status: 'DRAFT',
  is_active: true,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  ...over,
});

/** A draft saved with nothing but its id — every text field blank. */
const blankServerBrand = serverBrand({
  brand_name: '',
  logo_url: '',
  cover_image_url: '',
  tagline: '',
  description: '',
  product_categories: [],
  website_url: '',
  instagram_url: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  registered_business_name: '',
  gstin: '',
  pan: '',
  established_year: null,
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  documents: [],
});

describe('toFormValues', () => {
  it('starts a new brand blank, with the account email as the contact', () => {
    expect(toFormValues(null, 'asha@duncit.com')).toEqual({ ...blankBrand, contact_email: 'asha@duncit.com' });
    expect(toFormValues(undefined, '')).toEqual(blankBrand);
  });

  it('copies every field of a saved brand, stringifying the year', () => {
    expect(toFormValues(serverBrand(), 'asha@duncit.com')).toEqual({
      brand_name: 'Chai Point',
      tagline: 'Chai, delivered',
      description: 'Small-batch masala chai kits.',
      logo_url: 'https://cdn.test/logo.png',
      cover_image_url: 'https://cdn.test/cover.png',
      product_categories: ['Beverages'],
      website_url: 'https://chaipoint.example.com',
      instagram_url: 'https://instagram.com/chaipoint',
      contact_person: 'Asha Rao',
      contact_email: 'hello@chaipoint.example.com',
      contact_phone: '9876543210',
      registered_business_name: 'Chai Point Pvt Ltd',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      established_year: '2019',
      address_line1: '12 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560001',
      country: 'India',
      account_holder_name: 'Chai Point Pvt Ltd',
      account_number: '000123456789',
      ifsc_code: 'HDFC0000123',
      upi_id: 'chaipoint@upi',
      documents: [{ type: 'GST', url: 'https://cdn.test/gst.pdf' }],
    });
  });

  it('fills the blanks of a bare draft with the account email and India', () => {
    expect(toFormValues(blankServerBrand, 'asha@duncit.com')).toEqual({
      ...blankBrand,
      contact_email: 'asha@duncit.com',
    });
  });

  it('leaves the contact email blank when neither the brand nor the account has one', () => {
    expect(toFormValues(blankServerBrand, '').contact_email).toBe('');
  });
});

describe('toSaveInput', () => {
  it('sends the year as a number and drops documents without a file', () => {
    const input = toSaveInput({
      ...blankBrand,
      established_year: '2019',
      documents: [
        { type: 'GST', url: 'https://cdn.test/gst.pdf' },
        { type: 'DOCUMENT', url: '' },
      ],
    });
    expect(input.established_year).toBe(2019);
    expect(input.documents).toEqual([{ type: 'GST', url: 'https://cdn.test/gst.pdf' }]);
  });

  it('sends no year when the field is blank', () => {
    expect(toSaveInput(blankBrand).established_year).toBeNull();
  });

  it('sends no year when the partner typed something that is not a year', () => {
    expect(toSaveInput({ ...blankBrand, established_year: 'abcd' }).established_year).toBeNull();
  });
});
