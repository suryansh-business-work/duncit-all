import { describe, expect, it } from 'vitest';

import {
  blankPodCompleteValues,
  buildCompleteInput,
  buildPodCompleteSchema,
  type PodCompleteValues,
} from '../src/pod-complete/pod-complete.form';
import { mwebHostPodLabels } from '../src/labels';

const BILL = 'https://cdn.duncit.com/pod-completion/bill.pdf';

/**
 * A validation message is copy the host reads, so the schema is built from the
 * surface's labels (rule 38). Resolving them as `t:<key>` keeps the assertions
 * about WHICH message was raised rather than about the English wording.
 */
const labels = mwebHostPodLabels((key) => `t:${key}`);
const venueSchema = buildPodCompleteSchema(true, labels);
const noVenueSchema = buildPodCompleteSchema(false, labels);

const values = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  ...blankPodCompleteValues,
  ...over,
});

const errorsFor = (schema: typeof venueSchema, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('blankPodCompleteValues', () => {
  it('opens with no bill, no file and the slot price not added on top', () => {
    expect(blankPodCompleteValues).toEqual({
      venue_bill_amount: '',
      venue_bill_media: '',
      include_slot_price: false,
      venue_pax: '',
      overtime_hours: '',
    });
  });
});

describe('buildPodCompleteSchema', () => {
  // Without a bill the venue is paid its booked slot price, so an empty box is
  // a complete answer.
  it.each([[''], ['   '], ['0'], ['0.00']])(
    'completes a venue pod with no bill entered (%j)',
    (venue_bill_amount) => {
      expect(errorsFor(venueSchema, values({ venue_bill_amount }))).toEqual({});
    },
  );

  it('accepts a bill that comes with its uploaded file, with or without the slot price on top', () => {
    const bill = values({ venue_bill_amount: '450.50', venue_bill_media: BILL });
    expect(errorsFor(venueSchema, bill)).toEqual({});
    expect(errorsFor(venueSchema, { ...bill, include_slot_price: true })).toEqual({});
  });

  it('hands the amount on trimmed', () => {
    const result = venueSchema.safeParse(values({ venue_bill_amount: ' 450 ', venue_bill_media: BILL }));
    expect(result.success && result.data.venue_bill_amount).toBe('450');
  });

  it.each([['-1'], ['-0.01'], ['abc'], ['12abc'], ['Infinity']])(
    'refuses %j as a bill amount',
    (venue_bill_amount) => {
      // Even with the file uploaded: the amount is what is wrong, and only it.
      expect(errorsFor(venueSchema, values({ venue_bill_amount, venue_bill_media: BILL }))).toEqual({
        venue_bill_amount: labels.venueBill.amountInvalid,
      });
    },
  );

  // Finance approves the payout against the document, so an amount with
  // nothing behind it does not go through.
  it.each([[''], [' \n  \n']])(
    'asks for the uploaded bill when an amount is entered without one (%j)',
    (venue_bill_media) => {
      expect(errorsFor(venueSchema, values({ venue_bill_amount: '0.01', venue_bill_media }))).toEqual({
        venue_bill_media: labels.venueBill.uploadRequired,
      });
    },
  );

  it('does not ask for a file while there is no amount to back', () => {
    expect(errorsFor(venueSchema, values({ include_slot_price: true }))).toEqual({});
  });

  it('checks nothing about a bill on a pod with no venue behind it', () => {
    expect(errorsFor(noVenueSchema, values())).toEqual({});
    expect(errorsFor(noVenueSchema, values({ venue_bill_amount: '-5' }))).toEqual({});
    expect(errorsFor(noVenueSchema, values({ venue_bill_amount: '450' }))).toEqual({});
  });

  it('still refuses values of the wrong shape', () => {
    expect(venueSchema.safeParse({ venue_bill_amount: 450 }).success).toBe(false);
    expect(noVenueSchema.safeParse(values({ include_slot_price: 'yes' as never })).success).toBe(false);
  });
});

describe('buildCompleteInput', () => {
  it.each([[''], ['0'], ['-20'], ['abc']])(
    'sends a zero bill and nothing else when no bill stands (%j)',
    (venue_bill_amount) => {
      // A file or a ticked box left behind means nothing without an amount.
      expect(
        buildCompleteInput(
          values({ venue_bill_amount, venue_bill_media: BILL, include_slot_price: true }),
          'pod-1',
        ),
      ).toEqual({ pod_id: 'pod-1', venue_bill_amount: 0 });
    },
  );

  it('sends the amount as a number with the bill that replaces the slot price', () => {
    expect(
      buildCompleteInput(values({ venue_bill_amount: '450.50', venue_bill_media: BILL }), 'pod-1'),
    ).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 450.5,
      venue_bill_url: BILL,
      include_slot_price: false,
    });
  });

  it('carries the choice to pay the slot price on top', () => {
    expect(
      buildCompleteInput(
        values({ venue_bill_amount: '450', venue_bill_media: BILL, include_slot_price: true }),
        'pod-1',
      ).include_slot_price,
    ).toBe(true);
  });

  // A bill is one file — the picker's value may hold more than one line.
  it('sends only the first uploaded file', () => {
    expect(
      buildCompleteInput(
        values({ venue_bill_amount: '450', venue_bill_media: `\n ${BILL} \nhttps://cdn.duncit.com/other.jpg` }),
        'pod-1',
      ).venue_bill_url,
    ).toBe(BILL);
  });
});
