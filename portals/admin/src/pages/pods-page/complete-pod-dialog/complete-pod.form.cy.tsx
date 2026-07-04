import { describe, expect, it } from 'vitest';
import { buildCompleteInput, buildCompleteSchema, mediaTextToInput } from './complete-pod.form';
import type { CompletePodValues } from './complete-pod.types';
import { buildWaterfallLines, type PodFinanceWaterfall } from '../../../components/finance-waterfall';

const valid = (over: Partial<CompletePodValues> = {}): CompletePodValues => ({
  host_user_id: 'u1',
  venue_bill_amount: 1500,
  bill_url: 'https://cdn.test/bill.pdf',
  media_text: 'https://cdn.test/party.jpg',
  notes: '',
  ...over,
});

const errorsOf = (hasVenue: boolean, values: CompletePodValues): string[] => {
  const result = buildCompleteSchema(hasVenue).safeParse(values);
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

  it('requires a bill amount + upload only for venue pods', () => {
    const errs = errorsOf(true, valid({ venue_bill_amount: 0, bill_url: '' })).join(' ');
    expect(errs).toMatch(/venue bill/i);
    expect(errs).toMatch(/bill upload/i);
    // Virtual pod (no venue): no bill needed.
    expect(errorsOf(false, valid({ venue_bill_amount: 0, bill_url: '' }))).toEqual([]);
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
    const lines = buildWaterfallLines(waterfall, '₹', true, 1000);
    expect(lines.map((line) => line.key)).toEqual(['paid', 'gst', 'fee', 'pool', 'venue', 'host', 'duncit']);
    expect(lines.map((line) => line.value)).toEqual([1000, 152.54, 42.37, 805.09, 300, 454.58, 122.88]);
  });

  it('labels the deductions with API percentages', () => {
    const lines = buildWaterfallLines(waterfall, '₹', true);
    expect(lines.find((line) => line.key === 'gst')?.label).toBe('− GST (18%)');
    expect(lines.find((line) => line.key === 'fee')?.label).toBe('− Platform Fee (5%)');
  });

  it('explains the venue and host lines via commission secondaries', () => {
    const lines = buildWaterfallLines(waterfall, '₹', true);
    const venue = lines.find((line) => line.key === 'venue');
    expect(venue?.secondary).toContain('10% commission');
    expect(venue?.secondary).toContain('venue receives ₹270.00');
    const host = lines.find((line) => line.key === 'host');
    expect(host?.strong).toBe(true);
    expect(host?.secondary).toContain('10% commission');
  });

  it('omits the venue line for no-venue pods and falls back to waterfall.amount', () => {
    const lines = buildWaterfallLines(waterfall, '₹', false);
    expect(lines.some((line) => line.key === 'venue')).toBe(false);
    expect(lines.find((line) => line.key === 'paid')?.value).toBe(1000);
  });
});
