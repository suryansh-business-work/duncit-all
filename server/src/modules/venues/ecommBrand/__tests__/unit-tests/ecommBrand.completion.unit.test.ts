import {
  BRAND_STEPS,
  brandCompletion,
  brandIntegrationReady,
  brandStepComplete,
  isBrandLive,
  missingBrandSteps,
  type BrandFacts,
} from '../../ecommBrand.completion';

/**
 * The brand wizard's rules: integration is the LAST step, counts toward the
 * percentage, but is not owed for review — and `isBrandLive` is the one rule
 * that decides whether an approved brand sells in the pod shop.
 */

const NOT_PUBLISHED = { available: false, current: false };
const PUBLISHED = { available: true, current: true };

/** Every step a reviewer needs, and no vendor connected. */
const REVIEW_READY: BrandFacts = {
  brand_name: 'Acme Co',
  description: 'Handmade home decor.',
  contact_email: 'owner@acme.com',
  registered_business_name: 'Acme Co Pvt Ltd',
  gstin: '29AABCA1234F1ZP',
  address_line1: '12 Market Street',
  city: 'Pune',
  state: 'Maharashtra',
  postal_code: '411001',
  product_categories: ['Decor'],
  logo_url: 'https://ik.imagekit.io/duncit/brands/acme-logo.png',
  documents: [{ type: 'GST certificate', url: 'https://ik.imagekit.io/duncit/brands/acme-gst.pdf' }],
};

const CONNECTED = { integrations: { razorpay: { connected: true }, shiprocket: { connected: true } } };

describe('BRAND_STEPS', () => {
  it('runs details → … → consent and ends on integration', () => {
    expect(BRAND_STEPS.map((s) => s.key)).toEqual([
      'details',
      'business',
      'address',
      'payout',
      'categories',
      'media',
      'documents',
      'review',
      'consent',
      'integration',
    ]);
  });

  it('marks integration required for the percentage but not a review gate', () => {
    const integration = BRAND_STEPS.find((s) => s.key === 'integration');
    expect(integration).toEqual({ key: 'integration', required: true, gatesReview: false });
    expect(BRAND_STEPS.filter((s) => s.gatesReview).map((s) => s.key)).toEqual([
      'details',
      'business',
      'address',
      'categories',
      'media',
      'documents',
      'consent',
    ]);
  });
});

describe('missingBrandSteps (what submit/approve refuse on)', () => {
  it('owes nothing for a review-ready brand with no vendor connected', () => {
    expect(missingBrandSteps(REVIEW_READY, NOT_PUBLISHED)).toEqual([]);
  });

  it('names every unfinished review step of an empty brand, never integration or payout', () => {
    expect(missingBrandSteps({}, NOT_PUBLISHED)).toEqual([
      'details',
      'business',
      'address',
      'categories',
      'media',
      'documents',
    ]);
  });

  it('owes the consent once Legal has published one and it is unsigned or stale', () => {
    expect(missingBrandSteps(REVIEW_READY, PUBLISHED)).toEqual(['consent']);
    const signed = { ...REVIEW_READY, consent: { accepted: true } };
    expect(missingBrandSteps(signed, PUBLISHED)).toEqual([]);
    expect(missingBrandSteps(signed, { available: true, current: false })).toEqual(['consent']);
  });
});

describe('the derived review step', () => {
  it('completes on the review-gating steps alone — integration is not needed', () => {
    expect(brandStepComplete(REVIEW_READY, 'review', NOT_PUBLISHED)).toBe(true);
    expect(brandStepComplete(REVIEW_READY, 'integration', NOT_PUBLISHED)).toBe(false);
  });

  it('stays incomplete while any review-gating step other than consent is missing', () => {
    expect(brandStepComplete({ ...REVIEW_READY, documents: [] }, 'review', NOT_PUBLISHED)).toBe(false);
    // Consent is its own step after review: an unsigned consent does not undo review.
    expect(brandStepComplete(REVIEW_READY, 'review', PUBLISHED)).toBe(true);
  });
});

