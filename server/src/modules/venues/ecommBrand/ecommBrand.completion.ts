/**
 * How far a brand is through the onboarding wizard.
 *
 * Twin of `brand-wizard.ts` in `@duncit/utils` (the Partners console's live
 * readout while the partner types); the server cannot import `@duncit/*`
 * (rule 40), so the two are kept in step by hand — same ten steps, same rule
 * per step. THIS copy is authoritative: it is what the Your brands table shows,
 * and what `submit` and `approve` refuse on.
 */
export type BrandStepKey =
  | 'details'
  | 'business'
  | 'address'
  | 'payout'
  | 'categories'
  | 'media'
  | 'documents'
  | 'integration'
  | 'review'
  | 'consent';

interface BrandStep {
  key: BrandStepKey;
  /** Counted in the percentage. Payout is optional; Review is derived. */
  required: boolean;
}

export const BRAND_STEPS: readonly BrandStep[] = [
  { key: 'details', required: true },
  { key: 'business', required: true },
  { key: 'address', required: true },
  { key: 'payout', required: false },
  { key: 'categories', required: true },
  { key: 'media', required: true },
  { key: 'documents', required: true },
  { key: 'integration', required: true },
  { key: 'review', required: false },
  { key: 'consent', required: true },
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

/** The facts a step is judged on — the Mongoose document and the public shape both fit. */
export interface BrandFacts {
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
  integrations?: { shiprocket?: { connected?: boolean | null }; razorpay?: { connected?: boolean | null } } | null;
  consent?: { accepted?: boolean | null } | null;
}

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
  integration: (b) => b.integrations?.shiprocket?.connected === true && b.integrations?.razorpay?.connected === true,
  // No published consent = nothing to sign; the step is satisfied so a brand
  // is never blocked on a page Legal has not written yet.
  consent: (b, c) => !c.available || (b.consent?.accepted === true && c.current),
};

export function brandStepComplete(brand: BrandFacts, key: BrandStepKey, consent: ConsentContext): boolean {
  if (key === 'review') {
    return BRAND_STEPS.filter((s) => s.required && s.key !== 'consent').every((s) =>
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

/** The required steps still missing, by key — what a refusal names. */
export const missingBrandSteps = (brand: BrandFacts, consent: ConsentContext): BrandStepKey[] =>
  brandCompletion(brand, consent)
    .steps.filter((s) => s.required && !s.complete)
    .map((s) => s.key);
