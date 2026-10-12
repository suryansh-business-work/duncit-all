import { Types } from 'mongoose';
import { podMemberService, backoutRefundParts, pendingBackoutRefundParts } from '../../podMember.service';
import { BackoutRequestModel, type IBackoutRequest } from '../../backoutRequest.model';
import { PodMemberModel } from '../../podMember.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';

const part = (over: Partial<IBackoutRequest>) => over as IBackoutRequest;
const oid = () => new Types.ObjectId();

describe('backoutRefundParts / pendingBackoutRefundParts', () => {
  it('a request with no payment snapshot is a cash refund', () => {
    expect(backoutRefundParts(part({ payment_amount: null, coins_paid: 0, coins_to_revoke: 0 }))).toEqual(['CASH']);
  });

  it('a zero-money, coin-paid booking has only a COINS part', () => {
    expect(backoutRefundParts(part({ payment_amount: 0, coins_paid: 50, coins_to_revoke: 0 }))).toEqual(['COINS']);
  });

  it('lists every way the booking was paid, in a stable order', () => {
    expect(backoutRefundParts(part({ payment_amount: 100, coins_paid: 10, coins_to_revoke: 5 }))).toEqual([
      'CASH',
      'COINS',
      'EARN_REVOKE',
    ]);
  });

  it('a free booking with nothing to refund still has one part to close it with', () => {
    expect(backoutRefundParts(part({ payment_amount: 0, coins_paid: 0, coins_to_revoke: 0 }))).toEqual(['CASH']);
    expect(backoutRefundParts(part({ payment_amount: 0 }))).toEqual(['CASH']);
  });

  it('pending parts drop the stamped ones and are empty once refunded', () => {
    const base = { payment_amount: 100, coins_paid: 10, coins_to_revoke: 5 };
    expect(pendingBackoutRefundParts(part({ ...base, cash_refund_processed_at: new Date() }))).toEqual(['COINS', 'EARN_REVOKE']);
    expect(pendingBackoutRefundParts(part({ ...base, refund_processed_at: new Date() }))).toEqual([]);
  });
});

describe('Finance backout refund rows for legacy and partial requests', () => {
  it('derives every field of a request written before snapshots and the refund split', async () => {
    const processed = new Date('2026-03-01T10:00:00Z');
    const created = new Date('2026-02-01T10:00:00Z');
    await BackoutRequestModel.collection.insertOne({
      backout_no: 'DUN-BKO-LEGACY',
      pod_id: oid(),
      user_id: oid(),
      member_id: oid(),
      attempt_no: 1,
      status: 'SPOT_FILLED',
      refund_processed_at: processed,
      created_at: created,
    } as never);
    const rows = await podMemberService.listBackoutRefunds();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toMatchObject({
      backout_no: 'DUN-BKO-LEGACY',
      seats: 1,
      seats_before: 1,
      is_partial: false,
      replacement_confirmed: true,
      replacement_user_id: null,
      replacement_user_name: null,
      replacement_user_email: null,
      payment_id: null,
      payment_amount: null,
      payment_currency: null,
      payment_status: null,
      payment_gateway: null,
      deduction_pct: 0,
      refund_amount: null,
      coins_paid: 0,
      coins_refunded: 0,
      coins_to_revoke: 0,
      user_name: null,
      user_email: null,
      events: [],
      refund_parts: ['CASH'],
      pending_refund_parts: [],
      backed_out_at: created.toISOString(),
      joined_at: created.toISOString(),
    });
    // a refund before the split settled every part at once, so one stamp stands in for each
    expect(row.cash_refund_processed_at).toBe(processed.toISOString());
    expect(row.coins_refund_processed_at).toBe(processed.toISOString());
    expect(row.earn_revoke_processed_at).toBe(processed.toISOString());
    expect(row.refund_processed_at).toBe(processed.toISOString());
  });

  it('shows a partial request with its replacement, payment and per-part stamps', async () => {
    const buyer = await UserModel.create({
      auth: { email: 'buyer@x.com' },
      profile: { first_name: 'Asha', last_name: 'Rao' },
    });
    const replacement = await UserModel.create({
      auth: { email: 'repl@x.com' },
      profile: { first_name: 'Ravi', last_name: 'K' },
    });
    const podId = oid();
    const payment = await PaymentModel.create({
      payment_id: 'pay-partial',
      user_id: buyer._id,
      user_name: 'Asha Rao',
      user_email: 'buyer@x.com',
      total: 400,
      subtotal: 400,
      currency_symbol: '₹',
      status: 'SUCCESS',
      gateway: 'RAZORPAY',
    } as never);
    const member = await PodMemberModel.create({ pod_id: podId, user_id: buyer._id, status: 'JOINED', seats: 2 });
    const cashAt = new Date('2026-03-05T00:00:00Z');
    await BackoutRequestModel.create({
      backout_no: 'DUN-BKO-PART',
      pod_id: podId,
      user_id: buyer._id,
      member_id: member._id,
      payment_id: payment._id,
      attempt_no: 1,
      seats: 1,
      seats_before: 2,
      status: 'SPOT_FILLED',
      replacement_user_id: replacement._id,
      payment_amount: 200,
      deduction_pct: 10,
      refund_amount: 180,
      coins_paid: 20,
      coins_refunded: 18,
      coins_to_revoke: 4,
      cash_refund_processed_at: cashAt,
      events: [{ status: 'SPOT_FILLED', backout_count: 1, at: cashAt }],
    });
    const [row] = await podMemberService.listBackoutRefunds();
    expect(row).toMatchObject({
      user_name: 'Asha Rao',
      user_email: 'buyer@x.com',
      status: 'JOINED',
      seats: 1,
      seats_before: 2,
      is_partial: true,
      replacement_user_name: 'Ravi K',
      replacement_user_email: 'repl@x.com',
      payment_amount: 200,
      payment_currency: '₹',
      payment_status: 'SUCCESS',
      payment_gateway: 'RAZORPAY',
      refund_amount: 180,
      refund_parts: ['CASH', 'COINS', 'EARN_REVOKE'],
      pending_refund_parts: ['COINS', 'EARN_REVOKE'],
      refund_processed_at: null,
    });
    expect(row.cash_refund_processed_at).toBe(cashAt.toISOString());
    expect(row.coins_refund_processed_at).toBeNull();
    expect(row.events).toEqual([{ status: 'SPOT_FILLED', backout_count: 1, at: cashAt.toISOString() }]);
  });
});
