import { describe, expect, it } from 'vitest';
import { ADMIN_BUNDLE, SHELL_BUNDLE, createTranslator, flattenCatalogue } from '@duncit/app-settings';
import { buildCompleteInput, buildCompleteSchema, mediaTextToInput } from './complete-pod.form';
import type { CompletePodValues } from './complete-pod.types';
import { buildWaterfallLines, fallbackT, type PodFinanceWaterfall } from '@duncit/ui';

// The real English copy, not a bare key — errorsOf's assertions read like an
// admin would, and a stub `(key) => key` can never fail when a key is renamed
// out from under it. The venue-bill words are the shell's (`shell.venueBill.*`,
// shared with every portal), so both bundles are in play.
const adminFallbackT = createTranslator({
  locale: 'en-IN',
  fallback: { ...flattenCatalogue(ADMIN_BUNDLE), ...flattenCatalogue(SHELL_BUNDLE) },
}).t;

const BILL = 'https://cdn.test/bill.pdf';

const valid = (over: Partial<CompletePodValues> = {}): CompletePodValues => ({
  host_user_id: 'u1',
  venue_bill_amount: 1500,
  venue_bill_media: BILL,
  include_slot_price: false,
  venue_pax: '',
  overtime_hours: '',
  media_text: 'https://cdn.test/party.jpg',
  notes: '',
  ...over,
});

