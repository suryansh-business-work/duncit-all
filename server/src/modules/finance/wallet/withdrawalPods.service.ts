/**
 * The Finance portal's Withdrawal Payments view, grouped by pod.
 *
 * Two reads, one behind the other:
 *  - {@link podWithdrawalGroupsTable} — one row per pod that somebody has
 *    withdrawn against, with who has asked so far and whether Finance is done.
 *  - {@link podWithdrawalsTable} — that pod's individual withdrawal requests,
 *    the rows Finance actually marks paid or rejects.
 *
 * Both read the `allocations` stamped on each withdrawal at request time (see
 * withdrawal-allocation.ts). Nothing here re-derives attribution: a rejected
 * withdrawal has already had its allocations cleared, so it drops out of both
 * levels on its own rather than needing a status filter to hide it.
 */
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import {
  WalletWithdrawalModel,
  WITHDRAWER_ROLE_BY_KIND,
  type IWalletWithdrawal,
} from './wallet.model';
import { WITHDRAWER_ROLES, type WithdrawerRole } from '@modules/finance/finance/finance.model';
import {
  applyTableQueryInMemory,
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from '@utils/table-query';

/** A pod is only settled once every request against it has actually been paid. */
export type PodWithdrawalStatus = 'PENDING' | 'APPROVED';

export interface PodWithdrawalGroupRow extends Record<string, unknown> {
  pod_id: string;
  pod_title: string;
  requested_from: WithdrawerRole[];
  status: PodWithdrawalStatus;
  attributed_total: number;
  withdrawal_count: number;
  last_requested_at: string;
}

/**
 * Allowlists for the grouped list. The rows are computed, not documents, so
 * this drives {@link applyTableQueryInMemory} rather than a mongo query.
 *
 * `requested_from` is deliberately absent from both sort and filter maps: the
 * role filter is applied to the ALLOCATIONS before grouping (below), because
 * filtering a pod row by an array of roles after the fact would keep pods whose
 * other partners match and silently misreport their totals.
 */
const POD_GROUP_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title'],
  sortFields: {
    pod_title: 'pod_title',
    status: 'status',
    attributed_total: 'attributed_total',
    withdrawal_count: 'withdrawal_count',
    last_requested_at: 'last_requested_at',
  },
  filterFields: {
    pod_title: { type: 'string' },
    status: { type: 'enum' },
    attributed_total: { type: 'number' },
  },
  defaultSort: { last_requested_at: -1 },
};

/** Shape one `$group` bucket into the row the portal renders. */
function toGroupRow(bucket: any): PodWithdrawalGroupRow {
  const roles = new Set<WithdrawerRole>();
  for (const kind of bucket.kinds ?? []) {
    const role = WITHDRAWER_ROLE_BY_KIND[kind as keyof typeof WITHDRAWER_ROLE_BY_KIND];
    if (role) roles.add(role);
  }
  const statuses: string[] = bucket.statuses ?? [];
  return {
    pod_id: String(bucket._id),
    pod_title: bucket.pod_title ?? '',
    // Stable order, so the chips never reshuffle between pages.
    requested_from: WITHDRAWER_ROLES.filter((role) => roles.has(role)),
    // "Approved only if ALL requests are fulfilled" — one still-pending request
    // holds the whole pod at Pending. Rejected requests never reach here (their
    // allocations are cleared on rejection), so PAID is the only settled state.
    status: statuses.every((s) => s === 'PAID') ? 'APPROVED' : 'PENDING',
    attributed_total: Math.round((Number(bucket.attributed_total) || 0) * 100) / 100,
    withdrawal_count: (bucket.withdrawal_ids ?? []).length,
    last_requested_at: bucket.last_requested_at?.toISOString?.() ?? '',
  };
}

/**
 * The role the caller is narrowing to, pulled out of the generic table input.
 *
 * It arrives as an ordinary `requested_from` filter because that is what makes
 * the portal's page-level Role select reset paging and refetch — but it CANNOT
 * be applied like one. `requested_from` is an array computed per pod, so
 * matching it after grouping would keep any pod whose OTHER partners matched
 * and then report totals that include their money. It is applied to the
 * allocations before the group instead, which is why the field is deliberately
 * absent from POD_GROUP_TABLE_CONFIG.filterFields — the in-memory pass must
 * drop it rather than apply it a second time.
 */
function roleFilterOf(input?: TableQueryInput | null): string | null {
  const filter = (input?.filters ?? []).find((f) => f.field === 'requested_from');
  return filter?.value?.trim() || null;
}

