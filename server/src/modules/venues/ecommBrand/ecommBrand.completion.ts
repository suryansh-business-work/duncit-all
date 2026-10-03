/**
 * How far a brand is through the onboarding wizard.
 *
 * Twin of `brand-wizard.ts` in `@duncit/utils` (the Partners console's live
 * readout while the partner types); the server cannot import `@duncit/*`
 * (rule 40), so the two are kept in step by hand — same ten steps, same rule
 * per step. THIS copy is authoritative: it is what the Your brands table shows,
 * and what `submit` and `approve` refuse on.
 *
 * Integration (Razorpay + shipping) is the LAST step and does not gate review:
 * a brand is submitted and approved on its business facts and consent, then
 * goes LIVE in the pod shop only once its integrations are ready (`isBrandLive`).
 */
export type BrandStepKey =
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

interface BrandStep {
  key: BrandStepKey;
  /** Counted in the percentage. Payout is optional; Review is derived. */
  required: boolean;
  /** Must be done before the brand can be submitted or approved. Integration
   * is owed for the brand to go live, not for it to be reviewed. */
  gatesReview: boolean;
}

export const BRAND_STEPS: readonly BrandStep[] = [
  { key: 'details', required: true, gatesReview: true },
  { key: 'business', required: true, gatesReview: true },
  { key: 'address', required: true, gatesReview: true },
  { key: 'payout', required: false, gatesReview: false },
  { key: 'categories', required: true, gatesReview: true },
  { key: 'media', required: true, gatesReview: true },
  { key: 'documents', required: true, gatesReview: true },
  { key: 'review', required: false, gatesReview: false },
  { key: 'consent', required: true, gatesReview: true },
  { key: 'integration', required: true, gatesReview: false },
];

export interface BrandStepState {
  key: BrandStepKey;
  complete: boolean;
  required: boolean;
}

export interface BrandCompletion {
  percent: number;
  steps: BrandStepState[];
  next_step: number;
}

/** The text fields a step reads. */
type BrandTextFact =
  | 'brand_name' | 'description' | 'contact_email' | 'registered_business_name' | 'gstin' | 'pan'
  | 'address_line1' | 'city' | 'state' | 'postal_code' | 'logo_url' | 'account_number' | 'ifsc_code' | 'upi_id';

/** The facts a step is judged on — the Mongoose document and the public shape both fit. */
export type BrandFacts = Partial<Record<BrandTextFact, string | null>> & {
  product_categories?: readonly string[] | null;
  documents?: readonly unknown[] | null;
  integrations?: { shiprocket?: { connected?: boolean | null }; razorpay?: { connected?: boolean | null } } | null;
  shipping_mode?: string | null;
  consent?: { accepted?: boolean | null } | null;
};

/** What the consent step needs from outside the brand document. */
export interface ConsentContext {
  /** Legal has published a Brand Consent. Without one the step cannot be done, and is not owed. */
  available: boolean;
  /** The signature is against the consent's current wording. */
  current: boolean;
}

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const some = (list: unknown) => Array.isArray(list) && list.length > 0;

type Check = (brand: BrandFacts, consent: ConsentContext) => boolean;

const CHECK: Record<Exclude<BrandStepKey, 'review'>, Check> = {
  details: (b) => filled(b.brand_name) && filled(b.description) && filled(b.contact_email),
  business: (b) => filled(b.registered_business_name) && (filled(b.gstin) || filled(b.pan)),
  address: (b) => filled(b.address_line1) && filled(b.city) && filled(b.state) && filled(b.postal_code),
  payout: (b) => (filled(b.account_number) && filled(b.ifsc_code)) || filled(b.upi_id),
  categories: (b) => some(b.product_categories),
  media: (b) => filled(b.logo_url),
  documents: (b) => some(b.documents),
  integration: (b) => brandIntegrationReady(b),
  // No published consent = nothing to sign; the step is satisfied so a brand
  // is never blocked on a page Legal has not written yet.
  consent: (b, c) => !c.available || (b.consent?.accepted === true && c.current),
};

export function brandStepComplete(brand: BrandFacts, key: BrandStepKey, consent: ConsentContext): boolean {
  if (key === 'review') {
    return BRAND_STEPS.filter((s) => s.gatesReview && s.key !== 'consent').every((s) =>
      CHECK[s.key as Exclude<BrandStepKey, 'review'>](brand, consent)
    );
  }
  return CHECK[key](brand, consent);
}

export function brandCompletion(brand: BrandFacts, consent: ConsentContext): BrandCompletion {
  const steps = BRAND_STEPS.map((s) => ({
    key: s.key,
    required: s.required,
    complete: brandStepComplete(brand, s.key, consent),
  }));
  const required = steps.filter((s) => s.required);
  const done = required.filter((s) => s.complete).length;
  const next = steps.findIndex((s) => s.required && !s.complete);
  return {
    percent: Math.round((done / required.length) * 100),
    steps,
    next_step: next === -1 ? steps.length - 1 : next,
  };
}

/** The steps still owed before review, by key — what a submit/approve refusal names. */
export const missingBrandSteps = (brand: BrandFacts, consent: ConsentContext): BrandStepKey[] =>
  BRAND_STEPS.filter((s) => s.gatesReview && !brandStepComplete(brand, s.key, consent)).map((s) => s.key);

/** Razorpay connected, and shipping settled (own ShipRocket connected or the Duncit courier). */
export function brandIntegrationReady(b: BrandFacts): boolean {
  return (
    b.integrations?.razorpay?.connected === true &&
    shippingReady(b.shipping_mode, b.integrations?.shiprocket?.connected === true)
  );
}

/** The facts `isBrandLive` reads on top of the wizard's. */
export type BrandLiveFacts = BrandFacts & {
  status?: string | null;
  is_active?: boolean | null;
  integration_waived?: boolean | null;
};

/**
 * A brand is LIVE — its products show in the pod shop and can be bought — when
 * it is approved, not paused, and its integrations are ready. `integration_waived`
 * keeps a brand that was already selling before this rule existed live (stamped
 * once by the startup backfill), so the rule never pulls a selling brand off the shop.
 */
export function isBrandLive(b: BrandLiveFacts): boolean {
  if (b.status !== 'APPROVED' || b.is_active === false) return false;
  return b.integration_waived === true || brandIntegrationReady(b);
}

/**
 * Whether a brand's shipping is settled. Duncit's courier needs nothing from
 * the brand; its own ShipRocket must be connected. A brand from before the
 * choice existed (no mode) counts as OWN — it can only have passed this step
 * by connecting one. Twin: `brandShippingReady` in `@duncit/utils`.
 */
export function shippingReady(mode: string | null | undefined, ownConnected: boolean): boolean {
  if (mode === 'DUNCIT_COURIER') return true;
  return ownConnected;
}
