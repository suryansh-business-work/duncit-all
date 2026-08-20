/**
 * What a checkout tells a buyer about their Duncit Coins.
 *
 * The three numbers a bill has to answer — what this purchase spends, what is
 * left afterwards, and what it pays back — computed once for every checkout on
 * every surface (rule 40). mWeb and native render them with their own
 * components; only the arithmetic is shared, and it MIRRORS the server:
 * `coinsForSpend` in coin.service.ts is the same floor of the same product, and
 * `runCoinLeg` earns on the total AFTER coins are spent, which is why `payable`
 * here is the discounted figure rather than the gross.
 */

/** 1 coin = 1 rupee, so a fractional coin is a fraction of a rupee nobody can
 * spend: the grant floors. Server twin: `coinsForSpend`. */
export function coinsForSpend(spendAmount: number, earnPct: number): number {
  const spend = Number(spendAmount) || 0;
  const pct = Number(earnPct) || 0;
  if (spend <= 0 || pct <= 0) return 0;
  return Math.floor((spend * pct) / 100);
}

export interface CoinCheckoutSummary {
  /** Coins this purchase spends. 0 when none are applied. */
  used: number;
  /** Balance left once `used` is taken — never below zero. */
  remaining: number;
  /** Coins this purchase pays back, previewed at the current rate. */
  earning: number;
  /** True when there is anything worth showing a buyer. */
  hasAny: boolean;
}

/**
 * The coin lines for one bill.
 *
 * `payable` must be what is ACTUALLY charged (after the coupon AND after the
 * coins), because that is the figure the server earns on — previewing the earn
 * off the gross would promise coins the buyer never receives.
 *
 * `earnPct` differs by what is being bought: a pod ticket and a shop order earn
 * at separately configured rates, so the caller passes the one that applies.
 */
export function coinCheckoutSummary(input: {
  balance: number;
  applied: number;
  payable: number;
  earnPct: number;
}): CoinCheckoutSummary {
  const balance = Math.max(0, Math.floor(Number(input.balance) || 0));
  const used = Math.max(0, Math.min(Math.floor(Number(input.applied) || 0), balance));
  const earning = coinsForSpend(input.payable, input.earnPct);
  return {
    used,
    remaining: balance - used,
    earning,
    hasAny: used > 0 || earning > 0 || balance > 0,
  };
}
