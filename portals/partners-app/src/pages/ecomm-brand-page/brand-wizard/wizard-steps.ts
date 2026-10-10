import { get, type FieldErrors, type Path } from 'react-hook-form';
import {
  BRAND_WIZARD_STEPS,
  brandShippingReady,
  type BrandStepState,
  type BrandWizardFacts,
  type BrandWizardStepKey,
} from '@duncit/utils';
import type { BrandFormValues } from '../schema';
import type { BrandConsent, BrandIntegrations, BrandShippingMode } from '../queries';

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

/** What is wrong on each step, as the messages its heading lists. */
export type StepProblems = Record<BrandWizardStepKey, string[]>;

/** A field's validation message, when the form holds one for it. */
const messageOf = (errors: FieldErrors<BrandFormValues>, field: Path<BrandFormValues>): string | null => {
  const message: unknown = get(errors, field)?.message;
  return typeof message === 'string' && message !== '' ? message : null;
};

/**
 * Every step's problems: the validation message of each of its own fields, in
 * field order and without repeats, and — for a required step the partner has
 * already moved past while it is still incomplete — the line saying something
 * it needs is missing. A step that is open, or not reached yet, is not nagged
 * about what has simply not been typed.
 */
export function stepProblems(
  errors: FieldErrors<BrandFormValues>,
  states: readonly BrandStepState[],
  activeStep: number,
  missing: string,
): StepProblems {
  const of = (key: BrandWizardStepKey): string[] => {
    const fields = STEP_FIELDS[key];
    const messages = fields.map((field) => messageOf(errors, field)).filter((message) => message !== null);
    const index = BRAND_WIZARD_STEPS.findIndex((step) => step.key === key);
    const state = states[index];
    const skipped = index < activeStep && state?.required === true && !state.complete && fields.length > 0;
    return [...new Set(skipped ? [...messages, missing] : messages)];
  };
  return {
    details: of('details'),
    business: of('business'),
    address: of('address'),
    payout: of('payout'),
    categories: of('categories'),
    media: of('media'),
    documents: of('documents'),
    integration: of('integration'),
    review: of('review'),
    consent: of('consent'),
  };
}

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
  shipping_mode?: BrandShippingMode | null;
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
  shipping_mode: server.shipping_mode ?? null,
  shiprocket_connected: server.integrations?.shiprocket.connected ?? false,
  razorpay_connected: server.integrations?.razorpay.connected ?? false,
  consent_signed: consentSigned(server.consent),
});

/** The Integration step's verdict: Razorpay connected, and shipping settled (the Duncit courier, or ShipRocket connected). */
export const integrationReady = (
  shippingMode: BrandShippingMode | null | undefined,
  integrations: BrandIntegrations | undefined,
): boolean =>
  integrations?.razorpay.connected === true && brandShippingReady(shippingMode, integrations?.shiprocket.connected === true);
