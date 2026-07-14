/** Chip colors for EcommBrand.status — shared by the brands table and brand detail page. */
export const BRAND_STATUS_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  APPROVED: 'success',
  SUBMITTED: 'warning',
  DRAFT: 'default',
  REJECTED: 'error',
};

export const BRAND_STATUS_OPTIONS = ['APPROVED', 'SUBMITTED', 'DRAFT', 'REJECTED'].map(
  (value) => ({ value, label: value }),
);