describe('brandCompletion', () => {
  it('counts integration in the percentage and points the next step at it last', () => {
    const pending = brandCompletion(REVIEW_READY, NOT_PUBLISHED);
    // 7 of the 8 required steps (integration outstanding).
    expect(pending.percent).toBe(88);
    expect(pending.steps.find((s) => s.key === 'integration')).toEqual({
      key: 'integration',
      required: true,
      complete: false,
    });
    expect(pending.next_step).toBe(BRAND_STEPS.findIndex((s) => s.key === 'integration'));

    const done = brandCompletion({ ...REVIEW_READY, ...CONNECTED }, NOT_PUBLISHED);
    expect(done.percent).toBe(100);
    expect(done.steps.every((s) => !s.required || s.complete)).toBe(true);
  });

  it('starts an empty brand on the first step at 0% (consent satisfied while unpublished)', () => {
    const empty = brandCompletion({}, NOT_PUBLISHED);
    expect(empty.next_step).toBe(0);
    // Only the unpublished consent counts as done: 1 of 8.
    expect(empty.percent).toBe(13);
  });
});

describe('brandIntegrationReady', () => {
  it.each<[string, BrandFacts, boolean]>([
    ['Razorpay + own ShipRocket connected', { integrations: { razorpay: { connected: true }, shiprocket: { connected: true } }, shipping_mode: 'OWN_SHIPROCKET' }, true],
    ['Razorpay + the Duncit courier (no ShipRocket of its own)', { integrations: { razorpay: { connected: true } }, shipping_mode: 'DUNCIT_COURIER' }, true],
    ['Razorpay + no mode chosen + ShipRocket connected (pre-choice brand)', { integrations: { razorpay: { connected: true }, shiprocket: { connected: true } } }, true],
    ['Razorpay + own ShipRocket not connected', { integrations: { razorpay: { connected: true } }, shipping_mode: 'OWN_SHIPROCKET' }, false],
    ['ShipRocket connected but no Razorpay', { integrations: { shiprocket: { connected: true } } }, false],
    ['the courier chosen but no Razorpay', { shipping_mode: 'DUNCIT_COURIER' }, false],
    ['no integrations at all', { integrations: null }, false],
  ])('%s → %s', (_label, facts, expected) => {
    expect(brandIntegrationReady(facts)).toBe(expected);
  });
});

describe('isBrandLive', () => {
  const ready = { ...REVIEW_READY, ...CONNECTED };

  it('is live when approved, active and its integrations are ready', () => {
    expect(isBrandLive({ ...ready, status: 'APPROVED', is_active: true })).toBe(true);
    // A brand saved before `is_active` existed reads as active.
    expect(isBrandLive({ ...ready, status: 'APPROVED' })).toBe(true);
  });

  it.each(['DRAFT', 'SUBMITTED', 'REJECTED', undefined])('is never live while %s, even connected and waived', (status) => {
    expect(isBrandLive({ ...ready, status, is_active: true, integration_waived: true })).toBe(false);
  });

  it('is not live while paused, waived or not', () => {
    expect(isBrandLive({ ...ready, status: 'APPROVED', is_active: false })).toBe(false);
    expect(isBrandLive({ status: 'APPROVED', is_active: false, integration_waived: true })).toBe(false);
  });

  it('needs ready integrations unless the brand was waived', () => {
    expect(isBrandLive({ ...REVIEW_READY, status: 'APPROVED', is_active: true })).toBe(false);
    expect(isBrandLive({ ...REVIEW_READY, status: 'APPROVED', is_active: true, integration_waived: false })).toBe(false);
    expect(isBrandLive({ ...REVIEW_READY, status: 'APPROVED', is_active: true, integration_waived: true })).toBe(true);
  });
});
