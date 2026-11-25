import { describe, expect, it } from 'vitest';
import {
  CRM_QUALITY_BAND_TONE_KEY,
  CRM_QUALITY_CHANGE_KIND_KEY,
  CRM_QUALITY_CONFIG_STATUS_KEY,
  CRM_QUALITY_CONFIG_STATUS_TONE,
  CRM_QUALITY_THRESHOLD_HINT_KEY,
} from '../src/crm-lead-quality-settings';

/** Every value the Lead Quality settings show has a copy key (and a tone where it is a chip). */
describe('CRM Lead Quality settings labels', () => {
  it('words and colours every version status', () => {
    expect(Object.keys(CRM_QUALITY_CONFIG_STATUS_KEY)).toEqual(['PUBLISHED', 'DRAFT', 'ARCHIVED']);
    expect(Object.keys(CRM_QUALITY_CONFIG_STATUS_TONE)).toEqual(Object.keys(CRM_QUALITY_CONFIG_STATUS_KEY));
    expect(CRM_QUALITY_CONFIG_STATUS_TONE.DRAFT).toBe('warning');
  });

  it('words every settings change, threshold and band colour', () => {
    expect(Object.keys(CRM_QUALITY_CHANGE_KIND_KEY)).toEqual(['CONFIG_DRAFT', 'CONFIG_PUBLISH', 'CONFIG_DISCARD']);
    expect(Object.keys(CRM_QUALITY_THRESHOLD_HINT_KEY)).toEqual(['INSTAGRAM_FOLLOWERS_MIN', 'INSTAGRAM_RECENT_POST_DAYS', 'GOOGLE_REVIEWS_MIN']);
    expect(Object.keys(CRM_QUALITY_BAND_TONE_KEY)).toEqual(['success', 'warning', 'error']);
  });
});
