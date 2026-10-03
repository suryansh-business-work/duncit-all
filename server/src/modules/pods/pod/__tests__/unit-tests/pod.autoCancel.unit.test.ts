/**
 * Auto-cancellation of finance-negative pods. The finance waterfall, the cancel
 * itself, the settings and the models are faked; what is under test is the
 * venue refund ladder, the per-venue trigger window, the read window the sweep
 * opens, which pods it cancels / skips / survives failing on, and that the
 * scheduler runs the cancel sweep before the risk sweep with each failure
 * isolated.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } },
}));
jest.mock('../../pod.model', () => ({ PodModel: { find: jest.fn() } }));
jest.mock('../../pod.service', () => ({ podService: { systemCancelPod: jest.fn() } }));
jest.mock('../../pod.lifecycle', () => ({ podLifecycleFilter: jest.fn(() => ({ lifecycle: 'UPCOMING' })) }));
jest.mock('../../pod.cancellationRisk', () => ({
  podFinanceNow: jest.fn(),
  runPodCancellationRiskSweep: jest.fn(),
}));
jest.mock('@modules/venues/venue/venue.model', () => ({
  DEFAULT_CANCELLATION_TRIGGER_HOURS: 6,
  VenueModel: { findById: jest.fn(), aggregate: jest.fn() },
}));
jest.mock('@modules/platform/settings/settings.service', () => ({
  settingsService: { getPodAutoCancelSettings: jest.fn() },
}));
jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn(() => () => undefined) }));

import { logs } from '@observability/log';
import { PodModel } from '../../pod.model';
import { podService } from '../../pod.service';
import { podLifecycleFilter } from '../../pod.lifecycle';
import { podFinanceNow, runPodCancellationRiskSweep } from '../../pod.cancellationRisk';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { startClusterJob } from '@utils/clusterJob';
import {
  autoCancelRefundPct,
  runPodAutoCancelSweep,
  startPodAutoCancelScheduler,
  venueTriggerHours,
} from '../../pod.autoCancel';

const podFind = PodModel.find as jest.Mock;
const cancel = podService.systemCancelPod as jest.Mock;
const lifecycle = podLifecycleFilter as jest.Mock;
const financeNow = podFinanceNow as jest.Mock;
const riskSweep = runPodCancellationRiskSweep as jest.Mock;
const venueFindById = VenueModel.findById as jest.Mock;
const venueAggregate = VenueModel.aggregate as jest.Mock;
const getSettings = settingsService.getPodAutoCancelSettings as jest.Mock;
const clusterJob = startClusterJob as jest.Mock;
const logInfo = logs.server.info as jest.Mock;
const logWarn = logs.server.warn as jest.Mock;
const logError = logs.server.error as jest.Mock;

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-11-01T10:00:00.000Z');
const at = (hoursFromNow: number) => new Date(NOW.getTime() + hoursFromNow * HOUR);
const oid = (n: number) => new Types.ObjectId(`65f3000000000000000000${String(n).padStart(2, '0')}`);

const policy = (over: Record<string, unknown> = {}) =>
  ({ reschedule_only: false, tiers: [], trigger_hours: 6, refund_tiers: [], ...over }) as any;

describe('autoCancelRefundPct', () => {
  const ladder = policy({
    refund_tiers: [
      { hours_before: 24, refund_pct: 100 },
      { hours_before: 6, refund_pct: 50 },
      { hours_before: 2, refund_pct: 25 },
    ],
  });

  it('returns null for a reschedule_only venue — cancelling is off the table', () => {
    expect(autoCancelRefundPct(policy({ reschedule_only: true }), 10)).toBeNull();
  });

  it('refunds in full when the venue has no ladder (or no policy at all)', () => {
    expect(autoCancelRefundPct(policy(), 1)).toBe(100);
    expect(autoCancelRefundPct(null, 1)).toBe(100);
    expect(autoCancelRefundPct(undefined, 1)).toBe(100);
    expect(autoCancelRefundPct({ reschedule_only: false } as any, 1)).toBe(100);
  });

  it('pays the widest band the notice clears', () => {
    expect(autoCancelRefundPct(ladder, 30)).toBe(100);
    expect(autoCancelRefundPct(ladder, 7)).toBe(50);
    expect(autoCancelRefundPct(ladder, 3)).toBe(25);
  });

  it('requires the notice to strictly CLEAR a band — equal is not enough', () => {
    expect(autoCancelRefundPct(ladder, 6)).toBe(25);
    expect(autoCancelRefundPct(ladder, 2)).toBe(0);
  });

  it('refunds nothing when no band is cleared', () => {
    expect(autoCancelRefundPct(ladder, 1)).toBe(0);
  });

  it('picks the widest band even when the ladder is stored out of order', () => {
    const unordered = policy({
      refund_tiers: [
        { hours_before: 2, refund_pct: 10 },
        { hours_before: 12, refund_pct: 80 },
        { hours_before: 6, refund_pct: 40 },
      ],
    });
    expect(autoCancelRefundPct(unordered, 20)).toBe(80);
  });

  it('clamps the band’s percentage into 0..100 and treats garbage as 0', () => {
    expect(autoCancelRefundPct(policy({ refund_tiers: [{ hours_before: 0, refund_pct: 150 }] }), 1)).toBe(100);
    expect(autoCancelRefundPct(policy({ refund_tiers: [{ hours_before: 0, refund_pct: -20 }] }), 1)).toBe(0);
    expect(autoCancelRefundPct(policy({ refund_tiers: [{ hours_before: 0, refund_pct: 'abc' }] }), 1)).toBe(0);
  });
});

describe('venueTriggerHours', () => {
  it('uses the venue’s own trigger hours, including 0', () => {
    expect(venueTriggerHours(policy({ trigger_hours: 12 }))).toBe(12);
    expect(venueTriggerHours(policy({ trigger_hours: 0 }))).toBe(0);
  });

  it('falls back to the 6-hour default for a venue that holds no number', () => {
    expect(venueTriggerHours(null)).toBe(6);
    expect(venueTriggerHours(undefined)).toBe(6);
    expect(venueTriggerHours({} as any)).toBe(6);
    expect(venueTriggerHours(policy({ trigger_hours: 'soon' }))).toBe(6);
  });
});

describe('runPodAutoCancelSweep', () => {
  let cursorPods: any[];
  let sort: jest.Mock;

  const venueWith = (cancellation: unknown) => ({
    select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(cancellation === undefined ? null : { settings: { cancellation } }) })),
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'queueMicrotask'] });
    cursorPods = [];
    sort = jest.fn(() => ({
      cursor: () =>
        (async function* () {
          for (const pod of cursorPods) yield pod;
        })(),
    }));
    podFind.mockReturnValue({ sort });
    getSettings.mockResolvedValue({ enabled: true, lead_hours: 4 });
    venueAggregate.mockResolvedValue([{ max: 10 }]);
    financeNow.mockResolvedValue({ negative: true });
    cancel.mockResolvedValue(2);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing at all while the sweep is switched off', async () => {
    getSettings.mockResolvedValue({ enabled: false, lead_hours: 4 });

    await expect(runPodAutoCancelSweep()).resolves.toBe(0);
    expect(podFind).not.toHaveBeenCalled();
    expect(venueAggregate).not.toHaveBeenCalled();
  });

  it('reads live upcoming pods soonest-first out to the widest venue trigger', async () => {
    await runPodAutoCancelSweep();

    expect(venueAggregate).toHaveBeenCalledWith([
      { $group: { _id: null, max: { $max: '$settings.cancellation.trigger_hours' } } },
    ]);
    expect(lifecycle).toHaveBeenCalledWith('UPCOMING', NOW);
    expect(podFind).toHaveBeenCalledWith({
      lifecycle: 'UPCOMING',
      is_active: true,
      pod_date_time: { $gt: NOW, $lte: at(10) },
    });
    expect(sort).toHaveBeenCalledWith({ pod_date_time: 1 });
  });

  it('reads out to the platform lead hours when they exceed every venue trigger', async () => {
    getSettings.mockResolvedValue({ enabled: true, lead_hours: 20 });
    await runPodAutoCancelSweep();
    expect(podFind.mock.calls[0][0].pod_date_time.$lte).toEqual(at(20));
  });

  it('never reads closer than the 6-hour default, even if every venue triggers sooner', async () => {
    getSettings.mockResolvedValue({ enabled: true, lead_hours: 1 });
    venueAggregate.mockResolvedValue([{ max: 2 }]);
    await runPodAutoCancelSweep();
    expect(podFind.mock.calls[0][0].pod_date_time.$lte).toEqual(at(6));
  });

  it('reads the 6-hour default when no venue holds a trigger (or there are no venues)', async () => {
    getSettings.mockResolvedValue({ enabled: true, lead_hours: 1 });
    venueAggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([{ max: null }]);
    await runPodAutoCancelSweep();
    await runPodAutoCancelSweep();
    expect(podFind.mock.calls[0][0].pod_date_time.$lte).toEqual(at(6));
    expect(podFind.mock.calls[1][0].pod_date_time.$lte).toEqual(at(6));
  });

  it('cancels a negative pod inside its venue’s window with the ladder’s refund on the reason', async () => {
    const pod = { _id: oid(1), id: String(oid(1)), venue_id: oid(2), pod_date_time: at(5) };
    cursorPods = [pod];
    venueFindById.mockReturnValue(
      venueWith(policy({ trigger_hours: 8, refund_tiers: [{ hours_before: 4, refund_pct: 33.333 }] }))
    );

    await expect(runPodAutoCancelSweep()).resolves.toBe(1);

    expect(venueFindById).toHaveBeenCalledWith(pod.venue_id);
    expect(financeNow).toHaveBeenCalledWith(pod);
    expect(cancel).toHaveBeenCalledWith(
      String(oid(1)),
      'Cancelled automatically — the pod could not cover its venue cost (venue policy refund: 33.33%)',
      33.333
    );
    expect(logInfo).toHaveBeenCalledWith('pod-auto-cancel', 'cancelIfNegative', {
      pod_id: String(oid(1)),
      refunded_payments: 2,
      refund_pct: 33.333,
      msg: 'finance-negative pod auto-cancelled',
    });
  });

  it('leaves a pod alone until its own venue window opens, without pricing it', async () => {
    cursorPods = [{ _id: oid(1), venue_id: oid(2), pod_date_time: at(9) }];
    venueFindById.mockReturnValue(venueWith(policy({ trigger_hours: 8 })));

    await expect(runPodAutoCancelSweep()).resolves.toBe(0);
    expect(financeNow).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('gates a venue-less (virtual) pod on the platform lead hours and refunds in full', async () => {
    const outside = { _id: oid(3), venue_id: null, pod_date_time: at(5) };
    const inside = { _id: oid(4), venue_id: null, pod_date_time: at(3) };
    cursorPods = [outside, inside];

    await expect(runPodAutoCancelSweep()).resolves.toBe(1);

    expect(venueFindById).not.toHaveBeenCalled();
    expect(financeNow).toHaveBeenCalledTimes(1);
    expect(financeNow).toHaveBeenCalledWith(inside);
    expect(cancel).toHaveBeenCalledWith(
      String(oid(4)),
      'Cancelled automatically — the pod could not cover its venue cost (venue policy refund: 100%)',
      100
    );
  });

  it('uses the default trigger for a venue whose row has gone (no settings)', async () => {
    cursorPods = [{ _id: oid(5), venue_id: oid(6), pod_date_time: at(5) }];
    venueFindById.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({}) }) });

    await expect(runPodAutoCancelSweep()).resolves.toBe(1);
    expect(cancel).toHaveBeenCalledWith(String(oid(5)), expect.stringContaining('100%'), 100);
  });

  it('does not cancel a pod whose finance is healthy', async () => {
    cursorPods = [{ _id: oid(1), venue_id: null, pod_date_time: at(1) }];
    financeNow.mockResolvedValue({ negative: false });

    await expect(runPodAutoCancelSweep()).resolves.toBe(0);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('skips and warns about a negative pod at a reschedule_only venue', async () => {
    cursorPods = [{ _id: oid(7), venue_id: oid(2), pod_date_time: at(1) }];
    venueFindById.mockReturnValue(venueWith(policy({ reschedule_only: true })));

    await expect(runPodAutoCancelSweep()).resolves.toBe(0);
    expect(cancel).not.toHaveBeenCalled();
    expect(logWarn).toHaveBeenCalledWith('pod-auto-cancel', 'cancelIfNegative', {
      pod_id: String(oid(7)),
      msg: 'finance-negative pod skipped: venue is reschedule_only',
    });
  });

  it('does not count a cancel that the CAS lost (already cancelled elsewhere)', async () => {
    cursorPods = [{ _id: oid(8), venue_id: null, pod_date_time: at(1) }];
    cancel.mockResolvedValue(null);

    await expect(runPodAutoCancelSweep()).resolves.toBe(0);
    expect(logInfo).not.toHaveBeenCalled();
  });

  it('logs one pod failing and still evaluates the rest', async () => {
    const broken = { _id: oid(9), id: 'broken-pod', venue_id: null, pod_date_time: at(1) };
    const fine = { _id: oid(10), id: 'fine-pod', venue_id: null, pod_date_time: at(2) };
    cursorPods = [broken, fine];
    const boom = new Error('finance read failed');
    financeNow.mockRejectedValueOnce(boom).mockResolvedValueOnce({ negative: true });

    await expect(runPodAutoCancelSweep()).resolves.toBe(1);
    expect(logError).toHaveBeenCalledWith('pod-auto-cancel', 'cancelIfNegative', {
      error: boom,
      pod_id: 'broken-pod',
      msg: 'auto-cancel evaluation failed',
    });
    expect(cancel).toHaveBeenCalledWith(String(oid(10)), expect.any(String), 100);
  });
});

describe('startPodAutoCancelScheduler', () => {
  const capturedJob = () => {
    const stop = startPodAutoCancelScheduler();
    expect(typeof stop).toBe('function');
    return clusterJob.mock.calls[0][0];
  };

  it('registers a cluster job every 10 minutes, first run ~1.5 min after boot', () => {
    expect(capturedJob()).toEqual({
      component: 'pod-auto-cancel',
      operation: 'sweep',
      firstDelayMs: 90_000,
      intervalMs: 600_000,
      run: expect.any(Function),
    });
  });

  it('runs the cancel sweep before the risk sweep', async () => {
    const order: string[] = [];
    getSettings.mockImplementation(async () => {
      order.push('cancel');
      return { enabled: false, lead_hours: 0 };
    });
    riskSweep.mockImplementation(async () => {
      order.push('risk');
    });

    await capturedJob().run();

    expect(order).toEqual(['cancel', 'risk']);
    expect(logError).not.toHaveBeenCalled();
  });

  it('still runs the risk sweep when the cancel sweep throws, and logs each failure on its own', async () => {
    const cancelBoom = new Error('settings down');
    const riskBoom = new Error('risk down');
    getSettings.mockRejectedValue(cancelBoom);
    riskSweep.mockRejectedValue(riskBoom);

    await expect(capturedJob().run()).resolves.toBeUndefined();

    expect(riskSweep).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith('pod-auto-cancel', 'sweep', { error: cancelBoom, msg: 'sweep failed' });
    expect(logError).toHaveBeenCalledWith('pod-cancel-risk', 'sweep', { error: riskBoom, msg: 'risk sweep failed' });
  });
});
