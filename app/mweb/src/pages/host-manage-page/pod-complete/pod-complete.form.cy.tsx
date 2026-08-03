import { describe, expect, it } from 'vitest';
import { buildCompleteInput, buildPodCompleteSchema } from './pod-complete.form';
import { blankPodCompleteValues, type PodCompleteValues } from './pod-complete.types';

const valid = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  venue_bill_amount: '1500',
  media_text: 'https://cdn/party.jpg',
  ...over,
});

const issuesOf = (hasVenue: boolean, values: PodCompleteValues) => {
  const result = buildPodCompleteSchema(hasVenue).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('buildPodCompleteSchema', () => {
  it('accepts a complete venue submission', () => {
    expect(buildPodCompleteSchema(true).safeParse(valid()).success).toBe(true);
  });

  it('requires party media regardless of venue', () => {
    expect(issuesOf(true, valid({ media_text: '' }))).toContain('media_text');
    expect(issuesOf(false, valid({ media_text: '   ' }))).toContain('media_text');
  });

  it('requires a bill amount only for venue pods', () => {
    const paths = issuesOf(true, valid({ venue_bill_amount: '0' }));
    expect(paths).toContain('venue_bill_amount');
    // Virtual pod (no venue): the bill amount is not required.
    expect(buildPodCompleteSchema(false).safeParse(valid({ venue_bill_amount: '' })).success).toBe(true);
  });
});

describe('buildCompleteInput', () => {
  it('maps amounts and typed media', () => {
    const input = buildCompleteInput(
      valid({ venue_bill_amount: '1500', media_text: 'https://cdn/a.jpg\nhttps://cdn/b.mp4\n' }),
      'pod1',
    );
    expect(input.pod_id).toBe('pod1');
    expect(input.venue_bill_amount).toBe(1500);
    expect(Object.keys(input)).not.toContain('bill_url');
    expect(input.evidence_media).toEqual([
      { url: 'https://cdn/a.jpg', type: 'IMAGE' },
      { url: 'https://cdn/b.mp4', type: 'VIDEO' },
    ]);
  });

  it('zeroes the amount for a blank/virtual submission', () => {
    const input = buildCompleteInput({ ...blankPodCompleteValues, media_text: 'https://cdn/a.jpg' }, 'pod2');
    expect(input.venue_bill_amount).toBe(0);
  });
});
