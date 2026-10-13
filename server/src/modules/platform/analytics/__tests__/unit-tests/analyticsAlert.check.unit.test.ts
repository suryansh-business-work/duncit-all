/**
 * Whether an alert trips, when people hear about it, and what is recorded on
 * the alert afterwards. The boards are hand-built; the model and the notice
 * are mocked so the claim-before-read and the once-a-day reminder can be seen.
 */
jest.mock('../../alerts/analyticsAlert.model', () => ({
  AnalyticsAlertModel: { find: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('../../alerts/analyticsAlert.notice', () => ({ notifyTripped: jest.fn() }));
jest.mock('../../mail/analyticsMail.report', () => ({ cachedBoards: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } } }));

import { AnalyticsAlertModel, type IAnalyticsAlert } from '../../alerts/analyticsAlert.model';
import { notifyTripped } from '../../alerts/analyticsAlert.notice';
import { checkAlert, checkDueAlerts } from '../../alerts/analyticsAlert.check';
import { cachedBoards } from '../../mail/analyticsMail.report';
import { logs } from '@observability/log';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-03-15T12:00:00Z');

const board = (kpis: Array<Record<string, unknown>>, details_url: string | null = '/board') =>
  ({ kpis, details_url }) as never;
const kpi = (over: Record<string, unknown> = {}) => ({
  key: 'cancel_rate',
  value: 12,
  previous: 10,
  format: 'PERCENT',
  higher_is_better: false,
  ...over,
});
const alertOf = (over: Partial<IAnalyticsAlert> = {}) =>
  ({
    _id: 'a1',
    entity: 'PODS',
    kpi_key: 'cancel_rate',
    condition: 'ABOVE',
    threshold: 8,
    days: 30,
    last_status: null,
    last_notified_at: null,
    ...over,
  }) as unknown as IAnalyticsAlert;
const loaderOf = (b: unknown) => jest.fn().mockResolvedValue(b);
const savedSet = () => m(AnalyticsAlertModel.updateOne).mock.calls.at(-1)?.[1].$set;

beforeEach(() => {
  jest.clearAllMocks();
  m(AnalyticsAlertModel.updateOne).mockReturnValue({ exec: () => Promise.resolve({}) });
  m(notifyTripped).mockResolvedValue(true);
});

describe('checkAlert', () => {
  it('trips ABOVE on a value over the line, notifies, and records the notice time', async () => {
    const load = loaderOf(board([kpi()]));
    const out = await checkAlert(alertOf(), { load, now: NOW });
    expect(load).toHaveBeenCalledWith('PODS', 30);
    expect(out).toMatchObject({ status: 'TRIGGERED', value: 12, notified: true, error: null });
    expect(m(notifyTripped).mock.calls[0][0]).toMatchObject({ change: 20, detailsUrl: '/board' });
    expect(savedSet()).toMatchObject({ last_status: 'TRIGGERED', last_value: 12, last_notified_at: NOW });
  });

  it('stays OK and silent when under the line', async () => {
    const out = await checkAlert(alertOf({ threshold: 20 }), { load: loaderOf(board([kpi()])), now: NOW });
    expect(out).toMatchObject({ status: 'OK', value: 12, notified: false });
    expect(notifyTripped).not.toHaveBeenCalled();
    expect(savedSet()).not.toHaveProperty('last_notified_at');
  });

  it('BELOW is strict', async () => {
    const at = await checkAlert(alertOf({ condition: 'BELOW', threshold: 12 }), {
      load: loaderOf(board([kpi()])),
      now: NOW,
    });
    expect(at.status).toBe('OK');
    const under = await checkAlert(alertOf({ condition: 'BELOW', threshold: 13 }), {
      load: loaderOf(board([kpi()])),
      now: NOW,
    });
    expect(under.status).toBe('TRIGGERED');
  });

  it('RISES_BY and FALLS_BY read the change in % against the period before', async () => {
    const load = loaderOf(board([kpi({ value: 70, previous: 100 })]));
    const falls = await checkAlert(alertOf({ condition: 'FALLS_BY', threshold: 30 }), { load, now: NOW });
    expect(falls.status).toBe('TRIGGERED');
    const rises = await checkAlert(alertOf({ condition: 'RISES_BY', threshold: 30 }), { load, now: NOW });
    expect(rises.status).toBe('OK');
  });

  it('cannot judge a change with no previous or a zero previous', async () => {
    for (const previous of [null, 0]) {
      const out = await checkAlert(alertOf({ condition: 'RISES_BY' }), {
        load: loaderOf(board([kpi({ previous })])),
        now: NOW,
      });
      expect(out).toMatchObject({ status: 'ERROR', error: 'NO_COMPARISON', value: 12, notified: false });
    }
  });

  it('reports a tile that is no longer on the dashboard', async () => {
    const out = await checkAlert(alertOf({ kpi_key: 'gone' }), { load: loaderOf(board([kpi()])), now: NOW });
    expect(out).toMatchObject({ status: 'ERROR', error: 'TILE_GONE', value: null });
    expect(savedSet()).toMatchObject({ last_status: 'ERROR', last_error: 'TILE_GONE' });
  });

  it('records LOAD_FAILED and logs when the board cannot be read', async () => {
    const load = jest.fn().mockRejectedValue(new Error('db down'));
    const out = await checkAlert(alertOf(), { load, now: NOW });
    expect(out).toMatchObject({ status: 'ERROR', error: 'LOAD_FAILED', notified: false });
    expect(logs.server.error).toHaveBeenCalled();
  });

  it('prefers the tile url over the dashboard url for the details link', async () => {
    await checkAlert(alertOf(), { load: loaderOf(board([kpi({ url: '/tile' })])), now: NOW });
    expect(m(notifyTripped).mock.calls[0][0].detailsUrl).toBe('/tile');
    m(notifyTripped).mockClear();
    await checkAlert(alertOf(), { load: loaderOf(board([kpi()], null)), now: NOW });
    expect(m(notifyTripped).mock.calls[0][0].detailsUrl).toBeNull();
  });

  describe('reminders', () => {
    const tripped = loaderOf(board([kpi()]));

    it('does not repeat inside the day, repeats after it, and always on force', async () => {
      const lately = new Date(NOW.getTime() - 3 * 3_600_000);
      const stale = new Date(NOW.getTime() - 25 * 3_600_000);
      const was = { last_status: 'TRIGGERED' } as const;

      expect(
        (await checkAlert(alertOf({ ...was, last_notified_at: lately }), { load: tripped, now: NOW })).notified
      ).toBe(false);
      expect(notifyTripped).not.toHaveBeenCalled();

      expect(
        (await checkAlert(alertOf({ ...was, last_notified_at: stale }), { load: tripped, now: NOW })).notified
      ).toBe(true);
      expect(
        (await checkAlert(alertOf({ ...was, last_notified_at: lately }), { load: tripped, now: NOW, force: true }))
          .notified
      ).toBe(true);
    });

    it('notifies at once when it has tripped again after being OK', async () => {
      const out = await checkAlert(alertOf({ last_status: 'OK', last_notified_at: NOW }), {
        load: tripped,
        now: NOW,
      });
      expect(out.notified).toBe(true);
    });

    it('defaults to a cached board loader and the real clock', async () => {
      const load = loaderOf(board([kpi({ value: 1 })]));
      m(cachedBoards).mockReturnValue(load);
      const out = await checkAlert(alertOf());
      expect(out.status).toBe('OK');
      expect(load).toHaveBeenCalledTimes(1);
    });
  });
});

describe('checkDueAlerts', () => {
  it('claims each stale alert before reading it and skips one another server took', async () => {
    const first = alertOf({ _id: 'a1' });
    const second = alertOf({ _id: 'a2' });
    const load = loaderOf(board([kpi({ value: 1 })]));
    m(cachedBoards).mockReturnValue(load);
    m(AnalyticsAlertModel.find).mockResolvedValue([first, second]);
    m(AnalyticsAlertModel.updateOne)
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockReturnValueOnce({ exec: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ modifiedCount: 0 });

    const checked = await checkDueAlerts(NOW);

    expect(checked).toBe(1);
    const due = m(AnalyticsAlertModel.find).mock.calls[0][0];
    expect(due.is_active).toBe(true);
    expect(due.$or[1].last_checked_at.$lte).toEqual(new Date(NOW.getTime() - 3_600_000));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('checks nothing when no alert is due', async () => {
    m(AnalyticsAlertModel.find).mockResolvedValue([]);
    m(cachedBoards).mockReturnValue(loaderOf(board([])));
    expect(await checkDueAlerts()).toBe(0);
  });
});
