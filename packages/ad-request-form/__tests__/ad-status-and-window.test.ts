import { describe, expect, it } from 'vitest';
import {
  AD_STATUS_COLORS,
  AD_STATUS_VALUES,
  adDurationWindow,
  adStatusOptions,
} from '../src/ad-options';
import { adRequestT as t } from '../src/i18n/useTranslation';
import { makeAdPricing } from './factories';

const AD_STATUS_OPTIONS = adStatusOptions(t);

describe('adStatusOptions', () => {
  it('lists every review state in display order with its label', () => {
    expect(AD_STATUS_OPTIONS).toEqual([
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'LIVE', label: 'Live' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'EXPIRED', label: 'Expired' },
    ]);
  });

  it('has an option for every declared status value', () => {
    for (const value of AD_STATUS_VALUES) {
      expect(AD_STATUS_OPTIONS.find((option) => option.value === value)).toBeTruthy();
    }
  });

  it('has a chip color for every status option', () => {
    for (const option of AD_STATUS_OPTIONS) {
      expect(AD_STATUS_COLORS[option.value]).toBeTruthy();
    }
  });
});

describe('adDurationWindow', () => {
  it('falls back to the shipped 1–30 window when no pricing is loaded', () => {
    expect(adDurationWindow()).toEqual({ min: 1, max: 30 });
    expect(adDurationWindow(null)).toEqual({ min: 1, max: 30 });
  });

  it('falls back for a pricing row that predates the window setting', () => {
    expect(adDurationWindow(makeAdPricing())).toEqual({ min: 1, max: 30 });
  });

  it('uses the window Marketing configured on the pricing row', () => {
    expect(adDurationWindow(makeAdPricing({ min_days: 3, max_days: 90 }))).toEqual({
      min: 3,
      max: 90,
    });
  });

  it('rounds fractional day counts to whole days', () => {
    expect(adDurationWindow(makeAdPricing({ min_days: 2.4, max_days: 44.6 }))).toEqual({
      min: 2,
      max: 45,
    });
  });

  it('treats a zero as unset and clamps a negative bound to one day', () => {
    expect(adDurationWindow(makeAdPricing({ min_days: 0, max_days: 0 }))).toEqual({
      min: 1,
      max: 30,
    });
    expect(adDurationWindow(makeAdPricing({ min_days: -5, max_days: -2 }))).toEqual({
      min: 1,
      max: 1,
    });
  });
});
