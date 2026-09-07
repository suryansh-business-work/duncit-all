/**
 * The calculator's figures, and the one thing they must never do: disagree with
 * the finance engine.
 *
 * `lineFor` deliberately does NOT re-implement the waterfall — it calls
 * `computePodFinanceBreakdown`, the same function that settles real pods. So
 * what is worth asserting here is the wiring around it: that the collection is
 * built from PAYABLE spots, that the venue is left unclamped, and that
 * `pod_count` multiplies the result rather than the inputs.
 */
import { computePodFinanceBreakdown, payableSpots } from '@modules/finance/finance/breakdown.math';
import { lineFor, totalsOf } from '../../podCalculator.totals';
import type { IPodCalculatorPod } from '../../podCalculator.model';

const pod = (over: Partial<IPodCalculatorPod> = {}): IPodCalculatorPod =>
  ({
    pod_key: 'k',
    name: 'Pod 1',
    pod_amount: 1000,
    no_of_spots: 30,
    pod_count: 1,
    gst_percent: 18,
    platform_fee_percent: 5,
    venue_amount: 400,
    host_commission_percent: 10,
    venue_commission_percent: 10,
    club_admin_percent: 0,
    ...over,
  }) as IPodCalculatorPod;

describe('lineFor', () => {
  it('bills the payable spots, never the host seat', () => {
    const line = lineFor(pod({ no_of_spots: 30 }));

    expect(line.payable_spots).toBe(payableSpots(30));
    expect(line.payable_spots).toBe(29);
    // ticket x 29, in paise
    expect(line.per_pod.amount_paise).toBe(1000 * 100 * 29);
  });

  it('agrees line for line with the finance engine', () => {
    const line = lineFor(pod());
    const engine = computePodFinanceBreakdown(
      1000 * 100 * 29,
      400 * 100,
      {
        gst_percent: 18,
        platform_fee_percent: 5,
        host_commission_percent: 10,
        venue_commission_percent: 10,
        club_admin_percent: 0,
      },
      { clampVenueToPool: false }
    );

    expect(line.per_pod).toEqual(engine);
  });

  it('leaves the venue unclamped, so a shortfall lands on the host', () => {
    // A venue priced far above what one cheap pod collects.
    const line = lineFor(pod({ pod_amount: 100, venue_amount: 5000 }));

    expect(line.per_pod.venue_amount_paise).toBe(5000 * 100);
    expect(line.host_receives).toBeLessThan(0);
  });

  it('multiplies the RESULT by pod_count, not the inputs', () => {
    const one = lineFor(pod({ pod_count: 1 }));
    const ten = lineFor(pod({ pod_count: 10 }));

    // The per-pod waterfall is identical; only the totals scale.
    expect(ten.per_pod).toEqual(one.per_pod);
    expect(ten.pod_count).toBe(10);
    expect(ten.collection_total).toBe(one.collection_total * 10);
    expect(ten.duncit_revenue_total).toBeCloseTo(one.duncit_revenue_total * 10, 2);
  });

  it('treats a missing or zero count as one pod', () => {
    expect(lineFor(pod({ pod_count: 0 })).pod_count).toBe(0);
    expect(lineFor(pod({ pod_count: undefined as unknown as number })).pod_count).toBe(1);
  });

  it('survives a document written before a field existed', () => {
    const legacy = {
      pod_key: 'k',
      name: 'Old',
      no_of_spots: 10,
    } as unknown as IPodCalculatorPod;

    const line = lineFor(legacy);

    expect(line.collection_total).toBe(0);
    expect(line.gst_amount).toBe(0);
    expect(line.pod_count).toBe(1);
  });

  it('reads a pod with no spots or name recorded at all', () => {
    // Each `??` in lineFor has a real document behind it: these fields were
    // added after the first calculations were saved.
    const line = lineFor({ pod_key: 'k' } as unknown as IPodCalculatorPod);

    expect(line.name).toBe('');
    expect(line.payable_spots).toBe(0);
    expect(line.per_pod.venue_amount_paise).toBe(0);
  });

  it('reads a zero-spot pod as collecting nothing', () => {
    const line = lineFor(pod({ no_of_spots: 0 }));

    expect(line.payable_spots).toBe(0);
    expect(line.collection_total).toBe(0);
  });
});

describe('totalsOf', () => {
  it('counts pods MODELLED, so a row standing for ten counts ten', () => {
    const totals = totalsOf([lineFor(pod({ pod_count: 4 })), lineFor(pod({ pod_count: 6 }))]);

    expect(totals.pods).toBe(10);
  });

  it('adds every money line across the rows', () => {
    const a = lineFor(pod({ pod_amount: 1000 }));
    const b = lineFor(pod({ pod_amount: 2000 }));
    const totals = totalsOf([a, b]);

    expect(totals.collection_total).toBeCloseTo(a.collection_total + b.collection_total, 2);
    expect(totals.gst_amount).toBeCloseTo(a.gst_amount + b.gst_amount, 2);
    expect(totals.venue_receives).toBeCloseTo(a.venue_receives + b.venue_receives, 2);
    expect(totals.host_receives).toBeCloseTo(a.host_receives + b.host_receives, 2);
    expect(totals.duncit_revenue_total).toBeCloseTo(
      a.duncit_revenue_total + b.duncit_revenue_total,
      2
    );
  });

  it('keeps a long list on exact paise rather than drifting on floats', () => {
    // 0.1-style thirds are what a naive float sum smears.
    const rows = Array.from({ length: 30 }, () => lineFor(pod({ pod_amount: 333.33 })));
    const totals = totalsOf(rows);

    expect(totals.collection_total).toBe(Math.round(totals.collection_total * 100) / 100);
    expect(String(totals.collection_total)).not.toMatch(/\.\d{3,}/);
  });

  it('answers zero for an empty calculation', () => {
    expect(totalsOf([])).toEqual({
      pods: 0,
      collection_total: 0,
      gst_amount: 0,
      venue_receives: 0,
      host_receives: 0,
      duncit_revenue_total: 0,
    });
  });
});
