import { describe, expect, it } from 'vitest';
import { approveBlockedReasons } from '../../src/pages/ecomm/reviewBrandRules';
import type { BrandConsent, BrandStepState, EcommBrandRow } from '../../src/pages/ecomm/queries';
import { makeEcommBrandRow } from '../mocks/ecommBrand.mock';

const t = (key: string) => key;

const STEP_KEYS = ['details', 'business', 'address', 'payout', 'categories', 'media', 'documents', 'review', 'consent', 'integration'];
const OPTIONAL = new Set(['payout', 'review']);

const steps = (incomplete: string[] = []): BrandStepState[] =>
  STEP_KEYS.map((key) => ({ key, required: !OPTIONAL.has(key), complete: !incomplete.includes(key) }));

const consent = (over: Partial<BrandConsent> = {}): BrandConsent => ({
  accepted: true,
  signed_name: 'Asha Rao',
  signed_at: '2026-10-01T10:00:00.000Z',
  policy_slug: 'brand-partner-consent',
  policy_title: 'Brand Consent',
  content_hash: 'a1b2',
  current: true,
  available: true,
  ...over,
});

const brand = (incomplete: string[] = [], consentOver: Partial<BrandConsent> = {}): EcommBrandRow =>
  makeEcommBrandRow({
    status: 'SUBMITTED',
    completion: { percent: 88, next_step: 9, steps: steps(incomplete) },
    consent: consent(consentOver),
  });

describe('approveBlockedReasons', () => {
  it('lets a reviewer approve a brand whose integrations are still pending — they gate going live, not approval', () => {
    expect(approveBlockedReasons(brand(['integration']), t)).toEqual([]);
  });

  it('blocks while a business step is unfinished', () => {
    expect(approveBlockedReasons(brand(['documents']), t)).toEqual(['products.brandReview.reasonSteps']);
  });

  it('blocks on an unsigned or outdated consent, reported once as the consent reason', () => {
    expect(approveBlockedReasons(brand(['consent'], { accepted: false }), t)).toEqual([
      'products.brandReview.reasonConsent',
    ]);
    expect(approveBlockedReasons(brand([], { current: false }), t)).toEqual(['products.brandReview.reasonConsent']);
  });

  it('owes no consent when Legal has published none', () => {
    expect(approveBlockedReasons(brand([], { available: false, accepted: false }), t)).toEqual([]);
  });

  it('lists every reason at once', () => {
    expect(approveBlockedReasons(brand(['media', 'integration'], { accepted: false }), t)).toEqual([
      'products.brandReview.reasonSteps',
      'products.brandReview.reasonConsent',
    ]);
  });
});
