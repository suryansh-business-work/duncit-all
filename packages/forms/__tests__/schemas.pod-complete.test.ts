import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  addVenueBillIssues,
  blankPodCompleteValues,
  buildPodCompleteInput,
  makePodCompleteSchema,
  venueExtraAmountOf,
  VENUE_USAGE_LIMITS,
  type PodCompleteValues,
} from '../src/schemas';

const BILL = 'https://cdn.duncit.com/pod-completion/bill.pdf';
const labels = {
  amountInvalid: 'invalid-amount',
  billRequired: 'bill-required',
  billUploadRequired: 'upload-required',
  extraInvalid: 'invalid-extra',
  paxInvalid: 'invalid-pax',
  overtimeInvalid: 'invalid-overtime',
};
const venueSchema = makePodCompleteSchema(true, labels);
const noVenueSchema = makePodCompleteSchema(false, labels);

const values = (over: Partial<PodCompleteValues> = {}): PodCompleteValues => ({
  ...blankPodCompleteValues,
  ...over,
});
/** A paid venue pod's minimum: the bill's total and the bill itself. */
const billed = (over: Partial<PodCompleteValues> = {}) => values({ venue_bill_amount: '3450', venue_bill_media: BILL, ...over });

const errorsFor = (schema: typeof venueSchema, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]));
};

describe('makePodCompleteSchema', () => {
  it('opens with no bill, no file, no extra charges and no usage', () => {
    expect(blankPodCompleteValues).toEqual({
      venue_bill_amount: '',
      venue_bill_media: '',
      venue_extra_amount: '',
      venue_pax: '',
      overtime_hours: '',
    });
  });

  it("asks a paid venue pod for the bill's total and the bill itself — nothing completes without its proof", () => {
    expect(errorsFor(venueSchema, values())).toEqual({
      venue_bill_amount: 'bill-required',
      venue_bill_media: 'upload-required',
    });
    expect(errorsFor(venueSchema, values({ venue_bill_amount: '   ', venue_bill_media: BILL }))).toEqual({
      venue_bill_amount: 'bill-required',
    });
  });

  it.each([['0'], ['0.00'], ['-5'], ['abc'], ['12abc'], ['Infinity']])('refuses %j as the bill total', (amount) => {
    expect(errorsFor(venueSchema, billed({ venue_bill_amount: amount }))).toEqual({ venue_bill_amount: 'invalid-amount' });
  });

  it.each([[''], [' \n  \n']])('asks for the bill itself whatever the total (media %j)', (media) => {
    expect(errorsFor(venueSchema, billed({ venue_bill_media: media }))).toEqual({ venue_bill_media: 'upload-required' });
  });

  it('accepts a total with its uploaded bill, trimmed, with or without extra charges', () => {
    expect(errorsFor(venueSchema, billed({ venue_bill_amount: ' 3450.50 ' }))).toEqual({});
    expect(venueSchema.parse(billed({ venue_bill_amount: ' 3450.50 ' })).venue_bill_amount).toBe('3450.50');
    expect(errorsFor(venueSchema, billed({ venue_extra_amount: '450' }))).toEqual({});
    expect(errorsFor(venueSchema, billed({ venue_extra_amount: '0' }))).toEqual({});
    expect(errorsFor(venueSchema, billed({ venue_extra_amount: String(VENUE_USAGE_LIMITS.extraMax) }))).toEqual({});
  });

  it.each([['-1'], ['abc'], [String(VENUE_USAGE_LIMITS.extraMax + 1)]])('refuses %j as extra charges', (extra) => {
    expect(errorsFor(venueSchema, billed({ venue_extra_amount: extra }))).toEqual({ venue_extra_amount: 'invalid-extra' });
  });

  it('takes the venue usage as optional: empty, or a whole guest count and hours within the server bounds', () => {
    expect(errorsFor(venueSchema, billed({ venue_pax: '24', overtime_hours: '1.5' }))).toEqual({});
    expect(errorsFor(venueSchema, billed({ venue_pax: '2.5', overtime_hours: '49' }))).toEqual({
      venue_pax: 'invalid-pax',
      overtime_hours: 'invalid-overtime',
    });
    expect(errorsFor(venueSchema, billed({ venue_pax: '-1', overtime_hours: 'abc' }))).toEqual({
      venue_pax: 'invalid-pax',
      overtime_hours: 'invalid-overtime',
    });
  });

  it('checks none of it on a pod without a venue (or a free one, whose host settles the venue directly)', () => {
    expect(errorsFor(noVenueSchema, values())).toEqual({});
    expect(errorsFor(noVenueSchema, values({ venue_bill_amount: 'abc', venue_extra_amount: '-1', venue_pax: '-1' }))).toEqual({});
  });

  it('still refuses a value of the wrong shape', () => {
    expect(venueSchema.safeParse({ venue_bill_amount: 3450 }).success).toBe(false);
  });
});

