import { logs } from '@observability/log';
import type { AnalyticsEntity, AnalyticsKpi } from '../entity/shapes';
import { cachedBoards, type BoardLoader } from '../mail/analyticsMail.report';
import {
  AnalyticsAlertModel,
  type AnalyticsAlertCondition,
  type AnalyticsAlertStatus,
  type IAnalyticsAlert,
} from './analyticsAlert.model';
import { notifyTripped, type TrippedAlert } from './analyticsAlert.notice';

/**
 * Reading an alert's tile and deciding whether it tripped.
 *
 * A tripped alert tells people the moment it trips, then once a day while it
 * stays tripped; one back under the line goes quiet until it trips again.
 */

const HOUR_MS = 3_600_000;
/** A tripped alert reminds people this often while it stays tripped. */
const REMIND_MS = 24 * HOUR_MS;

/** Why an alert could not be judged — the console words each one. */
export type AlertErrorCode = 'TILE_GONE' | 'NO_COMPARISON' | 'LOAD_FAILED';

const TRIPS: Record<AnalyticsAlertCondition, (seen: number, threshold: number) => boolean> = {
  ABOVE: (seen, threshold) => seen > threshold,
  BELOW: (seen, threshold) => seen < threshold,
  RISES_BY: (seen, threshold) => seen >= threshold,
  FALLS_BY: (seen, threshold) => -seen >= threshold,
};

/** The tile's change against the period before, in %; null when there is nothing to compare with. */
function changePct(kpi: AnalyticsKpi): number | null {
  if (kpi.previous === null || kpi.previous === 0) return null;
  return ((kpi.value - kpi.previous) / Math.abs(kpi.previous)) * 100;
}

const readsChange = (condition: AnalyticsAlertCondition) => condition === 'RISES_BY' || condition === 'FALLS_BY';

export interface AlertVerdict {
  status: AnalyticsAlertStatus;
  value: number | null;
  error: AlertErrorCode | null;
  tripped: TrippedAlert | null;
}

const failed = (error: AlertErrorCode, value: number | null = null): AlertVerdict => ({
  status: 'ERROR',
  value,
  error,
  tripped: null,
});

/** One alert against the numbers its dashboard shows right now. */
async function judge(alert: IAnalyticsAlert, load: BoardLoader): Promise<AlertVerdict> {
  const board = await load(alert.entity as AnalyticsEntity, alert.days);
  const kpi = board.kpis.find((tile) => tile.key === alert.kpi_key);
  if (!kpi) return failed('TILE_GONE');
  const change = changePct(kpi);
  const seen = readsChange(alert.condition) ? change : kpi.value;
  if (seen === null) return failed('NO_COMPARISON', kpi.value);
  if (!TRIPS[alert.condition](seen, alert.threshold)) {
    return { status: 'OK', value: kpi.value, error: null, tripped: null };
  }
  return {
    status: 'TRIGGERED',
    value: kpi.value,
    error: null,
    tripped: { alert, kpi, change, detailsUrl: kpi.url ?? board.details_url ?? null },
  };
}

/** Whether people hear about this verdict: on tripping, then daily — or always when asked by hand. */
function owesNotice(alert: IAnalyticsAlert, verdict: AlertVerdict, now: Date, force: boolean): boolean {
  if (verdict.status !== 'TRIGGERED') return false;
  if (force || alert.last_status !== 'TRIGGERED' || !alert.last_notified_at) return true;
  return now.getTime() - alert.last_notified_at.getTime() >= REMIND_MS;
}

export interface CheckResult extends AlertVerdict {
  notified: boolean;
}

/** Judge one alert, tell people if owed, and record what was found. */
export async function checkAlert(
  alert: IAnalyticsAlert,
  { load = cachedBoards(), now = new Date(), force = false }: { load?: BoardLoader; now?: Date; force?: boolean } = {}
): Promise<CheckResult> {
  let verdict: AlertVerdict;
  try {
    verdict = await judge(alert, load);
  } catch (error) {
    logs.server.error('analytics-alert', 'check', { error, alert: String(alert._id) });
    verdict = failed('LOAD_FAILED');
  }
  const notified = owesNotice(alert, verdict, now, force) && verdict.tripped ? await notifyTripped(verdict.tripped) : false;
  await AnalyticsAlertModel.updateOne(
    { _id: alert._id },
    {
      $set: {
        last_checked_at: now,
        last_value: verdict.value,
        last_status: verdict.status,
        last_error: verdict.error,
        ...(notified ? { last_notified_at: now } : {}),
      },
    }
  ).exec();
  return { ...verdict, notified };
}

/**
 * Every active alert not checked in the last hour. Each is claimed before it
 * is read, so two servers ticking together never mail the same trip twice.
 */
export async function checkDueAlerts(now: Date = new Date()): Promise<number> {
  const staleBefore = new Date(now.getTime() - HOUR_MS);
  const due = { is_active: true, $or: [{ last_checked_at: null }, { last_checked_at: { $lte: staleBefore } }] };
  const alerts = await AnalyticsAlertModel.find(due);
  const load = cachedBoards();
  let checked = 0;
  for (const alert of alerts) {
    const claimed = await AnalyticsAlertModel.updateOne({ _id: alert._id, ...due }, { $set: { last_checked_at: now } });
    if (claimed.modifiedCount === 0) continue;
    await checkAlert(alert, { load, now });
    checked += 1;
  }
  return checked;
}
