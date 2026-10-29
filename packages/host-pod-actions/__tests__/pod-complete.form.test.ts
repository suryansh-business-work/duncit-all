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
/** A paid pod at a venue — the only kind that owes a venue bill. */
const venueSchema = buildPodCompleteSchema(true, labels);
/** A pod with no venue, or a free pod (its host settles the venue directly). */
const noVenueSchema = buildPodCompleteSchema(false, labels);

const values = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  ...blankPodCompleteValues,
  ...over,
});
const billed = (over: Partial<PodCompleteValues> = {}) =>
  values({ venue_bill_amount: '450', venue_bill_media: BILL, ...over });

const errorsFor = (schema: typeof venueSchema, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) return {} as Record<string, string>;
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('blankPodCompleteValues', () => {
  it('opens with no bill, no file, no extra charges and no slot-price choice at all', () => {
    expect(blankPodCompleteValues).toEqual({
      venue_bill_amount: '',
      venue_bill_media: '',
      venue_extra_amount: '',
      venue_pax: '',
      overtime_hours: '',
    });
    expect(blankPodCompleteValues).not.toHaveProperty('include_slot_price');
  });
});

describe('buildPodCompleteSchema on a paid venue pod', () => {
  // The bill is the proof Finance approves the agreed amount against.
  it('requires the bill total and the bill itself', () => {
    expect(errorsFor(venueSchema, values())).toEqual({
      venue_bill_amount: labels.venueBill.billRequired,
      venue_bill_media: labels.venueBill.billUploadRequired,
    });
  });

  it('accepts the bill total with its file and no extra charges', () => {
    expect(errorsFor(venueSchema, billed())).toEqual({});
  });

  it.each([['0'], ['0.00'], ['-5'], ['abc']])('refuses %j as the bill total', (venue_bill_amount) => {
    // Even with the file uploaded: the total is what is wrong, and only it.
    expect(errorsFor(venueSchema, billed({ venue_bill_amount }))).toEqual({
      venue_bill_amount: labels.venueBill.amountInvalid,
    });
  });

  it.each([[''], ['  \n  ']])('asks for the uploaded bill when its total is entered without one (%j)', (venue_bill_media) => {
    expect(errorsFor(venueSchema, billed({ venue_bill_media }))).toEqual({
      venue_bill_media: labels.venueBill.billUploadRequired,
    });
  });

  it.each([['0'], ['450.50'], ['1000000']])('accepts %j as extra charges', (venue_extra_amount) => {
    expect(errorsFor(venueSchema, billed({ venue_extra_amount }))).toEqual({});
  });

  it.each([['-1'], ['1000000.01'], ['ten']])('refuses %j as extra charges', (venue_extra_amount) => {
    expect(errorsFor(venueSchema, billed({ venue_extra_amount }))).toEqual({
      venue_extra_amount: labels.venueBill.extraInvalid,
    });
  });

  it('checks the venue usage alongside the bill', () => {
    expect(errorsFor(venueSchema, billed({ venue_pax: '2.5', overtime_hours: '49' }))).toEqual({
      venue_pax: labels.venueBill.paxInvalid,
      overtime_hours: labels.venueBill.overtimeInvalid,
    });
  });
});

describe('buildPodCompleteSchema at a venue that gave the booking free', () => {
  // Owed nothing for the booking, so a bill is the proof of extras only (the server's venueBillFor).
  const freeVenueSchema = buildPodCompleteSchema(true, labels, true);

  it('completes with no bill while the venue charged nothing beyond the booking', () => {
    expect(errorsFor(freeVenueSchema, values())).toEqual({});
    expect(errorsFor(freeVenueSchema, values({ venue_extra_amount: '0' }))).toEqual({});
  });

  it('asks for the bill total and the bill once the venue charged extras', () => {
    expect(errorsFor(freeVenueSchema, values({ venue_extra_amount: '120' }))).toEqual({
      venue_bill_amount: labels.venueBill.billRequired,
      venue_bill_media: labels.venueBill.billUploadRequired,
    });
    expect(errorsFor(freeVenueSchema, billed({ venue_extra_amount: '120' }))).toEqual({});
  });

  it('asks for the bill itself when a total is entered anyway', () => {
    expect(errorsFor(freeVenueSchema, values({ venue_bill_amount: '450' }))).toEqual({
      venue_bill_media: labels.venueBill.billUploadRequired,
    });
  });

  it('still checks the venue usage', () => {
    expect(errorsFor(freeVenueSchema, values({ venue_pax: '2.5' }))).toEqual({ venue_pax: labels.venueBill.paxInvalid });
  });

  it('means nothing for a pod with no venue bill to ask for', () => {
    expect(errorsFor(buildPodCompleteSchema(false, labels, true), values({ venue_bill_amount: '-5' }))).toEqual({});
  });
});

describe('buildPodCompleteSchema with no bill to ask for', () => {
  // A pod with no venue, and a free pod: neither has a venue bill.
  it('completes with every venue field empty', () => {
    expect(errorsFor(noVenueSchema, values())).toEqual({});
  });

  it('ignores whatever is left in the venue fields', () => {
    expect(
      errorsFor(noVenueSchema, values({ venue_bill_amount: '-5', venue_extra_amount: '-1', venue_pax: '2.5' })),
    ).toEqual({});
  });

  it('still refuses a value of the wrong type', () => {
    expect(noVenueSchema.safeParse({ ...values(), venue_extra_amount: 5 }).success).toBe(false);
  });
});

describe('buildCompleteInput', () => {
  // The extra charges always ride with a bill (0 included) and the old
  // slot-price choice never does — that is how the server knows this build
  // pays the agreed amount, with the bill as its proof.
  it('sends the bill total, its file and the extra charges, and never include_slot_price', () => {
    const input = buildCompleteInput(billed({ venue_bill_amount: '450.50', venue_extra_amount: '120' }), 'pod-1');

    expect(input).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 450.5,
      venue_bill_url: BILL,
      venue_extra_amount: 120,
    });
    expect(input).not.toHaveProperty('include_slot_price');
  });

  it('sends extra charges of 0 when none were entered', () => {
    expect(buildCompleteInput(billed(), 'pod-1').venue_extra_amount).toBe(0);
  });

  it('sends the bill’s first file only', () => {
    const input = buildCompleteInput(
      billed({ venue_bill_media: `\n ${BILL} \nhttps://cdn.duncit.com/other.jpg` }),
      'pod-1',
    );
    expect(input.venue_bill_url).toBe(BILL);
  });

  // A pod with no venue (or a free one) has no bill: nothing venue-side goes.
  it('sends no bill file and no extra charges without a bill total', () => {
    const input = buildCompleteInput(values({ venue_bill_media: BILL, venue_extra_amount: '50' }), 'pod-1');
    expect(input).toEqual({ pod_id: 'pod-1', venue_bill_amount: 0 });
  });

  it('sends the venue usage with the bill', () => {
    expect(buildCompleteInput(billed({ venue_pax: '18', overtime_hours: '1.5' }), 'pod-1')).toMatchObject({
      venue_pax: 18,
      overtime_hours: 1.5,
    });
  });
});
