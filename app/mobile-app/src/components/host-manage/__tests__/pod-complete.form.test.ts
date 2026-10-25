import { mwebVenueBillLabels } from '@duncit/utils';

import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type PodCompleteValues,
} from '../pod-complete.form';

// The labels the dialog builds, with each key standing for its own sentence —
// so a test names the message it expects by key rather than by today's copy.
const labels = mwebVenueBillLabels((key) => key);
const AMOUNT_INVALID = 'mweb.venueBill.amountInvalid';
const BILL_REQUIRED = 'mweb.venueBill.billRequired';
const UPLOAD_REQUIRED = 'mweb.venueBill.billUploadRequired';
const EXTRA_INVALID = 'mweb.venueBill.extraInvalid';

const valid = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  venue_bill_amount: '1500',
  venue_bill_media: 'https://cdn/bill.pdf',
  venue_extra_amount: '',
  venue_pax: '',
  overtime_hours: '',
  ...over,
});

const issuesOf = (hasVenue: boolean, values: PodCompleteValues) => {
  const result = buildPodCompleteSchema(hasVenue, labels).safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
};

describe('buildPodCompleteSchema', () => {
  it('accepts a paid venue pod with the bill total, its uploaded bill and any extra charges', () => {
    expect(issuesOf(true, valid())).toEqual([]);
    expect(issuesOf(true, valid({ venue_extra_amount: '250.5' }))).toEqual([]);
    expect(issuesOf(true, valid({ venue_extra_amount: '0' }))).toEqual([]);
  });

  // The bill is the proof of the agreed amount: a paid venue pod cannot complete without it.
  it('asks for the bill total and the bill itself when neither is there', () => {
    expect(issuesOf(true, { ...blankPodCompleteValues })).toEqual([
      { path: 'venue_bill_amount', message: BILL_REQUIRED },
      { path: 'venue_bill_media', message: UPLOAD_REQUIRED },
    ]);
    // Blank space is not a total, and blank lines are not a bill.
    expect(
      issuesOf(true, valid({ venue_bill_amount: '   ', venue_bill_media: ' \n  \n' })),
    ).toEqual([
      { path: 'venue_bill_amount', message: BILL_REQUIRED },
      { path: 'venue_bill_media', message: UPLOAD_REQUIRED },
    ]);
  });

  it.each(['-5', 'abc', '0'])('refuses the bill total "%s" on the amount field', (typed) => {
    expect(issuesOf(true, valid({ venue_bill_amount: typed }))).toEqual([
      { path: 'venue_bill_amount', message: AMOUNT_INVALID },
    ]);
  });

  it('asks for the uploaded bill even with a total', () => {
    expect(issuesOf(true, valid({ venue_bill_media: '' }))).toEqual([
      { path: 'venue_bill_media', message: UPLOAD_REQUIRED },
    ]);
  });

  it.each(['abc', '-1', '1000001'])('refuses the extra charges "%s"', (typed) => {
    expect(issuesOf(true, valid({ venue_extra_amount: typed }))).toEqual([
      { path: 'venue_extra_amount', message: EXTRA_INVALID },
    ]);
  });

  it('validates none of it for a pod without a venue (or a free one)', () => {
    expect(issuesOf(false, { ...blankPodCompleteValues })).toEqual([]);
    expect(issuesOf(false, valid({ venue_bill_amount: 'abc', venue_bill_media: '' }))).toEqual([]);
    expect(issuesOf(false, valid({ venue_extra_amount: 'abc' }))).toEqual([]);
  });

  it('trims the amounts it hands on', () => {
    const result = buildPodCompleteSchema(true, labels).safeParse(
      valid({ venue_bill_amount: ' 1500 ', venue_extra_amount: ' 200 ' }),
    );
    expect(result.success && result.data.venue_bill_amount).toBe('1500');
    expect(result.success && result.data.venue_extra_amount).toBe('200');
  });
});

describe('buildCompleteInput', () => {
  it('sends a zero amount and nothing else without a bill (a pod with no venue)', () => {
    expect(buildCompleteInput({ ...blankPodCompleteValues }, 'pod2')).toEqual({
      pod_id: 'pod2',
      venue_bill_amount: 0,
    });
  });

  // With a bill the extra charges ALWAYS go (0 included) and the old slot-price
  // choice never does — that is how the server knows the bill is the proof.
  it('maps the bill total, the uploaded bill and the extra charges, 0 when none', () => {
    expect(buildCompleteInput(valid(), 'pod1')).toEqual({
      pod_id: 'pod1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn/bill.pdf',
      venue_extra_amount: 0,
    });
    expect(buildCompleteInput(valid({ venue_extra_amount: '250.5' }), 'pod1')).toEqual({
      pod_id: 'pod1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn/bill.pdf',
      venue_extra_amount: 250.5,
    });
    expect(buildCompleteInput(valid(), 'pod1')).not.toHaveProperty('include_slot_price');
  });

  it('sends the guests the venue charged for and the overtime hours beside the bill', () => {
    expect(buildCompleteInput(valid({ venue_pax: '16', overtime_hours: '2' }), 'pod1')).toEqual({
      pod_id: 'pod1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn/bill.pdf',
      venue_extra_amount: 0,
      venue_pax: 16,
      overtime_hours: 2,
    });
  });

  it('sends the first uploaded url when the field holds several lines', () => {
    const input = buildCompleteInput(
      valid({ venue_bill_media: '\n  https://cdn/first.pdf \nhttps://cdn/second.pdf' }),
      'pod1',
    );
    expect(input.venue_bill_url).toBe('https://cdn/first.pdf');
  });

  it('leaves the pod media to the pod', () => {
    expect(buildCompleteInput(valid(), 'pod1').evidence_media).toBeUndefined();
  });
});
