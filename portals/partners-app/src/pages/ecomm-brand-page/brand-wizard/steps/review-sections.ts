import type { BrandWizardStepKey } from '@duncit/utils';
import type { BrandFormValues } from '../../schema';
import type { Translate } from '../wizard-steps';

export interface ReviewRow {
  label: string;
  value: string;
}

export interface ReviewSection {
  key: BrandWizardStepKey;
  rows: ReviewRow[];
}

/** The last four digits are enough to recognise an account; the rest stays off the screen. */
const maskAccount = (value: string) => (value.length > 4 ? `••••${value.slice(-4)}` : value);

/** Every form-backed step as label/value rows, in the order the wizard asked for them. */
export const reviewSections = (t: Translate, values: BrandFormValues): ReviewSection[] => [
  {
    key: 'details',
    rows: [
      { label: t('partners.ecommBrandPage.brandName'), value: values.brand_name },
      { label: t('partners.ecommBrandPage.tagline'), value: values.tagline },
      { label: t('shell.common.description'), value: values.description },
      { label: t('partners.ecommBrandPage.website'), value: values.website_url },
      { label: t('partners.ecommBrandPage.instagram'), value: values.instagram_url },
      { label: t('partners.ecommBrandPage.contactPerson'), value: values.contact_person },
      { label: t('partners.ecommBrandPage.contactEmail'), value: values.contact_email },
      { label: t('partners.ecommBrandPage.contactPhone'), value: values.contact_phone },
    ],
  },
  {
    key: 'business',
    rows: [
      { label: t('partners.ecommBrandPage.registeredBusinessName'), value: values.registered_business_name },
      { label: 'GSTIN', value: values.gstin },
      { label: 'PAN', value: values.pan },
      { label: t('partners.ecommBrandPage.establishedYear'), value: values.established_year },
    ],
  },
  {
    key: 'address',
    rows: [
      { label: t('partners.common.addressLine1'), value: values.address_line1 },
      { label: t('partners.common.city'), value: values.city },
      { label: t('partners.ecommBrandPage.state'), value: values.state },
      { label: t('partners.ecommBrandPage.postalCode'), value: values.postal_code },
      { label: t('partners.ecommBrandPage.country'), value: values.country },
    ],
  },
  {
    key: 'payout',
    rows: [
      { label: t('partners.common.accountHolderName'), value: values.account_holder_name },
      { label: t('partners.common.accountNumber'), value: maskAccount(values.account_number) },
      { label: t('partners.common.ifscCode'), value: values.ifsc_code },
      { label: t('partners.common.upiId'), value: values.upi_id },
    ],
  },
  {
    key: 'categories',
    rows: [{ label: t('partners.ecommBrandPage.productCategories'), value: values.product_categories.join(', ') }],
  },
  {
    key: 'media',
    rows: [
      { label: t('partners.ecommBrandPage.logo'), value: values.logo_url ? t('shell.common.yes') : '' },
      { label: t('partners.ecommBrandPage.coverImage'), value: values.cover_image_url ? t('shell.common.yes') : '' },
    ],
  },
  {
    key: 'documents',
    rows: [{ label: t('shell.nav.documents'), value: values.documents.map((doc) => doc.type).join(', ') }],
  },
];
