/** A brand row with every field the "Your brands" table document selects. */
type Over = Record<string, unknown>;

export const brandRow = (over: Over = {}) => ({
  __typename: 'EcommBrand',
  id: 'b1',
  brand_no: 'BR-1',
  brand_name: 'Aurora Pets',
  logo_url: '',
  cover_image_url: '',
  tagline: 'Treats for happy tails',
  description: '',
  product_categories: ['Treats', 'Toys'],
  website_url: '',
  instagram_url: '',
  contact_person: 'Asha Verma',
  contact_email: 'asha@brand.example.com',
  contact_phone: '9876543210',
  registered_business_name: 'Aurora Pets LLP',
  gstin: '',
  pan: '',
  established_year: 2020,
  address_line1: '',
  city: 'Pune',
  state: 'Maharashtra',
  postal_code: '411001',
  country: 'India',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
  documents: [],
  tags: [],
  status: 'DRAFT',
  is_active: true,
  live: false,
  live_since: null,
  integration_waived: false,
  reviewer_notes: '',
  submitted_at: null,
  approved_at: null,
  created_at: '2026-06-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
  shipping_mode: 'OWN_SHIPROCKET',
  completion: { __typename: 'BrandCompletion', percent: 40 },
  integrations: {
    __typename: 'BrandIntegrations',
    shiprocket: { __typename: 'BrandIntegrationStatus', connected: false },
    razorpay: { __typename: 'BrandIntegrationStatus', connected: false },
  },
  ...over,
});

export const connected = (shiprocket: boolean, razorpay: boolean) => ({
  __typename: 'BrandIntegrations',
  shiprocket: { __typename: 'BrandIntegrationStatus', connected: shiprocket },
  razorpay: { __typename: 'BrandIntegrationStatus', connected: razorpay },
});

export const brandsPage = (rows: unknown[]) => ({
  myEcommBrandsTable: { __typename: 'EcommBrandTablePage', total: rows.length, rows },
});

export const deletionRequest = (over: Over = {}) => ({
  __typename: 'CatalogDeletionRequest',
  id: 'r1',
  kind: 'BRAND',
  brand_id: 'b1',
  product_id: null,
  parent_id: null,
  status: 'PENDING',
  scheduled_for: '2026-08-10',
  blocked_reason: '',
  ...over,
});
