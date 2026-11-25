import { describe, expect, it } from 'vitest';
import {
  CRM_AUTO_CHECK_KEY,
  CRM_GATE_KEY,
  CRM_GATE_TONE,
  CRM_QUALITY_STATUS_KEY,
  CRM_QUALITY_STATUS_TONE,
  CRM_QUALITY_TRIGGER_KEY,
  CRM_VERIFICATION_KEY,
  CRM_VIA_KEY,
  crmEvidenceByKey,
  crmFormatPoints,
  crmItemNamesOf,
  crmKeyOr,
  crmListedRefusals,
  crmQualityTone,
  crmRingValue,
} from '../src/crm-quality-detail';

/** One lead's quality score as its detail page shows it, on the CRM portal and in the CRM app. */
describe('crm quality detail', () => {
  it('words and colours every status, gate, check, decider and trigger the API returns', () => {
    expect(Object.keys(CRM_VERIFICATION_KEY)).toEqual(['COMPLETE', 'IN_PROGRESS', 'PENDING']);
    expect(Object.keys(CRM_QUALITY_STATUS_KEY)).toEqual(['VERIFIED', 'PARTIAL', 'PENDING', 'FAILED']);
    expect(Object.keys(CRM_QUALITY_STATUS_TONE)).toEqual(Object.keys(CRM_QUALITY_STATUS_KEY));
    expect(Object.keys(CRM_GATE_TONE)).toEqual(Object.keys(CRM_GATE_KEY));
    expect(CRM_AUTO_CHECK_KEY.GOOGLE_MAPS_LISTING).toBe('crm.leadQuality.autoGoogleMaps');
    expect(Object.keys(CRM_VIA_KEY)).toEqual(['MANUAL', 'MCP', 'SYSTEM', 'AI']);
    expect(CRM_QUALITY_TRIGGER_KEY.CONFIG_PUBLISH).toBe('crm.leadQualityTab.triggerConfigPublish');
  });

  it('falls back to the given key for a value this build does not know', () => {
    expect(crmKeyOr(CRM_GATE_KEY, 'PASSED', 'x')).toBe('crm.leadQuality.gatePassed');
    expect(crmKeyOr(CRM_GATE_KEY, 'SKIPPED', 'crm.leadQuality.gatePending')).toBe('crm.leadQuality.gatePending');
    expect(crmKeyOr(CRM_GATE_KEY, null, 'fallback')).toBe('fallback');
    expect(crmKeyOr(CRM_GATE_KEY, undefined, 'fallback')).toBe('fallback');
  });

  it('colours the ring by its band, an unknown band as the lowest', () => {
    expect(crmQualityTone('success')).toBe('success');
    expect(crmQualityTone('warning')).toBe('warning');
    expect(crmQualityTone('error')).toBe('error');
    expect(crmQualityTone('info')).toBe('error');
    expect(crmQualityTone(null)).toBe('error');
  });

  it('prints whole points whole and halves with one decimal', () => {
    expect(crmFormatPoints(10)).toBe('10');
    expect(crmFormatPoints(7.5)).toBe(new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(7.5));
    expect(crmFormatPoints(null)).toBe('—');
    expect(crmFormatPoints(undefined)).toBe('—');
    expect(crmFormatPoints(Number.NaN)).toBe('—');
  });

  it('keeps the ring within 0 and 100, and empty for an unscored lead', () => {
    expect(crmRingValue(72)).toBe(72);
    expect(crmRingValue(140)).toBe(100);
    expect(crmRingValue(-3)).toBe(0);
    expect(crmRingValue(null)).toBeNull();
    expect(crmRingValue(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('indexes evidence by item and names items by key', () => {
    const evidence = crmEvidenceByKey([{ item_key: 'maps', evidence: 'Listed' }]);
    expect(evidence.get('maps')?.evidence).toBe('Listed');
    expect(crmItemNamesOf(null).size).toBe(0);
    const names = crmItemNamesOf({ criteria: [{ items: [{ key: 'maps', name: 'Google Maps' }, { key: 'ig', name: 'Instagram' }] }] });
    expect([...names.entries()]).toEqual([
      ['maps', 'Google Maps'],
      ['ig', 'Instagram'],
    ]);
  });

  it('reads the listed refusals of a refused decision, and nothing else', () => {
    expect(crmListedRefusals(undefined)).toBeNull();
    expect(crmListedRefusals({ code: 'FORBIDDEN' })).toBeNull();
    expect(crmListedRefusals({ errors: 'one message' })).toBeNull();
    expect(crmListedRefusals({ errors: [' ', 3] })).toBeNull();
    expect(crmListedRefusals({ errors: ['Evidence is too short', '', 4, 'Source must be http(s)'] })).toEqual([
      'Evidence is too short',
      'Source must be http(s)',
    ]);
  });
});
