/**
 * The brand-partner onboarding wizard, framework-free.
 *
 * Ten steps, the same ten on the Partners console (MUI) and on the Products
 * console's review page, so the two never disagree about what "complete"
 * means. What each step needs is judged from the brand's saved facts, and the
 * percentage in the "Your brands" table is the required steps that are done.
 *
 * Twin of `ecommBrand.completion.ts` on the server (rule 40: the server imports
 * no `@duncit/*` package). The server's number is what the table shows; this
 * copy is what the wizard shows live while the partner is still typing.
 *
 * Integration (Razorpay + shipping) is the LAST step and does not gate review:
 * the brand is submitted and approved on its business facts and consent, and
 * goes live in the pod shop once its integrations are ready.
 */
export type BrandWizardStepKey =
  | 'details'
  | 'business'
  | 'address'
  | 'payout'
  | 'categories'
  | 'media'
  | 'documents'
  | 'review'
  | 'consent'
  | 'integration';

export interface BrandWizardStep {
  key: BrandWizardStepKey;
  /** The `partners.brandWizard.step.<key>` label key. */
  labelKey: string;
  /** Counted in the completion percentage. Payout is optional; Review is derived. */
  required: boolean;
  /** Must be done before the brand can be submitted. Integration is owed for going live, not for review. */
  gatesReview: boolean;
}

export const BRAND_WIZARD_STEPS: readonly BrandWizardStep[] = [
  { key: 'details', labelKey: 'partners.brandWizard.step.details', required: true, gatesReview: true },
  { key: 'business', labelKey: 'partners.brandWizard.step.business', required: true, gatesReview: true },
  { key: 'address', labelKey: 'partners.brandWizard.step.address', required: true, gatesReview: true },
  { key: 'payout', labelKey: 'partners.brandWizard.step.payout', required: false, gatesReview: false },
  { key: 'categories', labelKey: 'partners.brandWizard.step.categories', required: true, gatesReview: true },
  { key: 'media', labelKey: 'partners.brandWizard.step.media', required: true, gatesReview: true },
  { key: 'documents', labelKey: 'partners.brandWizard.step.documents', required: true, gatesReview: true },
  { key: 'review', labelKey: 'partners.brandWizard.step.review', required: false, gatesReview: false },
  { key: 'consent', labelKey: 'partners.brandWizard.step.consent', required: true, gatesReview: true },
  { key: 'integration', labelKey: 'partners.brandWizard.step.integration', required: true, gatesReview: false },
];

/** The facts a step is judged on — a subset of the brand, whatever holds it. */
export interface BrandWizardFacts {
  brand_name?: string | null;
  description?: string | null;
  contact_email?: string | null;
  registered_business_name?: string | null;
  gstin?: string | null;
  pan?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  product_categories?: readonly string[] | null;
  logo_url?: string | null;
  documents?: readonly unknown[] | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  upi_id?: string | null;
  /** OWN_SHIPROCKET | DUNCIT_COURIER — null until the brand chooses. */
  shipping_mode?: string | null;
  shiprocket_connected?: boolean | null;
  razorpay_connected?: boolean | null;
  consent_signed?: boolean | null;
}

export interface BrandStepState {
  key: BrandWizardStepKey;
  complete: boolean;
  required: boolean;
}

const filled = (value: string | null | undefined) => typeof value === 'string' && value.trim().length > 0;
const some = (list: readonly unknown[] | null | undefined) => Array.isArray(list) && list.length > 0;

const payoutComplete = (f: BrandWizardFacts) =>
  (filled(f.account_number) && filled(f.ifsc_code)) || filled(f.upi_id);

const STEP_CHECK: Record<Exclude<BrandWizardStepKey, 'review'>, (f: BrandWizardFacts) => boolean> = {
  details: (f) => filled(f.brand_name) && filled(f.description) && filled(f.contact_email),
  business: (f) => filled(f.registered_business_name) && (filled(f.gstin) || filled(f.pan)),
  address: (f) => filled(f.address_line1) && filled(f.city) && filled(f.state) && filled(f.postal_code),
  payout: payoutComplete,
  categories: (f) => some(f.product_categories),
  media: (f) => filled(f.logo_url),
  documents: (f) => some(f.documents),
  integration: (f) => brandIntegrationReady(f),
  consent: (f) => f.consent_signed === true,
};

/** Whether one step is done. Review is done once every review step before it is. */
export function brandStepComplete(facts: BrandWizardFacts, key: BrandWizardStepKey): boolean {
  if (key === 'review') {
    return BRAND_WIZARD_STEPS.filter((step) => step.gatesReview && step.key !== 'consent').every((step) =>
      STEP_CHECK[step.key as Exclude<BrandWizardStepKey, 'review'>](facts),
    );
  }
  return STEP_CHECK[key](facts);
}

export function brandStepStates(facts: BrandWizardFacts): BrandStepState[] {
  return BRAND_WIZARD_STEPS.map((step) => ({
    key: step.key,
    required: step.required,
    complete: brandStepComplete(facts, step.key),
  }));
}

/** Required steps done, as a whole percentage. 100 means the brand is ready to go live. */
export function brandCompletionPercent(facts: BrandWizardFacts): number {
  const required = BRAND_WIZARD_STEPS.filter((step) => step.required);
  const done = required.filter((step) => brandStepComplete(facts, step.key)).length;
  return Math.round((done / required.length) * 100);
}

/** The first step still to do — where the wizard opens a saved draft. */
export function brandNextStepIndex(facts: BrandWizardFacts): number {
  const index = BRAND_WIZARD_STEPS.findIndex((step) => step.required && !brandStepComplete(facts, step.key));
  return index === -1 ? BRAND_WIZARD_STEPS.length - 1 : index;
}

/** Every step the review needs is done — the brand can be submitted (integration may still be pending). */
export function brandReviewReady(facts: BrandWizardFacts): boolean {
  return BRAND_WIZARD_STEPS.filter((step) => step.gatesReview).every((step) => brandStepComplete(facts, step.key));
}

/** Razorpay connected and shipping settled — what an approved brand needs to go live. Server twin: `brandIntegrationReady`. */
export function brandIntegrationReady(facts: BrandWizardFacts): boolean {
  return facts.razorpay_connected === true && brandShippingReady(facts.shipping_mode, facts.shiprocket_connected === true);
}

/** The slug of the Legal-portal policy a brand partner signs before submitting. */
export const BRAND_CONSENT_POLICY_SLUG = 'brand-partner-consent';

/**
 * Whether a brand's shipping is settled: Duncit's courier needs nothing from
 * the brand, its own ShipRocket must be connected. No mode (a brand from
 * before the choice) counts as its own account. Server twin: `shippingReady`
 * in ecommBrand.completion.ts.
 */
export function brandShippingReady(mode: string | null | undefined, ownConnected: boolean): boolean {
  if (mode === 'DUNCIT_COURIER') return true;
  return ownConnected;
}
