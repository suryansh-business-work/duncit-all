/**
 * Smart Incentive — the server's one copy of the rules.
 *
 * A host may offer a percentage off a pod's TICKET money to the members who
 * stay on the pod page without booking. Staying long enough unlocks the offer
 * for that member on that pod (the popup), and checkout takes it off on its
 * own. It comes off after the multi-ticket discount and before the coupon, the
 * coins and the GST split, so — exactly like the multi-ticket discount — the
 * payment's `total` is already net of it and settlement, which runs on the
 * money collected, makes it host-funded by construction.
 *
 * Server twin of packages/utils/src/smart-incentive.ts: the server imports no
 * @duncit/* package, so the clients mirror these for their previews. A leaf
 * module like pod.ticketDiscount: it imports nothing but GraphQLError, so pod,
 * payment and the incentive module can all share it without an import cycle.
 */
import { GraphQLError } from 'graphql';

/** Seconds on a pod page before the offer shows, until Loyalty saves its own. */
export const DEFAULT_SMART_INCENTIVE_DELAY_SECONDS = 15;
export const SMART_INCENTIVE_DELAY_MIN_SECONDS = 5;
export const SMART_INCENTIVE_DELAY_MAX_SECONDS = 300;

/** The biggest discount a host may offer, until Loyalty saves its own. */
export const DEFAULT_SMART_INCENTIVE_MAX_PCT = 20;
/** The highest Loyalty may raise that ceiling — a ticket is never given away. */
export const SMART_INCENTIVE_MAX_PCT_CEILING = 90;

const toRupees = (value: number) => Math.round(value * 100) / 100;

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/**
 * What an unlocked offer takes off one booking. `ticketNet` is the ticket
 * money after the multi-ticket discount (never add-on products), so the two
 * discounts compound rather than add. Both fields are 0 when nothing applies.
 */
export function smartIncentiveFor(ticketNet: number, pct: number): { pct: number; amount: number } {
  if (!Number.isInteger(pct) || pct <= 0 || !(ticketNet > 0)) return { pct: 0, amount: 0 };
  return { pct, amount: toRupees((ticketNet * pct) / 100) };
}

/** A host's chosen discount, checked against Loyalty's ceiling and returned as a whole number. */
export function assertSmartIncentivePct(pct: unknown, maxPct: number): number {
  const value = Number(pct);
  if (!Number.isInteger(value) || value < 1 || value > maxPct) {
    badInput(`Smart Incentive discount must be a whole number from 1 to ${maxPct}%`);
  }
  return value;
}

/** Loyalty's delay before the offer shows, checked. */
export function assertSmartIncentiveDelay(seconds: unknown): number {
  const value = Number(seconds);
  if (
    !Number.isInteger(value) ||
    value < SMART_INCENTIVE_DELAY_MIN_SECONDS ||
    value > SMART_INCENTIVE_DELAY_MAX_SECONDS
  ) {
    badInput(
      `Enter the delay as whole seconds from ${SMART_INCENTIVE_DELAY_MIN_SECONDS} to ${SMART_INCENTIVE_DELAY_MAX_SECONDS}`
    );
  }
  return value;
}

/** Loyalty's ceiling on what a host may offer, checked. */
export function assertSmartIncentiveCeiling(pct: unknown): number {
  const value = Number(pct);
  if (!Number.isInteger(value) || value < 1 || value > SMART_INCENTIVE_MAX_PCT_CEILING) {
    badInput(`Enter the maximum discount as a whole number from 1 to ${SMART_INCENTIVE_MAX_PCT_CEILING}`);
  }
  return value;
}