export const withdrawalPodsService = {
  /**
   * One row per pod somebody has withdrawn against.
   *
   * A role filter narrows to pods where THAT partner has requested, applied to
   * the unwound allocations so a pod's totals only ever count the matching
   * legs. Pods with no matching allocation drop out entirely.
   */
  async podWithdrawalGroupsTable(input?: TableQueryInput | null) {
    const role = roleFilterOf(input);
    const kinds = role
      ? Object.entries(WITHDRAWER_ROLE_BY_KIND)
          .filter(([, value]) => value === role)
          .map(([kind]) => kind)
      : [];
    // An unknown role would match no kind and silently return every pod, which
    // reads as "the filter did nothing" rather than "nothing matched".
    if (role && kinds.length === 0) {
      return { rows: [] as PodWithdrawalGroupRow[], total: 0, page: 1, page_size: 25 };
    }

    const match: Record<string, unknown> = { 'allocations.0': { $exists: true } };
    const buckets = await WalletWithdrawalModel.aggregate([
      { $match: match },
      { $unwind: '$allocations' },
      ...(kinds.length > 0 ? [{ $match: { 'allocations.kind': { $in: kinds } } }] : []),
      {
        $group: {
          _id: '$allocations.pod_id',
          // $max, not $last: a group's order is undefined, and a credit whose
          // release no longer resolved was stamped with an empty title. $max
          // prefers any real title over ''.
          pod_title: { $max: '$allocations.pod_title' },
          kinds: { $addToSet: '$allocations.kind' },
          statuses: { $addToSet: '$status' },
          attributed_total: { $sum: '$allocations.amount' },
          // The set, not a running count: this pipeline has been $unwound, so
          // one withdrawal that paid this pod through TWO legs (a host who is
          // also its club admin) contributes two rows and would be counted
          // twice. It is withdrawal requests being counted, not slices.
          withdrawal_ids: { $addToSet: '$_id' },
          last_requested_at: { $max: '$requested_at' },
        },
      },
      // $group emits buckets in an UNDEFINED order, so without this the
      // in-memory sort below would be stable over a different sequence on every
      // call and rows would hop between pages.
      { $sort: { last_requested_at: -1, _id: -1 } },
    ]);

    const rows = buckets.map(toGroupRow);
    return applyTableQueryInMemory(rows, input, POD_GROUP_TABLE_CONFIG);
  },

  /**
   * The same row as the list, for ONE pod — the drill-down's header.
   *
   * Null when nothing has been withdrawn against that pod, which is what lets
   * the page say so instead of rendering an empty table under a blank title.
   */
  async podWithdrawalSummary(podId: string): Promise<PodWithdrawalGroupRow | null> {
    if (!Types.ObjectId.isValid(podId)) return null;
    const pod = new Types.ObjectId(podId);
    const buckets = await WalletWithdrawalModel.aggregate([
      { $match: { 'allocations.pod_id': pod } },
      { $unwind: '$allocations' },
      // The $match above keeps whole withdrawals, which may also carry slices
      // of OTHER pods; this drops those so the totals are this pod's alone.
      { $match: { 'allocations.pod_id': pod } },
      {
        $group: {
          _id: '$allocations.pod_id',
          // $max, not $last: a group's order is undefined, and a credit whose
          // release no longer resolved was stamped with an empty title. $max
          // prefers any real title over ''.
          pod_title: { $max: '$allocations.pod_title' },
          kinds: { $addToSet: '$allocations.kind' },
          statuses: { $addToSet: '$status' },
          attributed_total: { $sum: '$allocations.amount' },
          // The set, not a running count: this pipeline has been $unwound, so
          // one withdrawal that paid this pod through TWO legs (a host who is
          // also its club admin) contributes two rows and would be counted
          // twice. It is withdrawal requests being counted, not slices.
          withdrawal_ids: { $addToSet: '$_id' },
          last_requested_at: { $max: '$requested_at' },
        },
      },
    ]);
    return buckets.length > 0 ? toGroupRow(buckets[0]) : null;
  },

  /**
   * Every withdrawal attributed to ONE pod — the drill-down's rows.
   *
   * The pod rides in as the BASE filter, which `runTableQuery` `$and`-combines
   * with whatever the client sent. A caller therefore cannot widen it into
   * "every withdrawal" by posting a filter of their own.
   */
  async podWithdrawalsTable(
    podId: string,
    input: TableQueryInput | null | undefined,
    config: TableEntityConfig,
    toPublic: (doc: IWalletWithdrawal) => unknown,
  ) {
    if (!Types.ObjectId.isValid(podId)) {
      throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const { docs, total, page, page_size } = await runTableQuery<IWalletWithdrawal>(
      WalletWithdrawalModel,
      { 'allocations.pod_id': new Types.ObjectId(podId) },
      input,
      config,
    );
    return { rows: docs.map(toPublic), total, page, page_size };
  },
};
