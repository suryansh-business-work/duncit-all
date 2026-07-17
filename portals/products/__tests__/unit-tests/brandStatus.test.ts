import { describe, expect, it } from 'vitest';
import { BRAND_STATUS_COLOR, BRAND_STATUS_OPTIONS } from '../../src/pages/ecomm/brandStatus';

describe('brand status maps', () => {
  it('maps each known status to its chip colour', () => {
    expect(BRAND_STATUS_COLOR.APPROVED).toBe('success');
    expect(BRAND_STATUS_COLOR.SUBMITTED).toBe('warning');
    expect(BRAND_STATUS_COLOR.DRAFT).toBe('default');
    expect(BRAND_STATUS_COLOR.REJECTED).toBe('error');
  });

  it('exposes the same statuses as value/label options', () => {
    expect(BRAND_STATUS_OPTIONS).toEqual([
      { value: 'APPROVED', label: 'APPROVED' },
      { value: 'SUBMITTED', label: 'SUBMITTED' },
      { value: 'DRAFT', label: 'DRAFT' },
      { value: 'REJECTED', label: 'REJECTED' },
    ]);
  });
});
