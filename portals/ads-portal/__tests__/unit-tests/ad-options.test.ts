import { describe, expect, it } from 'vitest';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import {
  AD_PRICING_KEY_BY_POSITION,
  AD_STATUS_COLORS,
  adPositionLabel,
  adTypeLabel,
  formatAdCost,
} from '../../src/pages/ads/ad-options';

/** The provider-free translator the portal falls back to, so the labels asserted
 * here are the copy that ships. */
const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

describe('adPositionLabel', () => {
  it('maps a known position to its label', () => {
    expect(adPositionLabel('POD_DETAILS', t)).toBe('Pod Details');
    expect(adPositionLabel('AUTO', t)).toBe('Auto (all placements)');
  });

  it('falls back to the raw value for an unknown position', () => {
    expect(adPositionLabel('MYSTERY', t)).toBe('MYSTERY');
  });
});

describe('adTypeLabel', () => {
  it('maps a known type to its label', () => {
    expect(adTypeLabel('IMAGE', t)).toBe('Image');
    expect(adTypeLabel('VIDEO', t)).toBe('Video');
  });

  it('falls back to the raw value for an unknown type', () => {
    expect(adTypeLabel('AUDIO', t)).toBe('AUDIO');
  });
});

describe('formatAdCost', () => {
  it('shows no decimals for a whole amount', () => {
    expect(formatAdCost(1500, '₹')).toBe('₹1,500');
  });

  it('shows two decimals for a fractional amount', () => {
    expect(formatAdCost(1500.5, '₹')).toBe('₹1,500.50');
  });
});

describe('static maps', () => {
  it('maps every position to a pricing key and every status to a colour', () => {
    expect(AD_PRICING_KEY_BY_POSITION.AUTO).toBe('auto_per_day');
    expect(AD_PRICING_KEY_BY_POSITION.POD_DETAILS).toBe('pod_details_per_day');
    expect(AD_STATUS_COLORS.LIVE).toBe('success');
  });
});
