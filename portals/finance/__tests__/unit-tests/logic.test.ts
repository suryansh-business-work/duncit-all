import { describe, expect, it } from 'vitest';
import { fmt, paymentTableFilter, STATUS_COLORS } from '../../src/pages/finance/payment-logs-page/helpers';
import {
  buildRefundBreakup,
  fmtDate,
  money as backoutMoney,
  REFUND_STATUS_COLORS,
  type BackoutRefundRequest,
} from '../../src/pages/finance/backout-refund-page/queries';
import {
  labelize,
  tableStateToExpenseFilter,
} from '../../src/pages/finance/expense-management-page/queries';
import {
  applyPodFinanceQuery,
  groupReleasesByPod,
  money as podMoney,
  type PodReleaseRow,
} from '../../src/pages/finance/pod-finance-page/queries';
import { toReviewInput } from '../../src/pages/finance/payment-release-page/payment-release-review/payment-release-review.form';

describe('payment-logs helpers', () => {
  it('formats money with default and custom symbol', () => {
    expect(fmt(1000)).toBe('₹1000.00');
    expect(fmt(1000, '$')).toBe('$1000.00');
  });

  it('exposes a status color map', () => {
    expect(STATUS_COLORS.SUCCESS).toBe('success');
    expect(STATUS_COLORS.FAILED).toBe('error');
  });

  it('builds a payment filter from search + status', () => {
    expect(paymentTableFilter({ search: '  ', filters: [] })).toBeUndefined();
    expect(paymentTableFilter({ search: 'abc', filters: [] })).toEqual({ search: 'abc' });
    expect(
      paymentTableFilter({ search: '', filters: [{ field: 'status', op: 'eq', value: 'SUCCESS' }] }),
    ).toEqual({ status: 'SUCCESS' });
    // filter present but not eq → ignored
    expect(
      paymentTableFilter({ search: '', filters: [{ field: 'status', op: 'ne', value: 'X' }] }),
    ).toBeUndefined();
    expect(
      paymentTableFilter({
        search: 'q',
        filters: [{ field: 'status', op: 'eq', value: 'FAILED' }],
      }),
    ).toEqual({ search: 'q', status: 'FAILED' });
  });
});

describe('backout-refund queries logic', () => {
  it('formats money and dates', () => {
    expect(backoutMoney('₹', 250)).toBe('₹250.00');
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('not-a-date')).toBe('—');
    expect(fmtDate('2024-01-02T03:04:05.000Z')).not.toBe('—');
  });

  it('exposes the refund status color map', () => {
    expect(REFUND_STATUS_COLORS.PROCESSED).toBe('success');
    expect(REFUND_STATUS_COLORS.NOT_ELIGIBLE).toBe('error');
  });

  it('builds a refund breakup applying the deduction pct', () => {
    const row = { payment_amount: 1000, refund_status: 'PENDING' } as BackoutRefundRequest;
    const lines = buildRefundBreakup(row, '₹', 10);
    expect(lines.find((l) => l.key === 'deduction')?.value).toBe('- ₹100.00');
    expect(lines.find((l) => l.key === 'estimate')?.value).toBe('₹900.00');
  });

  it('clamps deduction pct and defaults a null amount', () => {
    const row = { payment_amount: null, refund_status: 'NONE' } as unknown as BackoutRefundRequest;
    const lines = buildRefundBreakup(row, '₹', 200); // clamped to 100
    expect(lines[0].value).toBe('₹0.00');
    expect(lines.find((l) => l.key === 'deduction')?.label).toContain('100%');
    // negative pct clamps to 0
    const row2 = { payment_amount: 500, refund_status: 'NONE' } as BackoutRefundRequest;
    const lines2 = buildRefundBreakup(row2, '₹', -5);
    expect(lines2.find((l) => l.key === 'deduction')?.label).toContain('0%');
    // non-numeric pct → 0
    const lines3 = buildRefundBreakup(row2, '₹', Number.NaN);
    expect(lines3.find((l) => l.key === 'deduction')?.value).toBe('- ₹0.00');
  });
});

