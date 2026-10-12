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
const UPLOAD_REQUIRED = 'mweb.venueBill.uploadRequired';

const valid = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  venue_bill_amount: '1500',
  venue_bill_media: 'https://cdn/bill.pdf',
  include_slot_price: false,
  ...over,
});

const issuesOf = (hasVenue: boolean, values: PodCompleteValues) => {
  const result = buildPodCompleteSchema(hasVenue, labels).safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
};

describe('buildPodCompleteSchema', () => {
  it('accepts a venue submission with an amount and its uploaded bill', () => {
    expect(issuesOf(true, valid())).toEqual([]);
    expect(issuesOf(true, valid({ include_slot_price: true }))).toEqual([]);
  });

  // The bill is optional: left empty, the venue is paid its booked slot price.
  it('accepts a venue submission with no bill at all', () => {
    expect(issuesOf(true, { ...blankPodCompleteValues })).toEqual([]);
    expect(issuesOf(true, valid({ venue_bill_amount: '   ', venue_bill_media: '' }))).toEqual([]);
    // A typed zero is "no bill" too — nothing to upload against it.
    expect(issuesOf(true, valid({ venue_bill_amount: '0', venue_bill_media: '' }))).toEqual([]);
  });

  it('rejects a negative or non-numeric amount on the amount field', () => {
    const invalid = [{ path: 'venue_bill_amount', message: AMOUNT_INVALID }];
    expect(issuesOf(true, valid({ venue_bill_amount: '-5' }))).toEqual(invalid);
    expect(issuesOf(true, valid({ venue_bill_amount: 'abc' }))).toEqual(invalid);
    // An unreadable amount is the only complaint, even with no bill uploaded.
    expect(issuesOf(true, valid({ venue_bill_amount: 'abc', venue_bill_media: '' }))).toEqual(
      invalid,
    );
  });

  it('asks for the uploaded bill once there is an amount', () => {
    const missing = [{ path: 'venue_bill_media', message: UPLOAD_REQUIRED }];
    expect(issuesOf(true, valid({ venue_bill_media: '' }))).toEqual(missing);
    // Blank lines are not a bill.
    expect(issuesOf(true, valid({ venue_bill_media: ' \n  \n' }))).toEqual(missing);
  });

  it('validates none of it for a pod without a venue', () => {
    expect(issuesOf(false, { ...blankPodCompleteValues })).toEqual([]);
    expect(issuesOf(false, valid({ venue_bill_amount: 'abc', venue_bill_media: '' }))).toEqual([]);
    expect(issuesOf(false, valid({ venue_bill_amount: '-5' }))).toEqual([]);
    expect(issuesOf(false, valid({ venue_bill_media: '' }))).toEqual([]);
  });

  it('trims the amount it hands on', () => {
    const result = buildPodCompleteSchema(true, labels).safeParse(
      valid({ venue_bill_amount: ' 1500 ' }),
    );
    expect(result.success && result.data.venue_bill_amount).toBe('1500');
  });
});

describe('buildCompleteInput', () => {
  it('sends a zero amount and nothing else without a bill', () => {
    expect(buildCompleteInput({ ...blankPodCompleteValues }, 'pod2')).toEqual({
      pod_id: 'pod2',
      venue_bill_amount: 0,
    });
  });

  // The file and the slot-price choice mean nothing without an amount.
  it('drops the bill file and the slot-price choice when there is no amount', () => {
    expect(
      buildCompleteInput(valid({ venue_bill_amount: '', include_slot_price: true }), 'pod2'),
    ).toEqual({ pod_id: 'pod2', venue_bill_amount: 0 });
    expect(buildCompleteInput(valid({ venue_bill_amount: '0' }), 'pod2')).toEqual({
      pod_id: 'pod2',
      venue_bill_amount: 0,
    });
  });

  it('maps the amount, the uploaded bill and the slot-price choice', () => {
    expect(buildCompleteInput(valid(), 'pod1')).toEqual({
      pod_id: 'pod1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn/bill.pdf',
      include_slot_price: false,
    });
    expect(buildCompleteInput(valid({ include_slot_price: true }), 'pod1')).toEqual({
      pod_id: 'pod1',
      venue_bill_amount: 1500,
      venue_bill_url: 'https://cdn/bill.pdf',
      include_slot_price: true,
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
