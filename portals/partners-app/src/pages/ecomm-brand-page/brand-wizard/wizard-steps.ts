import type { Path } from 'react-hook-form';
import type { BrandWizardFacts, BrandWizardStepKey } from '@duncit/utils';
import type { BrandFormValues } from '../schema';
import type { BrandConsent, BrandIntegrations } from '../queries';

export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** The form fields each step owns — what "Next" validates before moving on. */
export const STEP_FIELDS: Record<BrandWizardStepKey, Path<BrandFormValues>[]> = {
  details: [
    'brand_name',
    'tagline',
    'description',
    'website_url',
    'instagram_url',
    'contact_person',
    'contact_email',
    'contact_phone',
  ],
  business: ['registered_business_name', 'gstin', 'pan', 'established_year'],
  address: ['address_line1', 'city', 'state', 'postal_code', 'country'],
  payout: ['account_holder_name', 'account_number', 'ifsc_code', 'upi_id'],
  categories: ['product_categories'],
  media: ['logo_url', 'cover_image_url'],
  documents: ['documents'],
  integration: [],
  review: [],
  consent: [],
};

/** Literal keys, one per step — the localization gate greps for `t('…')` calls. */
export const stepLabels = (t: Translate): Record<BrandWizardStepKey, string> => ({
  details: t('partners.brandWizard.step.details'),
  business: t('partners.brandWizard.step.business'),
  address: t('partners.brandWizard.step.address'),
  payout: t('partners.brandWizard.step.payout'),
  categories: t('partners.brandWizard.step.categories'),
  media: t('partners.brandWizard.step.media'),
  documents: t('partners.brandWizard.step.documents'),
  integration: t('partners.brandWizard.step.integration'),
  review: t('partners.brandWizard.step.review'),
  consent: t('partners.brandWizard.step.consent'),
});

/** The facts only the server knows — what the wizard cannot judge from the form. */
export interface BrandServerFacts {
  integrations?: BrandIntegrations;
  consent?: BrandConsent;
}

/** Signed against the current wording, or nothing to sign yet because Legal has not published one. */
export const consentSigned = (consent: BrandConsent | undefined): boolean => {
  if (!consent) return false;
  return consent.available === false || (consent.accepted && consent.current);
};

/** Live form values + server facts, in the shape `@duncit/utils` judges a step on. */
export const toFacts = (values: BrandFormValues, server: BrandServerFacts): BrandWizardFacts => ({
  ...values,
  shiprocket_connected: server.integrations?.shiprocket.connected ?? false,
  razorpay_connected: server.integrations?.razorpay.connected ?? false,
  consent_signed: consentSigned(server.consent),
});
