import { describe, expect, it } from 'vitest';
import { CRM_CANDIDATE_STATUS_KEY, CRM_CANDIDATE_STATUS_TONE, CRM_QUALIFICATION_KEY, CRM_QUALIFICATION_TONE } from '../src';

/** Every value the API returns has a copy key and a tone, so no surface shows a raw enum. */
describe('CRM quality labels', () => {
  it('words and colours every qualification', () => {
    expect(Object.keys(CRM_QUALIFICATION_KEY)).toEqual(['QUALIFIED', 'NOT_QUALIFIED', 'PENDING_VERIFICATION']);
    expect(Object.keys(CRM_QUALIFICATION_TONE)).toEqual(Object.keys(CRM_QUALIFICATION_KEY));
    expect(CRM_QUALIFICATION_TONE.NOT_QUALIFIED).toBe('error');
  });

  it('words and colours every research candidate status', () => {
    expect(Object.keys(CRM_CANDIDATE_STATUS_KEY)).toEqual(['NEW', 'ADDED', 'REJECTED', 'DUPLICATE']);
    expect(Object.keys(CRM_CANDIDATE_STATUS_TONE)).toEqual(Object.keys(CRM_CANDIDATE_STATUS_KEY));
    expect(CRM_CANDIDATE_STATUS_KEY.ADDED).toBe('crm.leadResearch.statusAdded');
  });
});
