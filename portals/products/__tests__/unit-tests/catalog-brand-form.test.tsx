import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  BrandForm,
  brandCommissionSchema,
  brandInitialValues,
  brandSchema,
  parseCategories,
  toFormValues,
  toSubmitInput,
  type BrandFormValues,
} from '../../src/pages/catalog-brands/brand-form';

const valid: BrandFormValues = {
  ...brandInitialValues,
  brand_name: 'Acme Attire',
  tagline: 'Fresh goods',
  product_categories: 'Decor, Apparel',
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
  it('accepts a fully populated brand', () => {
    expect(brandSchema.parse(valid)).toMatchObject({ brand_name: 'Acme Attire' });
  });

  it('accepts a brand whose every optional field is blank', () => {
    expect(brandSchema.safeParse({ ...brandInitialValues, brand_name: 'Acme' }).success).toBe(true);
  });

  it('requires a brand name of at least 2 characters', () => {
    expect(messages(brandSchema.safeParse({ ...valid, brand_name: 'A' }))).toMatch(/at least 2/i);
  });

  it('rejects malformed identity, contact and payout fields', () => {
    expect(messages(brandSchema.safeParse({ ...valid, gstin: 'NOPE' }))).toMatch(/GSTIN/i);
    expect(messages(brandSchema.safeParse({ ...valid, pan: '123' }))).toMatch(/PAN/i);
    expect(messages(brandSchema.safeParse({ ...valid, ifsc_code: 'HDFC1' }))).toMatch(/IFSC/i);
    expect(messages(brandSchema.safeParse({ ...valid, account_number: '12' }))).toMatch(/6-20/i);
    expect(messages(brandSchema.safeParse({ ...valid, contact_phone: '12' }))).toMatch(/6-15/i);
    expect(messages(brandSchema.safeParse({ ...valid, established_year: '19' }))).toMatch(/4-digit/i);
    expect(messages(brandSchema.safeParse({ ...valid, postal_code: '!!' }))).toMatch(/postal code/i);
    expect(messages(brandSchema.safeParse({ ...valid, website_url: 'javascript:x' }))).toMatch(/URL/i);
    // optionalEmail is a union, so zod reports the union issue rather than the
    // inner message — assert the rejection itself.
    expect(brandSchema.safeParse({ ...valid, contact_email: 'nope' }).success).toBe(false);
  });

  it('upper-cases GSTIN, PAN and IFSC', () => {
    const parsed = brandSchema.parse({ ...valid, pan: 'abcde1234f', ifsc_code: 'hdfc0000001' });
    expect(parsed.pan).toBe('ABCDE1234F');
    expect(parsed.ifsc_code).toBe('HDFC0000001');
  });

  it('caps product categories at 30 entries', () => {
    const many = Array.from({ length: 31 }, (_, index) => `c${index}`).join(', ');
    expect(messages(brandSchema.safeParse({ ...valid, product_categories: many }))).toMatch(/30/);
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
    const over = brandCommissionSchema.safeParse({ product_commission_pct: '120' });
    expect(over.success).toBe(false);
  });
});

describe('brand form mappers', () => {
  it('returns the initial values when there is no brand', () => {
    expect(toFormValues(null)).toEqual(brandInitialValues);
  });

  it('joins categories and defaults a blank country to India', () => {
    const values = toFormValues({
      brand_name: 'A',
      product_categories: ['Decor', 'Apparel'],
      country: '',
      established_year: 2019,
    });
    expect(values.product_categories).toBe('Decor, Apparel');
    expect(values.country).toBe('India');
    expect(values.established_year).toBe('2019');
  });

  it('blanks the fields a partial brand does not carry', () => {
    const values = toFormValues({ brand_name: 'Only Name', country: 'Nepal' });
    expect(values.product_categories).toBe('');
    expect(values.gstin).toBe('');
    expect(values.country).toBe('Nepal');
  });

  it('splits categories back out and parses the established year', () => {
    const input = toSubmitInput({ ...valid, product_categories: 'Decor, , Apparel' });
    expect(input.product_categories).toEqual(['Decor', 'Apparel']);
    expect(input.established_year).toBe(2019);
    expect(toSubmitInput({ ...valid, established_year: '' }).established_year).toBeNull();
  });

  it('never sends documents, so the brand keeps its uploads', () => {
    expect(toSubmitInput(valid)).not.toHaveProperty('documents');
  });

  it('drops blank category entries', () => {
    expect(parseCategories(' a , , b ')).toEqual(['a', 'b']);
  });
});

describe('BrandForm', () => {
  it('falls back to the built-in defaults when no initial values are given', () => {
    render(<BrandForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Payout')).toBeInTheDocument();
    expect(screen.getByDisplayValue('India')).toBeInTheDocument();
  });

  it('renders the seeded values and submits them', async () => {
    const onSubmit = vi.fn();
    render(<BrandForm initialValues={valid} onSubmit={onSubmit} />);
    expect(screen.getByDisplayValue('Acme Attire')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save brand details/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ brand_name: 'Acme Attire' });
  });

  it('blocks the submit and shows the validation message for a bad field', async () => {
    const onSubmit = vi.fn();
    render(<BrandForm initialValues={valid} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByDisplayValue('9876543210'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /save brand details/i }));
    await waitFor(() =>
      expect(screen.getByText('Contact phone must be 6-15 digits')).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disables the submit while saving', () => {
    render(<BrandForm initialValues={valid} saving onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
