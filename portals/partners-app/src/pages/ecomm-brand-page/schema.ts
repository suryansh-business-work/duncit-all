import { z } from 'zod';
import type { EcommBrand } from './queries';

// Lenient form schema — drafts can be partial. The server enforces the
// brand_name / description / contact_email requirements on submit.
export const brandSchema = z.object({
  brand_name: z.string().trim().max(120),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(4000),
  logo_url: z.string(),
  cover_image_url: z.string(),
  product_categories: z.array(z.string()),
  website_url: z.string().trim().max(300),
  instagram_url: z.string().trim().max(300),
  contact_person: z.string().trim().max(120),
  contact_email: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email'),
  contact_phone: z.string().trim().max(20),
  registered_business_name: z.string().trim().max(200),
  gstin: z.string().trim().max(20),
  pan: z.string().trim().max(20),
  established_year: z.string().trim().max(4),
  address_line1: z.string().trim().max(300),
  city: z.string().trim().max(120),
  state: z.string().trim().max(120),
  postal_code: z.string().trim().max(20),
  country: z.string().trim().max(120),
  account_holder_name: z.string().trim().max(120),
  account_number: z.string().trim().max(40),
  ifsc_code: z.string().trim().max(20),
  upi_id: z.string().trim().max(80),
  documents: z.array(z.object({ type: z.string(), url: z.string() })),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

export const blankBrand: BrandFormValues = {
  brand_name: '',
  tagline: '',
  description: '',
  logo_url: '',
  cover_image_url: '',
  product_categories: [],
  website_url: '',
  instagram_url: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  registered_business_name: '',
  gstin: '',
  pan: '',
  established_year: '',
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  documents: [],
};

export function toFormValues(brand: EcommBrand | null | undefined, accountEmail: string): BrandFormValues {
  if (!brand) return { ...blankBrand, contact_email: accountEmail || '' };
  return {
    brand_name: brand.brand_name || '',
    tagline: brand.tagline || '',
    description: brand.description || '',
    logo_url: brand.logo_url || '',
    cover_image_url: brand.cover_image_url || '',
    product_categories: brand.product_categories || [],
    website_url: brand.website_url || '',
    instagram_url: brand.instagram_url || '',
    contact_person: brand.contact_person || '',
    contact_email: brand.contact_email || accountEmail || '',
    contact_phone: brand.contact_phone || '',
    registered_business_name: brand.registered_business_name || '',
    gstin: brand.gstin || '',
    pan: brand.pan || '',
    established_year: brand.established_year ? String(brand.established_year) : '',
    address_line1: brand.address_line1 || '',
    city: brand.city || '',
    state: brand.state || '',
    postal_code: brand.postal_code || '',
    country: brand.country || 'India',
    account_holder_name: brand.account_holder_name || '',
    account_number: brand.account_number || '',
    ifsc_code: brand.ifsc_code || '',
    upi_id: brand.upi_id || '',
    documents: (brand.documents || []).map((d) => ({ type: d.type, url: d.url })),
  };
}

export function toSaveInput(values: BrandFormValues) {
  const year = values.established_year ? Number(values.established_year) : null;
  return {
    ...values,
    established_year: Number.isFinite(year as number) ? year : null,
    documents: values.documents.filter((d) => d.url),
  };
}
