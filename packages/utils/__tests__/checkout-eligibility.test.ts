import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_REQUIREMENT_KEYS,
  missingCheckoutRequirements,
  type CheckoutEligibilityInput,
} from '../src/checkout-eligibility';

/** An account that is ready to pay; each test breaks only the fact under test. */
const account = (over: Partial<CheckoutEligibilityInput> = {}): CheckoutEligibilityInput => ({
  phoneNumber: '9876543210',
  isEmailVerified: true,
  ...over,
});

describe('CHECKOUT_REQUIREMENT_KEYS', () => {
  it('maps each requirement to its mweb.checkout key in MWEB_BUNDLE, and nothing else', () => {
    // mWeb and native share one bundle (rule 27), so the keys live under the
    // mWeb checkout page — these literals are what `@duncit/i18n` seeds as
    // mweb.checkout.needPhone / needEmailVerified. A renamed or extra entry
    // here would render the card's "before you pay" list as a raw key.
    expect(CHECKOUT_REQUIREMENT_KEYS).toEqual({
      PHONE: 'mweb.checkout.needPhone',
      EMAIL_VERIFIED: 'mweb.checkout.needEmailVerified',
    });
  });
});

describe('missingCheckoutRequirements', () => {
  it('reports nothing missing for an account with a phone and a verified email', () => {
    expect(missingCheckoutRequirements(account())).toEqual([]);
  });

  it('requires a phone number when the account never captured one', () => {
    expect(missingCheckoutRequirements(account({ phoneNumber: undefined }))).toEqual(['PHONE']);
    expect(missingCheckoutRequirements(account({ phoneNumber: null }))).toEqual(['PHONE']);
  });

  it('treats a blank or whitespace-only number as no number at all', () => {
    // An empty string is what a cleared profile field saves; it is not a
    // number anyone can call, so it must not satisfy the gate.
    expect(missingCheckoutRequirements(account({ phoneNumber: '' }))).toEqual(['PHONE']);
    expect(missingCheckoutRequirements(account({ phoneNumber: '   ' }))).toEqual(['PHONE']);
  });

  it('accepts a number padded with whitespace as present', () => {
    expect(missingCheckoutRequirements(account({ phoneNumber: '  9876543210  ' }))).toEqual([]);
  });

  it('only asks that the phone EXIST — an unverified number still passes the gate', () => {
    // The number is captured at signup and never re-proved, so demanding a
    // verified one would lock accounts out. The user document does carry
    // `is_phone_verified`; a caller that hands it over must not change the answer.
    const unverifiedPhone: CheckoutEligibilityInput & { isPhoneVerified: boolean } = {
      phoneNumber: '+1 555 0100',
      isEmailVerified: true,
      isPhoneVerified: false,
    };
    expect(missingCheckoutRequirements(unverifiedPhone)).toEqual([]);
  });

  it('requires a verified email when the flag is false, null or absent', () => {
    // The receipt goes to this address — unverified means the only proof of
    // purchase may be sent nowhere, so the gate closes until it is confirmed.
    expect(missingCheckoutRequirements(account({ isEmailVerified: false }))).toEqual(['EMAIL_VERIFIED']);
    expect(missingCheckoutRequirements(account({ isEmailVerified: null }))).toEqual(['EMAIL_VERIFIED']);
    expect(missingCheckoutRequirements(account({ isEmailVerified: undefined }))).toEqual(['EMAIL_VERIFIED']);
  });

  it('lists every unmet requirement at once, phone first, in the order to fix them', () => {
    // Reporting one at a time would send a buyer round the profile twice to
    // buy one ticket; the order is the order the card renders its steps.
    expect(missingCheckoutRequirements({})).toEqual(['PHONE', 'EMAIL_VERIFIED']);
    expect(missingCheckoutRequirements({ phoneNumber: ' ', isEmailVerified: false })).toEqual([
      'PHONE',
      'EMAIL_VERIFIED',
    ]);
  });

  it('hands out a fresh list each call, so a consumer mutating its copy cannot poison the next', () => {
    const first = missingCheckoutRequirements({});
    first.pop();
    expect(first).toEqual(['PHONE']);
    expect(missingCheckoutRequirements({})).toEqual(['PHONE', 'EMAIL_VERIFIED']);
  });

  it('reports every requirement with the exact bundle key the card renders, in fix order', () => {
    // The card does t(CHECKOUT_REQUIREMENT_KEYS[requirement]) per line, so a
    // fully-missing account must yield both lines, phone first — an empty
    // report or an unmapped requirement would leave the buyer with no steps.
    const lines = missingCheckoutRequirements({}).map((r) => CHECKOUT_REQUIREMENT_KEYS[r]);
    expect(lines).toEqual(['mweb.checkout.needPhone', 'mweb.checkout.needEmailVerified']);
  });
});
