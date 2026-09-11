/**
 * Duncit Coin expiry.
 *
 * Every grant is a batch ("lot") with its own date: a CREDIT row carries
 * `expires_at` and a `remaining` count that starts at the amount granted.
 * Spending draws `remaining` down soonest-expiring first, so the coins a member
 * uses are the ones that would otherwise lapse. Once a lot's date passes, the
 * sweep here takes back whatever is left of it and writes a COIN_EXPIRY debit,
 * so the ledger still explains every coin that left the balance.
 *
 * What never expires needs no bookkeeping: rows written before expiry existed,
 * gift-card coins (bought, not granted) and grants made while expiry was
 * switched off carry no `remaining`, and simply make up the rest of the balance.
 * A spend only reaches them once every expiring lot is used up.
 *
 * The expiry date is stamped at grant time — the setting is read then and never
 * again, exactly like the earn rate — so changing it never rewrites what a
 * member was already given.
 */
import { type ClientSession, type Types } from 'mongoose';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { CoinBalanceModel, CoinTransactionModel } from './coin.model';
import { coinSettingsService } from './coin.settings.service';
import { appDate, getAppTimeZone } from '@utils/app-time';
import { logs } from '@observability/log';

const SWEEP_INTERVAL_MS = 10 * 60_000; // every 10 minutes
const FIRST_SWEEP_DELAY_MS = 2 * 60_000; // ~2 min after boot

/** What a new grant carries so it can expire. Empty when expiry is off. */
export type CoinLotFields = { expires_at?: Date; remaining?: number };

/**
 * The instant a grant made at `grantedAt` lapses: the END of the day `days`
 * days later, in the app time zone. "Valid till 11 Oct" then holds for all of
 * 11 Oct, and every grant made on one day shares one expiry instant — which is
 * what lets the "next to expire" line group them by a plain equality.
 *
 * Null when `days` is 0: expiry is switched off.
 */
export function coinExpiryAt(
  grantedAt: Date,
  days: number,
  tz: string = getAppTimeZone()
): Date | null {
  if (!(days > 0)) return null;
  // The wall-clock day of the grant in the configured zone, moved on by whole
  // days and closed at its last millisecond, then turned back into a real
  // instant — calendar days, not 24-hour blocks, so a DST shift cannot move it.
  const zoned = toZonedTime(grantedAt, tz);
  const lastDay = new Date(
    zoned.getFullYear(),
    zoned.getMonth(),
    zoned.getDate() + days,
    23,
    59,
    59,
    999
  );
  return fromZonedTime(lastDay, tz);
}

/** The lot fields for a grant made now: its expiry and the full amount still
 * unspent. Spread into the CREDIT row. */
export async function expiringLot(coins: number): Promise<CoinLotFields> {
  const expiresAt = coinExpiryAt(new Date(), await coinSettingsService.expiryDays());
  return expiresAt ? { expires_at: expiresAt, remaining: coins } : {};
}

/**
 * Draw a spend down from one member's lots, soonest-expiring first. Whatever
 * the lots do not cover came out of the never-expiring part of the balance.
 *
 * Each lot is reduced by a clamped pipeline update that reports what it held,
 * so a sweep or a second spend reaching the same lot between the read and the
 * write can never take it below zero or count it twice.
 */
export async function consumeLots(
  userId: Types.ObjectId,
  coins: number,
  session?: ClientSession
): Promise<void> {
  let left = coins;
  const lots = await CoinTransactionModel.find({ user_id: userId, remaining: { $gt: 0 } })
    .sort({ expires_at: 1, _id: 1 })
    .select('_id')
    .session(session ?? null)
    .lean();
  for (const lot of lots) {
    if (left <= 0) return;
    const before = await CoinTransactionModel.findOneAndUpdate(
      { _id: lot._id, remaining: { $gt: 0 } },
      [{ $set: { remaining: { $max: [0, { $subtract: ['$remaining', left] }] } } }],
      { new: false, session, projection: { remaining: 1 } }
    ).lean();
    left -= Math.min(before?.remaining ?? 0, left);
  }
}