describe('expense queries logic', () => {
  it('labelizes snake case including empty segments', () => {
    expect(labelize('BANK_TRANSFER')).toBe('Bank Transfer');
    expect(labelize('a__b')).toBe('A  B');
  });

  it('maps table state to an expense filter across every field/op', () => {
    expect(tableStateToExpenseFilter({ search: '', filters: [] } as any)).toBeUndefined();
    const filter = tableStateToExpenseFilter({
      search: '  coffee  ',
      filters: [
        { field: 'category', op: 'eq', value: 'RENT' },
        { field: 'payment_method', op: 'eq', value: 'UPI' },
        { field: 'date', op: 'between', values: ['2020-01-01', '2020-12-31'] },
        { field: 'amount', op: 'gte', value: '100' },
      ],
    } as any);
    expect(filter).toEqual({
      search: 'coffee',
      category: 'RENT',
      payment_method: 'UPI',
      from: '2020-01-01',
      to: '2020-12-31',
      min_amount: 100,
    });
  });

  it('handles lte and single-sided amount/date bounds', () => {
    const filter = tableStateToExpenseFilter({
      search: '',
      filters: [
        { field: 'date', op: 'lte', value: '2021-06-01' },
        { field: 'amount', op: 'lte', value: '900' },
      ],
    } as any);
    expect(filter).toEqual({ to: '2021-06-01', max_amount: 900 });
  });

  it('ignores an unhandled op (default range bounds)', () => {
    const filter = tableStateToExpenseFilter({
      search: '',
      filters: [{ field: 'amount', op: 'eq', value: '5' }],
    } as any);
    expect(filter).toBeUndefined();
  });

  it('handles date gte (open-ended to) and an empty category value', () => {
    const filter = tableStateToExpenseFilter({
      search: '',
      filters: [
        { field: 'date', op: 'gte', value: '2020-01-01' },
        { field: 'category', op: 'eq', value: '' },
        { field: 'amount', op: 'gte', value: '' },
      ],
    } as any);
    expect(filter).toEqual({ from: '2020-01-01' });
  });
});

describe('pod-finance queries logic', () => {
  const rows: PodReleaseRow[] = [
    { id: '1', pod_id: 'p1', pod_title: 'Alpha', kind: 'HOST_PAYMENT', status: 'PENDING', amount_requested: 100, requested_at: '2024-01-01' },
    { id: '2', pod_id: 'p1', pod_title: 'Alpha', kind: 'VENUE_BILLING', status: 'APPROVED', amount_requested: 50, requested_at: '2024-02-01' },
    { id: '3', pod_id: 'p2', pod_title: 'Beta', kind: 'HOST_PAYMENT', status: 'PENDING', amount_requested: 0, requested_at: '2024-01-15' },
  ];

  it('formats money', () => {
    expect(podMoney('₹', 12)).toBe('₹12.00');
  });

  it('groups releases by pod and tracks latest activity', () => {
    const groups = groupReleasesByPod(rows);
    expect(groups).toHaveLength(2);
    const alpha = groups.find((g) => g.pod_id === 'p1')!;
    expect(alpha.releases_count).toBe(2);
    expect(alpha.requested_total).toBe(150);
    expect(alpha.last_requested_at).toBe('2024-02-01');
    expect(alpha.status_counts).toEqual({ PENDING: 1, APPROVED: 1 });
  });

  it('searches, sorts and pages the grouped rows', () => {
    const groups = groupReleasesByPod(rows);
    const searched = applyPodFinanceQuery(groups, { search: 'beta', filters: [], page: 1, pageSize: 25, sortBy: undefined, sortDir: 'asc' } as any);
    expect(searched.total).toBe(1);
    expect(searched.rows[0].pod_title).toBe('Beta');

    const sortedAsc = applyPodFinanceQuery(groups, { search: '', filters: [], page: 1, pageSize: 25, sortBy: 'pod_title', sortDir: 'asc' } as any);
    expect(sortedAsc.rows.map((g) => g.pod_title)).toEqual(['Alpha', 'Beta']);

    const sortedDesc = applyPodFinanceQuery(groups, { search: '', filters: [], page: 1, pageSize: 25, sortBy: 'requested_total', sortDir: 'desc' } as any);
    expect(sortedDesc.rows[0].pod_title).toBe('Alpha');

    const paged = applyPodFinanceQuery(groups, { search: '', filters: [], page: 2, pageSize: 1, sortBy: 'releases_count', sortDir: 'asc' } as any);
    expect(paged.rows).toHaveLength(1);
    expect(paged.total).toBe(2);

    // last_requested_at comparator branch
    const byActivity = applyPodFinanceQuery(groups, { search: '', filters: [], page: 1, pageSize: 25, sortBy: 'last_requested_at', sortDir: 'asc' } as any);
    expect(byActivity.rows).toHaveLength(2);
  });
});

describe('payment-release toReviewInput', () => {
  it('maps a full approval to the requested amount', () => {
    expect(toReviewInput({ status: 'APPROVED', approval_type: 'FULL', approved_amount: 1, approval_reason: '' }, 900)).toEqual({
      status: 'APPROVED',
      approval_type: 'FULL',
      approved_amount: 900,
      approval_reason: undefined,
    });
  });

  it('maps a partial approval to the entered amount and keeps the reason', () => {
    expect(toReviewInput({ status: 'APPROVED', approval_type: 'PARTIAL', approved_amount: 250, approval_reason: 'partial' }, 900)).toEqual({
      status: 'APPROVED',
      approval_type: 'PARTIAL',
      approved_amount: 250,
      approval_reason: 'partial',
    });
  });

  it('drops the approval_type on rejection', () => {
    expect(toReviewInput({ status: 'REJECTED', approval_type: 'FULL', approved_amount: 5, approval_reason: 'no' }, 900)).toEqual({
      status: 'REJECTED',
      approval_type: undefined,
      approved_amount: 5,
      approval_reason: 'no',
    });
  });
});
