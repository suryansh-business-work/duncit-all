import { describe, expect, it } from 'vitest';
import {
  AD_MEDIA_TYPE_OPTIONS,
  AD_PRICING_KEY_BY_POSITION,
  AD_POSITION_OPTIONS,
  adPositionLabel,
  adTypeLabel,
  formatAdCost,
} from './ad-options';

describe('adPositionLabel', () => {
  it('maps a known position to its display label', () => {
    expect(adPositionLabel('EXPLORE_SCROLL')).toBe('Explore Scroll');
    expect(adPositionLabel('AUTO')).toBe('Auto (all placements)');
  });

  it('falls back to the raw value for a position it does not know', () => {
    expect(adPositionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('has a label for every position option', () => {
    for (const option of AD_POSITION_OPTIONS) {
      expect(adPositionLabel(option.value)).toBe(option.label);
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
    expect(adTypeLabel('IMAGE')).toBe('Image');
    expect(adTypeLabel('VIDEO')).toBe('Video');
  });

  it('falls back to the raw value for a media type it does not know', () => {
    expect(adTypeLabel('GIF')).toBe('GIF');
  });

  it('has a label for every media type option', () => {
    for (const option of AD_MEDIA_TYPE_OPTIONS) {
      expect(adTypeLabel(option.value)).toBe(option.label);
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
