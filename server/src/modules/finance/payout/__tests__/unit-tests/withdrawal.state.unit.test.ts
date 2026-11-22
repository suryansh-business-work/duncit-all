import {
  approvalOf,
  displayStatusOf,
  payoutStatusOf,
  requestedAmountOf,
  withdrawalStatePub,
} from '../../withdrawal.state';

const base = { status: 'PENDING' as const, amount: 1000 };

describe('approvalOf', () => {
  it('reads a brand-new request as PENDING', () => {
    expect(approvalOf(base)).toBe('PENDING');
  });

  it('reads a legacy PAID row (no approval field) as APPROVED, never PENDING', () => {
    expect(approvalOf({ ...base, status: 'PAID' })).toBe('APPROVED');
  });

  it('lets REJECTED win over any stored approval', () => {
    expect(approvalOf({ ...base, status: 'REJECTED', approval_status: 'APPROVED' })).toBe('REJECTED');
  });

  it('returns the stored decision while the legacy status is still PENDING', () => {
    expect(approvalOf({ ...base, approval_status: 'PARTIALLY_APPROVED' })).toBe('PARTIALLY_APPROVED');
  });
});

describe('payoutStatusOf', () => {
  it('is null until a payout starts', () => {
    expect(payoutStatusOf(base)).toBeNull();
  });

  it('reports the payout record when there is one', () => {
    expect(payoutStatusOf({ ...base, payout: { status: 'FAILED' } })).toBe('FAILED');
  });

  it('treats a legacy hand-paid row as PAID although it has no payout record', () => {
    expect(payoutStatusOf({ ...base, status: 'PAID' })).toBe('PAID');
  });
});

describe('displayStatusOf', () => {
  it.each([
    ['PENDING', null, 'PENDING'],
    ['APPROVED', null, 'APPROVED'],
    ['PARTIALLY_APPROVED', null, 'PARTIALLY_APPROVED'],
    ['APPROVED', 'PROCESSING', 'PROCESSING'],
    ['PARTIALLY_APPROVED', 'PAID', 'PAID'],
    ['APPROVED', 'FAILED', 'FAILED'],
    ['REJECTED', null, 'REJECTED'],
  ] as const)('approval %s + payout %s reads %s', (approval, payout, expected) => {
    expect(displayStatusOf(approval, payout)).toBe(expected);
  });

  it('keeps a rejection a rejection even if a stale payout state is present', () => {
    expect(displayStatusOf('REJECTED', 'FAILED')).toBe('REJECTED');
  });
});

describe('requestedAmountOf', () => {
  it('falls back to amount before any partial approval lowers it', () => {
    expect(requestedAmountOf(base)).toBe(1000);
  });

  it('returns the original request after a partial approval lowered amount', () => {
    expect(requestedAmountOf({ ...base, amount: 600, requested_amount: 1000 })).toBe(1000);
  });
});

describe('withdrawalStatePub', () => {
  it('describes a processing partial approval completely', () => {
    const pub = withdrawalStatePub({
      status: 'PENDING',
      amount: 600,
      requested_amount: 1000,
      approval_status: 'PARTIALLY_APPROVED',
      approved_amount: 600,
      decision_reason: 'Part is on hold',
      reviewed_by_name: 'Finance One',
      payout: { status: 'PROCESSING', razorpay_payout_id: 'pout_1', attempt: 2 },
    });
    expect(pub).toMatchObject({
      requested_amount: 1000,
      approval_status: 'PARTIALLY_APPROVED',
      approved_amount: 600,
      decision_reason: 'Part is on hold',
      reviewed_by_name: 'Finance One',
      payout_status: 'PROCESSING',
      display_status: 'PROCESSING',
      razorpay_payout_id: 'pout_1',
      payout_attempt: 2,
    });
  });

  it('reports no approved amount for a pending or rejected row', () => {
    expect(withdrawalStatePub(base).approved_amount).toBeNull();
    expect(withdrawalStatePub({ ...base, status: 'REJECTED', approval_status: 'REJECTED' }).approved_amount).toBeNull();
  });

  it('serialises payout timestamps and defaults the text fields of a legacy row', () => {
    const at = new Date('2026-11-20T10:00:00.000Z');
    const pub = withdrawalStatePub({
      ...base,
      status: 'PAID',
      payout: { status: 'PAID', initiated_at: at, completed_at: at, utr: 'UTR1' },
    });
    expect(pub.payout_initiated_at).toBe(at.toISOString());
    expect(pub.payout_completed_at).toBe(at.toISOString());
    expect(pub.payout_utr).toBe('UTR1');
    const legacy = withdrawalStatePub({ ...base, status: 'PAID' });
    expect(legacy).toMatchObject({ decision_reason: '', razorpay_payout_id: '', payout_attempt: 0, display_status: 'PAID' });
  });
});
