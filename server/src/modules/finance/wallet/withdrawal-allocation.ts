/**
 * Deciding WHICH pod's earnings a withdrawal took.
 *
 * A wallet holds one fungible balance credited by many pods, so this question
 * has no physical answer — money that went in does not keep a label. What it
 * has is an accounting CONVENTION, and this file is that convention in one
 * place: earnings are drawn down OLDEST FIRST, the way a bank statement or a
 * FIFO inventory reads, so the answer is deterministic, explainable to a
 * partner, and identical every time it is computed.
 *
 * Two properties the callers depend on:
 *  - It is decided ONCE, at request time, and stamped on the withdrawal. It is
 *    never recomputed on read, because a later rejection replaying the chain
 *    would silently re-attribute payouts Finance has already actioned.
 *  - It is pure. No database, no clock. The caller supplies the credits and
 *    what earlier withdrawals already consumed, which is what makes the rule
 *    checkable without standing up a wallet.
 *
 * Finance must read the result as attribution, not as legal apportionment.
 */

/** One pod-completion credit that landed in the wallet, oldest first. */
export interface PodCredit {
  pod_id: string;
  pod_title: string;
  release_id: string;
  kind: string;
  amount: number;
}

/** One slice of a withdrawal, charged to the pod that funded it. */
export interface PodAllocation {
  pod_id: string;
  pod_title: string;
  release_id: string;
  kind: string;
  amount: number;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Draw `amount` from `credits` oldest-first, skipping what earlier withdrawals
 * already took from each release.
 *
 * `consumedByRelease` maps release_id -> amount already allocated to it across
 * this user's existing withdrawals. A release is identified by its release_id
 * rather than its pod because one pod can pay the same user twice (a host who
 * is also the club admin), and those two legs carry different roles.
 *
 * Returns fewer allocations than the full amount when the credits do not cover
 * it — a legacy balance credited before this bookkeeping existed has no
 * releases behind it, and an unattributed remainder is the honest answer. The
 * caller must NOT treat a short result as a failure: the withdrawal is still
 * valid, it simply cannot be shown under a pod.
 */
export function allocateWithdrawal(
  credits: readonly PodCredit[],
  consumedByRelease: ReadonlyMap<string, number>,
  amount: number,
): PodAllocation[] {
  let remaining = round2(amount);
  if (remaining <= 0) return [];

  const out: PodAllocation[] = [];
  for (const credit of credits) {
    if (remaining <= 0) break;
    const already = consumedByRelease.get(credit.release_id) ?? 0;
    const available = round2(round2(credit.amount) - already);
    if (available <= 0) continue;
    const take = round2(Math.min(available, remaining));
    if (take <= 0) continue;
    out.push({
      pod_id: credit.pod_id,
      pod_title: credit.pod_title,
      release_id: credit.release_id,
      kind: credit.kind,
      amount: take,
    });
    remaining = round2(remaining - take);
  }
  return out;
}

/**
 * How much of each release earlier withdrawals already spoke for.
 *
 * REJECTED withdrawals are excluded by the caller, not here: rejecting one
 * returns the money to the wallet, so its releases become available again.
 */
export function consumedByRelease(
  existing: readonly { allocations?: readonly { release_id?: string; amount?: number }[] }[],
): Map<string, number> {
  const consumed = new Map<string, number>();
  for (const withdrawal of existing) {
    for (const allocation of withdrawal.allocations ?? []) {
      const key = allocation.release_id ?? '';
      if (!key) continue;
      consumed.set(key, round2((consumed.get(key) ?? 0) + (Number(allocation.amount) || 0)));
    }
  }
  return consumed;
}