const errorsOf = (hasVenue: boolean, values: CompletePodValues): string[] => {
  const result = buildCompleteSchema(hasVenue, adminFallbackT).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('buildCompleteSchema', () => {
  it('accepts a complete venue submission', () => {
    expect(errorsOf(true, valid())).toEqual([]);
  });

  it('requires party media regardless of venue', () => {
    expect(errorsOf(true, valid({ media_text: '' })).join(' ')).toMatch(/party/i);
    expect(errorsOf(false, valid({ media_text: '' })).join(' ')).toMatch(/party/i);
  });

  // The bill is optional: without one the venue is paid its booked slot price.
  it('accepts a venue pod with no bill entered, and a virtual pod likewise', () => {
    expect(errorsOf(true, valid({ venue_bill_amount: 0, venue_bill_media: '' }))).toEqual([]);
    // Virtual pod (no venue): no bill amount needed.
    expect(errorsOf(false, valid({ venue_bill_amount: 0, venue_bill_media: '' }))).toEqual([]);
  });

  it('refuses a bill below zero or one that is not a number', () => {
    expect(errorsOf(true, valid({ venue_bill_amount: -1 }))).toEqual(['Enter a valid amount']);
    expect(errorsOf(true, valid({ venue_bill_amount: 'abc' as never }))).toEqual(['Enter a valid amount']);
  });

  // Finance approves the payout against the document, so an amount needs it.
  it('requires the uploaded bill once a venue pod has a bill amount', () => {
    expect(errorsOf(true, valid({ venue_bill_media: '' }))).toEqual([
      'Upload the venue bill for the amount you entered',
    ]);
    expect(errorsOf(true, valid({ venue_bill_amount: 0.01, venue_bill_media: ' \n ' }))).toEqual([
      'Upload the venue bill for the amount you entered',
    ]);
    const issues = buildCompleteSchema(true, adminFallbackT).safeParse(valid({ venue_bill_media: '' }));
    expect(issues.error?.issues.map((issue) => issue.path)).toEqual([['venue_bill_media']]);
  });

  it('asks a pod with no venue for no bill document, whatever amount it carries', () => {
    expect(errorsOf(false, valid({ venue_bill_media: '' }))).toEqual([]);
  });

  it('accepts the bill paid on top of the slot price', () => {
    expect(errorsOf(true, valid({ include_slot_price: true }))).toEqual([]);
  });
});

describe('buildCompleteInput', () => {
  it('maps amounts and typed media', () => {
    const input = buildCompleteInput(valid({ media_text: 'https://cdn.test/a.jpg\nhttps://cdn.test/b.mp4' }), 'pod1');
    expect(input.pod_id).toBe('pod1');
    expect(input.venue_bill_amount).toBe(1500);
    expect(input.evidence_media).toEqual([
      { url: 'https://cdn.test/a.jpg', type: 'IMAGE' },
      { url: 'https://cdn.test/b.mp4', type: 'VIDEO' },
    ]);
  });

  it('sends the bill’s first file and the slot-price choice with an amount', () => {
    const input = buildCompleteInput(
      valid({ venue_bill_media: `\n${BILL}\nhttps://cdn.test/other.jpg`, include_slot_price: true }),
      'pod1',
    );
    expect(input.venue_bill_url).toBe(BILL);
    expect(input.include_slot_price).toBe(true);
    expect(buildCompleteInput(valid(), 'pod1').include_slot_price).toBe(false);
  });

  // A file or a ticked box left behind means nothing without an amount.
  it('sends neither the file nor the slot-price choice without an amount', () => {
    const input = buildCompleteInput(valid({ venue_bill_amount: 0, include_slot_price: true }), 'pod1');
    expect(input.venue_bill_amount).toBe(0);
    expect(input.venue_bill_url).toBeUndefined();
    expect(input.include_slot_price).toBeUndefined();
  });

  it('leaves the host and the notes out when they are blank', () => {
    const input = buildCompleteInput(valid({ host_user_id: '', notes: '   ' }), 'pod1');
    expect(input.host_user_id).toBeUndefined();
    expect(input.notes).toBeUndefined();
    expect(buildCompleteInput(valid({ notes: ' Paid in cash ' }), 'pod1').notes).toBe('Paid in cash');
  });
});

describe('mediaTextToInput', () => {
  it('maps videos in evidence media', () => {
    expect(mediaTextToInput('https://cdn.test/party.mp4')[0].type).toBe('VIDEO');
  });
});

// Canonical engine-v2 vector: GST 18 / fee 5 / both commissions 10,
// price 1000, booked slot 300.
const waterfall: PodFinanceWaterfall = {
  version: 2,
  amount: 1000,
  gst_pct: 18,
  gst_amount: 152.54,
  net_amount: 847.46,
  platform_fee_pct: 5,
  platform_fee_amount: 42.37,
  pool_amount: 805.09,
  venue_amount: 300,
  venue_commission_pct: 10,
  venue_commission_amount: 30,
  venue_receives: 270,
  host_amount: 505.09,
  host_commission_pct: 10,
  host_commission_amount: 50.51,
  host_receives: 454.58,
  duncit_revenue: 122.88,
  host_earn_pct: 45.46,
};

describe('buildWaterfallLines', () => {
  it('orders the full waterfall for a venue pod', () => {
    const lines = buildWaterfallLines(waterfall, '₹', true, fallbackT, 1000);
    expect(lines.map((line) => line.key)).toEqual(['paid', 'gst', 'fee', 'pool', 'venue', 'host', 'duncit']);
    expect(lines.map((line) => line.value)).toEqual([1000, 152.54, 42.37, 805.09, 300, 454.58, 122.88]);
  });

  it('labels the deductions with API percentages', () => {
    const lines = buildWaterfallLines(waterfall, '₹', true, fallbackT);
    expect(lines.find((line) => line.key === 'gst')?.label).toBe('− GST (18%)');
    expect(lines.find((line) => line.key === 'fee')?.label).toBe('− Platform Fee (5%)');
  });

  it('explains the venue and host lines via commission secondaries', () => {
    const lines = buildWaterfallLines(waterfall, '₹', true, fallbackT);
    const venue = lines.find((line) => line.key === 'venue');
    expect(venue?.secondary).toContain('10% commission');
    expect(venue?.secondary).toContain('venue receives ₹270.00');
    const host = lines.find((line) => line.key === 'host');
    expect(host?.strong).toBe(true);
    expect(host?.secondary).toContain('10% commission');
  });

  it('omits the venue line for no-venue pods and falls back to waterfall.amount', () => {
    const lines = buildWaterfallLines(waterfall, '₹', false, fallbackT);
    expect(lines.some((line) => line.key === 'venue')).toBe(false);
    expect(lines.find((line) => line.key === 'paid')?.value).toBe(1000);
  });
});
