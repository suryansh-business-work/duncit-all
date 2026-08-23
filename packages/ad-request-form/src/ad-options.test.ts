import { describe, expect, it } from 'vitest';
import {
  AD_PRICING_KEY_BY_POSITION,
  adMediaTypeOptions,
  adPositionOptions,
  adPositionLabel,
  adTypeLabel,
  formatAdCost,
} from './ad-options';
import { adRequestT as t } from './i18n/useTranslation';

const AD_POSITION_OPTIONS = adPositionOptions(t);
const AD_MEDIA_TYPE_OPTIONS = adMediaTypeOptions(t);

describe('adPositionLabel', () => {
  it('maps a known position to its display label', () => {
    expect(adPositionLabel('EXPLORE_SCROLL', t)).toBe('Explore Scroll');
    expect(adPositionLabel('AUTO', t)).toBe('Auto (all placements)');
  });

  it('falls back to the raw value for a position it does not know', () => {
    expect(adPositionLabel('SOMETHING_NEW', t)).toBe('SOMETHING_NEW');
  });

  it('has a label for every position option', () => {
    for (const option of AD_POSITION_OPTIONS) {
      expect(adPositionLabel(option.value, t)).toBe(option.label);
    }
  });

  it('has a pricing key for every position option', () => {
    for (const option of AD_POSITION_OPTIONS) {
      expect(AD_PRICING_KEY_BY_POSITION[option.value]).toBeTruthy();
    }
  });
});

describe('adTypeLabel', () => {
  it('maps a known media type to its display label', () => {
    expect(adTypeLabel('IMAGE', t)).toBe('Image');
    expect(adTypeLabel('VIDEO', t)).toBe('Video');
  });

  it('falls back to the raw value for a media type it does not know', () => {
    expect(adTypeLabel('GIF', t)).toBe('GIF');
  });

  it('has a label for every media type option', () => {
    for (const option of AD_MEDIA_TYPE_OPTIONS) {
      expect(adTypeLabel(option.value, t)).toBe(option.label);
    }
  });
});

describe('formatAdCost', () => {
  it('shows a whole amount without decimals', () => {
    expect(formatAdCost(1200, '₹')).toBe('₹1,200');
  });

  it('shows a fractional amount with two decimals', () => {
    expect(formatAdCost(1200.5, '₹')).toBe('₹1,200.50');
  });

  it('uses the symbol it is given', () => {
    expect(formatAdCost(0, '$')).toBe('$0');
  });
});
