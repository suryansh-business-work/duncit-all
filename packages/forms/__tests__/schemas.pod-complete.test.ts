import { describe, expect, it } from 'vitest';

import {
  blankPodCompleteValues,
  buildPodCompleteInput,
  makePodCompleteSchema,
  type PodCompleteValues,
} from '../src/schemas';

const BILL = 'https://cdn.duncit.com/pod-completion/bill.pdf';
const labels = { amountInvalid: 'invalid-amount', uploadRequired: 'upload-required' };
const venueSchema = makePodCompleteSchema(true, labels);
const noVenueSchema = makePodCompleteSchema(false, labels);

const values = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  ...blankPodCompleteValues,
  ...over,
});

const errorsFor = (schema: typeof venueSchema, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('makePodCompleteSchema', () => {
  it('opens with no bill, no file and the slot price not added on top', () => {
    expect(blankPodCompleteValues).toEqual({
      venue_bill_amount: '',
      venue_bill_media: '',
      include_slot_price: false,
    });
  });

  // Without a bill the venue is paid its booked slot price, so an empty box is
  // a complete answer.
  it.each([[''], ['   '], ['0'], ['0.00']])('lets a venue pod complete with no bill (%j)', (amount) => {
    expect(errorsFor(venueSchema, values({ venue_bill_amount: amount }))).toEqual({});
  });

  it.each([['-5'], ['abc'], ['12abc']])('refuses %j as a bill amount', (amount) => {
    expect(errorsFor(venueSchema, values({ venue_bill_amount: amount, venue_bill_media: BILL }))).toEqual({
      venue_bill_amount: 'invalid-amount',
    });
  });

  it.each([[''], [' \n  \n']])('asks for the bill itself once an amount is entered (media %j)', (media) => {
    expect(errorsFor(venueSchema, values({ venue_bill_amount: '450', venue_bill_media: media }))).toEqual({
      venue_bill_media: 'upload-required',
    });
  });

  it('accepts an amount with its uploaded bill, with or without the slot price on top', () => {
    const bill = values({ venue_bill_amount: ' 450.50 ', venue_bill_media: BILL });
    expect(errorsFor(venueSchema, bill)).toEqual({});
    expect(errorsFor(venueSchema, { ...bill, include_slot_price: true })).toEqual({});
    expect(venueSchema.parse(bill).venue_bill_amount).toBe('450.50');
  });

  it('checks none of it on a pod without a venue', () => {
    expect(errorsFor(noVenueSchema, values({ venue_bill_amount: 'abc' }))).toEqual({});
    expect(errorsFor(noVenueSchema, values({ venue_bill_amount: '450' }))).toEqual({});
  });

  it('still refuses a value of the wrong shape', () => {
    expect(venueSchema.safeParse({ venue_bill_amount: 450 }).success).toBe(false);
  });
});

describe('buildPodCompleteInput', () => {
  it.each([[''], ['0'], ['abc']])('sends no bill, file or slot choice without an amount (%j)', (amount) => {
    const input = buildPodCompleteInput(
      values({ venue_bill_amount: amount, venue_bill_media: BILL, include_slot_price: true }),
      'pod-1',
    );
    expect(input).toEqual({ pod_id: 'pod-1', venue_bill_amount: 0 });
  });

  it('sends the amount, the first uploaded file and an explicit slot choice with a bill', () => {
    const media = `\n ${BILL} \nhttps://cdn.duncit.com/second.jpg`;
    expect(buildPodCompleteInput(values({ venue_bill_amount: '450.5', venue_bill_media: media }), 'pod-1')).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 450.5,
      venue_bill_url: BILL,
      include_slot_price: false,
    });
    expect(
      buildPodCompleteInput(
        values({ venue_bill_amount: '450.5', venue_bill_media: media, include_slot_price: true }),
        'pod-1',
      ).include_slot_price,
    ).toBe(true);
  });
});