/**
 * The soonest batch still due to lapse — its date and every unspent coin that
 * lapses with it. Lots already past their date are the sweep's, not this
 * line's. Null when nothing the member holds is set to expire.
 */
export async function nextExpiry(
  userId: Types.ObjectId
): Promise<{ coins: number; at: Date } | null> {
  const [soonest] = await CoinTransactionModel.aggregate<{ _id: Date; coins: number }>([
    { $match: { user_id: userId, remaining: { $gt: 0 }, expires_at: { $gt: new Date() } } },
    { $group: { _id: '$expires_at', coins: { $sum: '$remaining' } } },
    { $sort: { _id: 1 } },
    { $limit: 1 },
  ]);
  return soonest ? { coins: soonest.coins, at: soonest._id } : null;
}

/**
 * Take back what is left of one lapsed lot.
 *
 * The claim — zeroing the remainder in one conditional write that reports what
 * it held — is the whole idempotency guard: a second sweep, or a spend that got
 * there first, finds nothing left to claim. The balance only gives up what it
 * actually has, so a balance that drifted under its own lots never goes
 * negative.
 */
async function expireLot(lotId: Types.ObjectId): Promise<number> {
  const lot = await CoinTransactionModel.findOneAndUpdate(
    { _id: lotId, remaining: { $gt: 0 } },
    { $set: { remaining: 0 } },
    { new: false, projection: { user_id: 1, remaining: 1, created_at: 1 } }
  ).lean();
  if (!lot || lot.remaining <= 0) return 0;

  const before = await CoinBalanceModel.findOneAndUpdate(
    { user_id: lot.user_id },
    [{ $set: { balance: { $max: [0, { $subtract: ['$balance', lot.remaining] }] } } }],
    { new: false, projection: { balance: 1 } }
  ).lean();
  const held = before?.balance ?? 0;
  const taken = Math.min(lot.remaining, held);
  if (taken <= 0) return 0;

  await CoinTransactionModel.create({
    user_id: lot.user_id,
    type: 'DEBIT',
    amount: taken,
    balance_after: held - taken,
    source: 'COIN_EXPIRY',
    reason: `Unused coins from ${appDate(lot.created_at)} expired`,
  });
  return taken;
}

/**
 * One sweep: expire every lot whose date has passed with coins still on it.
 * Exported so it can be run on demand. Returns the coins taken back.
 */
export async function runCoinExpirySweep(now: Date = new Date()): Promise<number> {
  const cursor = CoinTransactionModel.find({ remaining: { $gt: 0 }, expires_at: { $lte: now } })
    .sort({ expires_at: 1 })
    .select('_id')
    .lean()
    .cursor();

  let expired = 0;
  for await (const lot of cursor) {
    try {
      expired += await expireLot(lot._id);
    } catch (error) {
      // One lot's failure never aborts the sweep; an unclaimed lot is simply
      // retried on the next tick.
      logs.server.error('coin-expiry', 'expireLot', {
        error,
        lot_id: String(lot._id),
        msg: 'coin expiry failed',
      });
    }
  }
  return expired;
}

/** Start the expiry loop (first sweep ~2 min after boot). Returns a stop
 * function. No-ops under NODE_ENV=test. */
export function startCoinExpiryScheduler(): () => void {
  if (process.env.NODE_ENV === 'test') return () => undefined;
  let sweeping = false;
  const sweep = () => {
    if (sweeping) return;
    sweeping = true;
    runCoinExpirySweep()
      .then((expired) => {
        if (expired > 0) logs.server.info('coin-expiry', 'sweep', { expired });
      })
      .catch((error) => {
        logs.server.error('coin-expiry', 'sweep', { error, msg: 'sweep failed' });
      })
      .finally(() => {
        sweeping = false;
      });
  };
  const first = setTimeout(sweep, FIRST_SWEEP_DELAY_MS);
  const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
  // Never keep the process alive just for the expiry sweep.
  first.unref?.();
  interval.unref?.();
  return () => {
    clearTimeout(first);
    clearInterval(interval);
  };
}
