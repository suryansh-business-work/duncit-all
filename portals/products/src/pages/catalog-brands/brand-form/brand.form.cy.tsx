import { describe, expect, it } from 'vitest';
import { brandSchema } from './brand.form';
import {
  brandCommissionSchema,
  brandInitialValues,
  toFormValues,
  toSubmitInput,
} from './brand.types';

const valid = {
  ...brandInitialValues,
  brand_name: 'Acme Attire',
  contact_email: 'sales@acme.com',
  contact_phone: '9876543210',
  gstin: '27ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  established_year: '2019',
  postal_code: '411001',
  account_number: '000111222333',
  ifsc_code: 'HDFC0000001',
  website_url: 'https://acme.com',
};

const messages = (result: ReturnType<typeof brandSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('brandSchema', () => {
  it('accepts a fully valid brand', () => {
    expect(brandSchema.parse(valid)).toMatchObject({ brand_name: 'Acme Attire' });
  });

  it('requires a brand name of at least 2 characters', () => {
    expect(messages(brandSchema.safeParse({ ...valid, brand_name: 'A' }))).toMatch(/at least 2/i);
  });

  it('rejects a malformed GSTIN, PAN, IFSC, phone, year and postal code', () => {
    expect(messages(brandSchema.safeParse({ ...valid, gstin: 'NOPE' }))).toMatch(/GSTIN/i);
    expect(messages(brandSchema.safeParse({ ...valid, pan: '123' }))).toMatch(/PAN/i);
    expect(messages(brandSchema.safeParse({ ...valid, ifsc_code: 'HDFC1' }))).toMatch(/IFSC/i);
    expect(messages(brandSchema.safeParse({ ...valid, contact_phone: '12' }))).toMatch(/6-15/i);
    expect(messages(brandSchema.safeParse({ ...valid, established_year: '19' }))).toMatch(/4-digit/i);
    expect(messages(brandSchema.safeParse({ ...valid, postal_code: '!!' }))).toMatch(/postal code/i);
  });

  it('treats every optional field as blank-friendly', () => {
    expect(brandSchema.safeParse({ ...brandInitialValues, brand_name: 'Acme' }).success).toBe(true);
  });

  it('upper-cases GSTIN, PAN and IFSC', () => {
    const parsed = brandSchema.parse({ ...valid, pan: 'abcde1234f', ifsc_code: 'hdfc0000001' });
    expect(parsed.pan).toBe('ABCDE1234F');
    expect(parsed.ifsc_code).toBe('HDFC0000001');
  });

  it('rejects more than 30 product categories', () => {
    const many = Array.from({ length: 31 }, (_, index) => `c${index}`).join(', ');
    expect(messages(brandSchema.safeParse({ ...valid, product_categories: many }))).toMatch(/30/);
  });

  it('rejects an invalid website URL', () => {
    expect(messages(brandSchema.safeParse({ ...valid, website_url: 'javascript:x' }))).toMatch(/URL/i);
  });
});

describe('brandCommissionSchema', () => {
  it('accepts 0 and a two-decimal percentage', () => {
    expect(brandCommissionSchema.safeParse({ product_commission_pct: '0' }).success).toBe(true);
    expect(brandCommissionSchema.safeParse({ product_commission_pct: '12.55' }).success).toBe(true);
  });

  it('rejects blank, negative and over-100 percentages', () => {
    expect(brandCommissionSchema.safeParse({ product_commission_pct: '' }).success).toBe(false);
    expect(brandCommissionSchema.safeParse({ product_commission_pct: '-5' }).success).toBe(false);
    expect(brandCommissionSchema.safeParse({ product_commission_pct: '120' }).success).toBe(false);
  });
});

describe('brand form mappers', () => {
  it('returns the initial values when there is no brand', () => {
    expect(toFormValues(null)).toEqual(brandInitialValues);
  });

  it('joins categories and defaults a blank country to India', () => {
    const values = toFormValues({ brand_name: 'A', product_categories: ['Decor', 'Apparel'], country: '' });
    expect(values.product_categories).toBe('Decor, Apparel');
    expect(values.country).toBe('India');
  });

  it('splits categories back and parses the established year', () => {
    const input = toSubmitInput({ ...valid, product_categories: 'Decor, , Apparel' });
    expect(input.product_categories).toEqual(['Decor', 'Apparel']);
    expect(input.established_year).toBe(2019);
    expect(toSubmitInput({ ...valid, established_year: '' }).established_year).toBeNull();
  });

  it('never sends documents, so the brand keeps its uploads', () => {
    expect(toSubmitInput(valid)).not.toHaveProperty('documents');
  });
});
