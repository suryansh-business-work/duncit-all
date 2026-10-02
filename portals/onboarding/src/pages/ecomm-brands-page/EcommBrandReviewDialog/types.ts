/** One document a brand uploaded for review. */
export interface ReviewDocument {
  type?: string | null;
  url: string;
}

/** The brand record the review dialog reads — every field it renders, all optional as the API may omit them. */
export interface ReviewBrand {
  id?: string | null;
  status?: string | null;
  brand_name?: string | null;
  tagline?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  established_year?: number | string | null;
  registered_business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  contact_person?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
  product_categories?: string[] | null;
  product_commission_pct?: number | null;
  documents?: ReviewDocument[] | null;
}
