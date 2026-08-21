/**
 * Finance's Withdrawal Payments view, grouped by pod, with the model faked.
 *
 * Three rules carry real money and are worth holding away from a database.
 * A pod is APPROVED only once EVERY request against it has been paid — one
 * still-pending request holds the whole pod at Pending. The role filter is
 * applied to the allocations BEFORE grouping, so a pod's totals can never
 * include a partner the reader filtered out. And an unknown role returns
 * nothing rather than everything, because "the filter did nothing" and "nothing
 * matched" must not look the same.
 */
jest.mock('../../wallet.model', () => ({
  WalletWithdrawalModel: { aggregate: jest.fn() },
  WITHDRAWER_ROLE_BY_KIND: {
    HOST_PAYMENT: 'HOST',
    VENUE_BILLING: 'VENUE_OWNER',
    CLUB_ADMIN: 'CLUB_ADMIN',
    ECOMM_PAYMENT: 'ECOMM_MANAGER',
  },
}));

jest.mock('@utils/table-query', () => {
  const actual = jest.requireActual('@utils/table-query');
  return { ...actual, runTableQuery: jest.fn() };
});

import { WalletWithdrawalModel } from '../../wallet.model';
import { runTableQuery } from '@utils/table-query';
import { withdrawalPodsService } from '../../withdrawalPods.service';

const model = WalletWithdrawalModel as unknown as Record<string, jest.Mock>;
const tableQuery = runTableQuery as unknown as jest.Mock;

const POD_ID = '65b000000000000000000001';

const bucket = (over: Record<string, unknown> = {}) => ({
  _id: POD_ID,
  pod_title: 'Sunday Badminton',
  kinds: ['HOST_PAYMENT'],
  statuses: ['PAID'],
  attributed_total: 1234.567,
  withdrawal_ids: ['w-1', 'w-2'],
  last_requested_at: new Date('2026-08-20T10:00:00.000Z'),
  ...over,
});

/** The `$match` stages the pipeline was built with, in order. */
const matchStages = () =>
  (model.aggregate.mock.calls[0]?.[0] as { $match?: unknown }[]).filter((stage) => '$match' in stage);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('podWithdrawalGroupsTable', () => {
  it('shapes one row per pod, rounded to paise', async () => {
    model.aggregate.mockResolvedValue([bucket()]);

    const { rows, total } = await withdrawalPodsService.podWithdrawalGroupsTable();

    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({
      pod_id: POD_ID,
      pod_title: 'Sunday Badminton',
      status: 'APPROVED',
      attributed_total: 1234.57,
      withdrawal_count: 2,
      requested_from: ['HOST'],
    });
    expect(rows[0]?.last_requested_at).toBe('2026-08-20T10:00:00.000Z');
  });

  it('holds a pod at Pending while ANY request against it is unpaid', async () => {
    model.aggregate.mockResolvedValue([bucket({ statuses: ['PAID', 'PENDING'] })]);

    expect((await withdrawalPodsService.podWithdrawalGroupsTable()).rows[0]?.status).toBe('PENDING');
  });

  it('lists the partners in a stable order, so the chips never reshuffle', async () => {
    model.aggregate.mockResolvedValue([
      bucket({ kinds: ['CLUB_ADMIN', 'ECOMM_PAYMENT', 'HOST_PAYMENT', 'VENUE_BILLING'] }),
    ]);

    expect((await withdrawalPodsService.podWithdrawalGroupsTable()).rows[0]?.requested_from).toEqual([
      'HOST',
      'VENUE_OWNER',
      'ECOMM_MANAGER',
      'CLUB_ADMIN',
    ]);
  });

  it('ignores a kind the role map does not know', async () => {
    model.aggregate.mockResolvedValue([bucket({ kinds: ['HOST_PAYMENT', 'SOMETHING_NEW'] })]);

    expect((await withdrawalPodsService.podWithdrawalGroupsTable()).rows[0]?.requested_from).toEqual(['HOST']);
  });

  it('narrows to a role BEFORE grouping, so a pod’s totals cannot include another partner', async () => {
    model.aggregate.mockResolvedValue([bucket()]);

    await withdrawalPodsService.podWithdrawalGroupsTable({
      filters: [{ field: 'requested_from', value: 'HOST' }],
    } as never);

    const kindMatch = matchStages().find((stage) =>
      JSON.stringify(stage).includes('allocations.kind')
    );
    expect(kindMatch).toEqual({ $match: { 'allocations.kind': { $in: ['HOST_PAYMENT'] } } });
  });

  it('adds no kind stage when no role was asked for', async () => {
    model.aggregate.mockResolvedValue([bucket()]);

    await withdrawalPodsService.podWithdrawalGroupsTable();

    expect(matchStages().some((stage) => JSON.stringify(stage).includes('allocations.kind'))).toBe(false);
  });

  it('returns nothing for a role that matches no kind — not everything', async () => {
    const result = await withdrawalPodsService.podWithdrawalGroupsTable({
      filters: [{ field: 'requested_from', value: 'MAYOR' }],
    } as never);

    expect(result).toEqual({ rows: [], total: 0, page: 1, page_size: 25 });
    expect(model.aggregate).not.toHaveBeenCalled();
  });

  it('treats a blank role filter as no filter at all', async () => {
    model.aggregate.mockResolvedValue([bucket()]);

    await withdrawalPodsService.podWithdrawalGroupsTable({
      filters: [{ field: 'requested_from', value: '   ' }],
    } as never);

    expect(model.aggregate).toHaveBeenCalled();
  });

  it('reads a bucket whose title and date never resolved without rendering "undefined"', async () => {
    model.aggregate.mockResolvedValue([
      bucket({ pod_title: null, last_requested_at: null, kinds: null, statuses: [], withdrawal_ids: null, attributed_total: null }),
    ]);

    expect((await withdrawalPodsService.podWithdrawalGroupsTable()).rows[0]).toMatchObject({
      pod_title: '',
      last_requested_at: '',
      requested_from: [],
      withdrawal_count: 0,
      attributed_total: 0,
      // An empty status set is vacuously "all paid" — there is nothing pending.
      status: 'APPROVED',
    });
  });

  it('answers an empty page when nobody has withdrawn against anything', async () => {
    model.aggregate.mockResolvedValue([]);

    expect((await withdrawalPodsService.podWithdrawalGroupsTable()).rows).toEqual([]);
  });
});

