import { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { AppEventModel } from '../appEvent.model';
import { AppSessionModel } from '../appSession.model';
import { narrowing, type ProductScope } from '../product/product.filter';
import { isVisitor, seenBefore, stitchedActivity } from '../product/product.identity';
import { computeRetention } from '../product/product.retention.calc';
import { dayKeyIn, inRange } from './window';

/**
 * The figures of Analytics > Product > Overview for one period, computed the
 * same way for the period shown and the one it is compared with.
 *
 * People are members, plus devices nobody has signed in on (stitched — see
 * product.identity.ts). "New" means the app had never seen them before the
 * period began, over the whole retained history (13 months).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Activity is read this far past the period, so a person new on its last day can still show D30. */
const FOLLOW_DAYS = 30;

export interface PeriodPeople {
  /** Every person active in the period, with their active days (follow-up days included). */
  activity: Map<string, Set<string>>;
  active: Set<string>;
  /** person → first day, for the people new in the period. */
  newcomers: Map<string, string>;
  fromDay: string;
  toDay: string;
}

const firstDay = (days: ReadonlySet<string>) => [...days].sort((a, b) => a.localeCompare(b))[0];

export async function periodPeople(scope: ProductScope, from: Date, to: Date): Promise<PeriodPeople> {
  const zone = scope.window.zone;
  const until = new Date(Math.min(Date.now(), to.getTime() + FOLLOW_DAYS * DAY_MS));
  const activity = await stitchedActivity({ occurred_at: inRange(from, until), ...narrowing(scope) }, zone);
  const fromDay = dayKeyIn(from, zone);
  const toDay = dayKeyIn(new Date(to.getTime() - 1), zone);
  const active = new Set<string>();
  const candidates = new Map<string, string>();
  for (const [actor, days] of activity) {
    const first = firstDay(days);
    if (first > toDay) continue;
    active.add(actor);
    if (first >= fromDay) candidates.set(actor, first);
  }
  for (const actor of await seenBefore(candidates.keys(), from)) candidates.delete(actor);
  return { activity, active, newcomers: candidates, fromDay, toDay };
}

/** People active on any of the last `days` days of the period. */
export function activeInLast(people: PeriodPeople, days: number): number {
  const since = new Date(Date.parse(`${people.toDay}T00:00:00.000Z`) - (days - 1) * DAY_MS).toISOString().slice(0, 10);
  let count = 0;
  for (const actor of people.active) {
    const recent = [...(people.activity.get(actor) ?? [])].some((day) => day >= since && day <= people.toDay);
    if (recent) count += 1;
  }
  return count;
}

/** Distinct people per day of the period, averaged over its days. */
export function averageDaily(people: PeriodPeople, days: number): number {
  let personDays = 0;
  for (const actor of people.active) {
    for (const day of people.activity.get(actor) ?? []) {
      if (day >= people.fromDay && day <= people.toDay) personDays += 1;
    }
  }
  return days > 0 ? Math.round((personDays / days) * 10) / 10 : 0;
}

/** D1 / D7 / D30 of the period's newcomers, over the cohorts old enough to have reached each; null when none has. */
export function newcomerRetention(people: PeriodPeople, today: string): Map<number, number | null> {
  const table = computeRetention(people.newcomers, people.activity, 'DAY', today);
  return new Map(table.offsets.map((offset, index) => [offset, table.average[index]]));
}

/** The members among the active people who paid for something in the period (a Payment with paid_at). */
export async function payingMembers(people: PeriodPeople, from: Date, to: Date): Promise<number> {
  const members = [...people.active].filter((actor) => !isVisitor(actor) && Types.ObjectId.isValid(actor));
  if (members.length === 0) return 0;
  const payers = await PaymentModel.distinct('user_id', {
    user_id: { $in: members.map((id) => new Types.ObjectId(id)) },
    paid_at: inRange(from, to),
  });
  return payers.length;
}

export interface SessionFigures {
  sessions: number;
  avgDurationMs: number;
  avgScreens: number;
}

export async function sessionFigures(scope: ProductScope, from: Date, to: Date): Promise<SessionFigures> {
  const [row] = await AppSessionModel.aggregate<{ sessions: number; duration: number; screens: number }>([
    { $match: { started_at: inRange(from, to), ...narrowing(scope) } },
    { $group: { _id: null, sessions: { $sum: 1 }, duration: { $avg: '$duration_ms' }, screens: { $avg: '$screen_views' } } },
  ]);
  return {
    sessions: row?.sessions ?? 0,
    avgDurationMs: Math.round(row?.duration ?? 0),
    avgScreens: Math.round((row?.screens ?? 0) * 10) / 10,
  };
}

/** Devices whose first event ever falls in the period — first opens, as far as tracking can tell. */
export async function newDevices(scope: ProductScope, from: Date, to: Date): Promise<number> {
  const devices = await AppEventModel.distinct('device_id', { occurred_at: inRange(from, to), ...narrowing(scope) });
  if (devices.length === 0) return 0;
  const older = await AppEventModel.distinct('device_id', { device_id: { $in: devices }, occurred_at: { $lt: from } });
  return devices.length - older.length;
}
