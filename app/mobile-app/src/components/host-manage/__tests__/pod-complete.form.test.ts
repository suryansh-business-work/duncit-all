import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type PodCompleteValues,
} from '../pod-complete.form';

const valid = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  venue_bill_amount: '1500',
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

  // Media is not asked for here any more: it belongs to the pod, uploaded on
  // the Upload Pod Media screen by the host and by the guests who came.
  it('never asks for media', () => {
    expect(issuesOf(true, valid())).toEqual([]);
    expect(issuesOf(false, valid({ venue_bill_amount: '' }))).toEqual([]);
  });

  it('requires the bill amount only for venue pods, never a bill document', () => {
    expect(issuesOf(true, valid({ venue_bill_amount: '0' }))).toContain('venue_bill_amount');
    expect(issuesOf(true, valid({ venue_bill_amount: 'abc' }))).toContain('venue_bill_amount');
    // A venue pod passes on the amount alone — no bill upload is asked for.
    expect(issuesOf(true, valid())).toEqual([]);
    // Virtual pod (no venue): the amount is not required either.
    expect(buildPodCompleteSchema(false).safeParse(valid({ venue_bill_amount: '' })).success).toBe(
      true,
    );
  });
});

describe('buildCompleteInput', () => {
  it('maps the amount and leaves the media to the pod', () => {
    const input = buildCompleteInput(valid({ venue_bill_amount: '1500' }), 'pod1');
    expect(input.pod_id).toBe('pod1');
    expect(input.venue_bill_amount).toBe(1500);
    expect(input.evidence_media).toBeUndefined();
  });

  it('zeroes the amount for a blank submission', () => {
    const input = buildCompleteInput({ ...blankPodCompleteValues }, 'pod2');
    expect(input.venue_bill_amount).toBe(0);
  });
});