describe('podWithdrawalSummary', () => {
  it('is null for an id that is not a pod id', async () => {
    await expect(withdrawalPodsService.podWithdrawalSummary('nonsense')).resolves.toBeNull();
    expect(model.aggregate).not.toHaveBeenCalled();
  });

  it('is null when nothing has been withdrawn against that pod', async () => {
    model.aggregate.mockResolvedValue([]);

    await expect(withdrawalPodsService.podWithdrawalSummary(POD_ID)).resolves.toBeNull();
  });

  it('drops the slices belonging to OTHER pods, so the totals are this pod’s alone', async () => {
    model.aggregate.mockResolvedValue([bucket()]);

    const summary = await withdrawalPodsService.podWithdrawalSummary(POD_ID);

    expect(summary).toMatchObject({ pod_id: POD_ID, attributed_total: 1234.57 });
    // The pod is matched once to keep whole withdrawals and again after the
    // unwind — without the second, another pod's money lands in this total.
    const podMatches = matchStages().filter((stage) => JSON.stringify(stage).includes('allocations.pod_id'));
    expect(podMatches).toHaveLength(2);
  });
});

describe('podWithdrawalsTable', () => {
  const config = { searchFields: [], sortFields: {}, filterFields: {} } as never;
  const toPublic = (doc: unknown) => ({ id: (doc as { _id: string })._id });

  it('refuses an id that is not a pod id', async () => {
    await expect(
      withdrawalPodsService.podWithdrawalsTable('nonsense', null, config, toPublic)
    ).rejects.toThrow('Invalid pod id');
  });

  it('rides the pod in as the BASE filter, which a caller cannot widen', async () => {
    tableQuery.mockResolvedValue({ docs: [{ _id: 'w-1' }], total: 1, page: 1, page_size: 25 });

    const result = await withdrawalPodsService.podWithdrawalsTable(
      POD_ID,
      { filters: [{ field: 'status', value: 'PAID' }] } as never,
      config,
      toPublic
    );

    const [, base] = tableQuery.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(String((base as Record<string, unknown>)['allocations.pod_id'])).toBe(POD_ID);
    expect(result).toEqual({ rows: [{ id: 'w-1' }], total: 1, page: 1, page_size: 25 });
  });
});