describe('addVenueBillIssues', () => {
  it('reports through the context it is given, so the Admin console can reuse the rule', () => {
    const schema = z
      .object({ venue_bill_amount: z.string(), venue_bill_media: z.string(), venue_extra_amount: z.string() })
      .superRefine((form, ctx) => addVenueBillIssues(form, ctx, labels));
    const result = schema.safeParse({ venue_bill_amount: '', venue_bill_media: '', venue_extra_amount: 'x' });
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'bill-required',
      'upload-required',
      'invalid-extra',
    ]);
  });
});

describe('venueExtraAmountOf', () => {
  it('reads typed extra charges, and 0 for nothing or anything outside the bound', () => {
    expect(venueExtraAmountOf(' 450.5 ')).toBe(450.5);
    expect(venueExtraAmountOf('')).toBe(0);
    expect(venueExtraAmountOf('abc')).toBe(0);
    expect(venueExtraAmountOf('-3')).toBe(0);
    expect(venueExtraAmountOf(String(VENUE_USAGE_LIMITS.extraMax + 1))).toBe(0);
  });
});

describe('buildPodCompleteInput', () => {
  it('sends the total, the first uploaded file and the extra charges — 0 when none — and never the old slot choice', () => {
    const media = `\n ${BILL} \nhttps://cdn.duncit.com/second.jpg`;
    const input = buildPodCompleteInput(values({ venue_bill_amount: '3450.5', venue_bill_media: media }), 'pod-1');
    expect(input).toEqual({ pod_id: 'pod-1', venue_bill_amount: 3450.5, venue_bill_url: BILL, venue_extra_amount: 0 });
    expect(input).not.toHaveProperty('include_slot_price');
    expect(buildPodCompleteInput(billed({ venue_extra_amount: '450' }), 'pod-1').venue_extra_amount).toBe(450);
  });

  it.each([[''], ['0'], ['abc']])('sends no bill, file or extra charges without a total (%j) — a pod with no venue', (amount) => {
    const input = buildPodCompleteInput(values({ venue_bill_amount: amount, venue_bill_media: BILL, venue_extra_amount: '450' }), 'pod-1');
    expect(input).toEqual({ pod_id: 'pod-1', venue_bill_amount: 0 });
  });

  it('sends the guests and overtime with or without a bill, and leaves out what was not entered', () => {
    expect(buildPodCompleteInput(values({ venue_pax: '18', overtime_hours: '2' }), 'pod-1')).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 0,
      venue_pax: 18,
      overtime_hours: 2,
    });
    // Empty pax lets the server count for itself; zero hours is no overtime.
    expect(buildPodCompleteInput(values({ venue_pax: '', overtime_hours: '0' }), 'pod-1')).toEqual({
      pod_id: 'pod-1',
      venue_bill_amount: 0,
    });
    expect(buildPodCompleteInput(billed({ venue_pax: '0' }), 'pod-1')).toMatchObject({ venue_bill_amount: 3450, venue_pax: 0 });
  });
});
