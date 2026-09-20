import { describe, expect, it } from 'vitest';
import {
  BRAND_CONSENT_POLICY_SLUG,
  BRAND_WIZARD_STEPS,
  brandCompletionPercent,
  brandNextStepIndex,
  brandStepComplete,
  brandStepStates,
  type BrandWizardFacts,
} from '../src/brand-wizard';

/** A brand that has done every step, bank payout included. */
const complete: BrandWizardFacts = {
  brand_name: 'Yonex',
  description: 'Badminton racquets, shuttles and grips for club players.',
  contact_email: 'ops@yonex.in',
  registered_business_name: 'Yonex India Pvt Ltd',
  gstin: '29AABCY1234F1ZP',
  pan: '',
  address_line1: '14 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  product_categories: ['Sports Equipment'],
  logo_url: 'https://ik.imagekit.io/duncit/brands/yonex-logo.png',
  documents: [{ type: 'GST certificate', url: 'https://ik.imagekit.io/duncit/brands/yonex-gst.pdf' }],
  account_number: '123456789012',
  ifsc_code: 'HDFC0001234',
  upi_id: '',
  shiprocket_connected: true,
  razorpay_connected: true,
  consent_signed: true,
};

describe('BRAND_WIZARD_STEPS', () => {
  it('is the ten steps in wizard order, with payout and review optional', () => {
    expect(BRAND_WIZARD_STEPS.map((step) => step.key)).toEqual([
      'details',
      'business',
      'address',
      'payout',
      'categories',
      'media',
      'documents',
      'integration',
      'review',
      'consent',
    ]);
    expect(BRAND_WIZARD_STEPS.filter((step) => !step.required).map((step) => step.key)).toEqual(['payout', 'review']);
    expect(BRAND_WIZARD_STEPS.every((step) => step.labelKey === `partners.brandWizard.step.${step.key}`)).toBe(true);
    expect(BRAND_CONSENT_POLICY_SLUG).toBe('brand-partner-consent');
  });
});

describe('brandStepComplete', () => {
  it('is done on every step for a fully filled brand', () => {
    for (const step of BRAND_WIZARD_STEPS) {
      expect(brandStepComplete(complete, step.key)).toBe(true);
    }
  });

  it('is done on no step for a blank brand', () => {
    for (const step of BRAND_WIZARD_STEPS) {
      expect(brandStepComplete({}, step.key)).toBe(false);
    }
  });

  it('reads blank, whitespace and non-string values as not filled', () => {
    expect(brandStepComplete({ ...complete, brand_name: '   ' }, 'details')).toBe(false);
    expect(brandStepComplete({ ...complete, description: null }, 'details')).toBe(false);
    expect(brandStepComplete({ ...complete, contact_email: undefined }, 'details')).toBe(false);
    expect(brandStepComplete({ ...complete, product_categories: [] }, 'categories')).toBe(false);
    expect(brandStepComplete({ ...complete, product_categories: null }, 'categories')).toBe(false);
    expect(brandStepComplete({ ...complete, documents: [] }, 'documents')).toBe(false);
    expect(brandStepComplete({ ...complete, logo_url: '' }, 'media')).toBe(false);
  });

  it('takes either a GSTIN or a PAN for the business step', () => {
    expect(brandStepComplete({ ...complete, gstin: '', pan: 'AAAAA0000A' }, 'business')).toBe(true);
    expect(brandStepComplete({ ...complete, gstin: '', pan: '' }, 'business')).toBe(false);
    expect(brandStepComplete({ ...complete, registered_business_name: '' }, 'business')).toBe(false);
  });

  it('needs the whole address', () => {
    expect(brandStepComplete({ ...complete, address_line1: '' }, 'address')).toBe(false);
    expect(brandStepComplete({ ...complete, city: '' }, 'address')).toBe(false);
    expect(brandStepComplete({ ...complete, state: '' }, 'address')).toBe(false);
    expect(brandStepComplete({ ...complete, postal_code: '' }, 'address')).toBe(false);
  });

  it('accepts a bank account with IFSC or a UPI id for payout', () => {
    expect(brandStepComplete({ ...complete, account_number: '', ifsc_code: '', upi_id: 'yonex@hdfc' }, 'payout')).toBe(true);
    expect(brandStepComplete({ ...complete, ifsc_code: '' }, 'payout')).toBe(false);
    expect(brandStepComplete({ ...complete, account_number: '', ifsc_code: '', upi_id: '' }, 'payout')).toBe(false);
  });

  it('needs BOTH ShipRocket and Razorpay connected', () => {
    expect(brandStepComplete({ ...complete, razorpay_connected: false }, 'integration')).toBe(false);
    expect(brandStepComplete({ ...complete, shiprocket_connected: false }, 'integration')).toBe(false);
    expect(brandStepComplete({ ...complete, shiprocket_connected: null, razorpay_connected: null }, 'integration')).toBe(false);
  });

  it('counts review as done once every required step before the consent is', () => {
    expect(brandStepComplete({ ...complete, consent_signed: false }, 'review')).toBe(true);
    expect(brandStepComplete({ ...complete, razorpay_connected: false }, 'review')).toBe(false);
    expect(brandStepComplete({ ...complete, consent_signed: false }, 'consent')).toBe(false);
  });
});

describe('brandStepStates / brandCompletionPercent / brandNextStepIndex', () => {
  it('reads 100% and opens on the last step for a finished brand', () => {
    expect(brandCompletionPercent(complete)).toBe(100);
    expect(brandNextStepIndex(complete)).toBe(BRAND_WIZARD_STEPS.length - 1);
    expect(brandStepStates(complete).every((state) => state.complete)).toBe(true);
  });

  it('reads 0% and opens on the first step for a blank brand', () => {
    expect(brandCompletionPercent({})).toBe(0);
    expect(brandNextStepIndex({})).toBe(0);
    const states = brandStepStates({});
    expect(states).toHaveLength(10);
    expect(states.find((state) => state.key === 'payout')).toEqual({ key: 'payout', required: false, complete: false });
  });

  it('never lowers the percentage for a missing payout, and opens on the first required gap', () => {
    const noPayout: BrandWizardFacts = { ...complete, account_number: '', ifsc_code: '', upi_id: '' };
    expect(brandCompletionPercent(noPayout)).toBe(100);

    const unsigned: BrandWizardFacts = { ...noPayout, razorpay_connected: false, consent_signed: false };
    expect(brandCompletionPercent(unsigned)).toBe(75);
    expect(brandNextStepIndex(unsigned)).toBe(BRAND_WIZARD_STEPS.findIndex((step) => step.key === 'integration'));
    expect(
      brandStepStates(unsigned)
        .filter((state) => state.required && !state.complete)
        .map((state) => state.key),
    ).toEqual(['integration', 'consent']);
  });
});
