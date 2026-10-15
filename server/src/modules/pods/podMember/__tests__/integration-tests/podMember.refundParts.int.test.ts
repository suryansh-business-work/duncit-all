/**
 * Finance refunds a Spot Filled backout one PART at a time: the gateway cash,
 * the Duncit Coins the booking was paid with, and the purchase-reward coins the
 * refunded share takes back. Each part is claimed before its money moves and
 * released again if the movement fails, and the request only closes — payment
 * flipped, member settled, member told — when its last part lands.
 *
 * The coin ledger is the seam here: its own suite covers the ledger writes, so
 * these assert what the refund flow asks of it and what it records back.
 */
import { Types } from 'mongoose';
import { podMemberService } from '../../podMember.service';
import { PodMemberModel } from '../../podMember.model';
import { BackoutRequestModel } from '../../backoutRequest.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { UserModel } from '@modules/access/user/user.model';
import { coinService } from '@modules/finance/coin/coin.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { logs } from '@observability/log';
import * as emailService from '@services/email/email.service';

let refundCoins: jest.SpyInstance;
let revokeEarn: jest.SpyInstance;
let refundEmail: jest.SpyInstance;

beforeEach(() => {
  refundCoins = jest.spyOn(coinService, 'refundForBackout').mockResolvedValue(45);
  revokeEarn = jest.spyOn(coinService, 'revokeEarnForBackout').mockResolvedValue(10);
  refundEmail = jest.spyOn(emailService, 'sendPodRefundEmail').mockResolvedValue(undefined as never);
  jest.spyOn(notificationService, 'create').mockResolvedValue({} as never);
});

afterEach(() => {
  jest.restoreAllMocks();
});

let seq = 0;

/** A booking paid ₹300 + 50 coins, backed out and filled: 10% kept back. */
async function filledRequest(over: Record<string, unknown> = {}) {
  seq += 1;
  const buyer = await UserModel.create({
    auth: { email: `parts${seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
  } as never);
  const pod = await PodModel.create({
    pod_id: `parts-${seq}-${new Types.ObjectId().toString()}`,
    pod_title: 'Coins pod',
    club_id: new Types.ObjectId(),
    pod_description: 'desc',
    pod_type: 'PAID',
    pod_date_time: new Date(Date.now() + 86_400_000),
    no_of_spots: 4,
    is_active: true,
  });
  const payment = await PaymentModel.create({
    payment_id: `pay-parts-${seq}`,
    user_id: buyer._id,
    user_name: 'Asha Rao',
    user_email: `parts${seq}@x.com`,
    subtotal: 300,
    total: 300,
    currency_symbol: '₹',
    status: 'SUCCESS',
  } as never);
  const member = await PodMemberModel.create({
    pod_id: pod._id,
    user_id: buyer._id,
    status: 'BACKED_OUT',
    backed_out_at: new Date(),
    source: 'PAID',
    refund_status: 'PENDING',
    payment_id: payment._id,
  });
  const request = await BackoutRequestModel.create({
    backout_no: `DUN-BKO-PARTS-${seq}`,
    pod_id: pod._id,
    user_id: buyer._id,
    member_id: member._id,
    payment_id: payment._id,
    attempt_no: 1,
    status: 'SPOT_FILLED',
    payment_amount: 300,
    deduction_pct: 10,
    refund_amount: 270,
    coins_paid: 50,
    coins_refunded: 45,
    coins_to_revoke: 10,
    ...over,
  });
  return { buyer, payment, member, request, id: String(request._id) };
}

const stored = async (id: string) => (await BackoutRequestModel.findById(id))!;

describe('processBackoutRefund — one part at a time', () => {
  it('refuses the earned-coin revocation while the coin refund it is taken from is still owed', async () => {
    const { id } = await filledRequest();

    await expect(podMemberService.processBackoutRefund(id, 'EARN_REVOKE')).rejects.toMatchObject({
      message: 'Refund the Duncit Coins first — the revoked coins are taken from them',
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(revokeEarn).not.toHaveBeenCalled();
    expect((await stored(id)).earn_revoke_processed_at).toBeNull();
  });

  it('refuses a part the booking was never paid with', async () => {
    const { id } = await filledRequest({ coins_paid: 0, coins_refunded: 0, coins_to_revoke: 0 });

    await expect(podMemberService.processBackoutRefund(id, 'COINS')).rejects.toMatchObject({
      message: 'This booking was not paid that way — there is nothing to refund there',
      extensions: { code: 'BAD_REQUEST' },
    });
    expect(refundCoins).not.toHaveBeenCalled();
  });

  it('refunds the coins on their own and leaves the request open for the other parts', async () => {
    const { buyer, payment, id, request } = await filledRequest();

    const row = await podMemberService.processBackoutRefund(id, 'COINS');

    expect(refundCoins).toHaveBeenCalledWith({
      userId: String(buyer._id),
      backoutId: id,
      paymentId: payment.payment_id,
      coins: 45,
      reason: `Backout ${request.backout_no}`,
    });
    expect(row.pending_refund_parts).toEqual(['CASH', 'EARN_REVOKE']);
    expect(row.refund_status).toBe('PENDING');
    const after = await stored(id);
    expect(after.coins_refund_processed_at).toBeInstanceOf(Date);
    expect(after.refund_processed_at).toBeNull();
    expect((await PaymentModel.findById(payment._id))!.status).toBe('SUCCESS');
    expect(refundEmail).not.toHaveBeenCalled();

    // A second click on the same part is refused rather than paid twice.
    await expect(podMemberService.processBackoutRefund(id, 'COINS')).rejects.toMatchObject({
      message: 'This part of the refund has already been processed',
      extensions: { code: 'CONFLICT' },
    });
    expect(refundCoins).toHaveBeenCalledTimes(1);
  });

  it('records a revocation the balance could only partly cover, and closes the request on the last part', async () => {
    const { buyer, payment, member, id, request } = await filledRequest();
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    revokeEarn.mockResolvedValueOnce(4);

    await podMemberService.processBackoutRefund(id, 'COINS');
    const revoked = await podMemberService.processBackoutRefund(id, 'EARN_REVOKE');

    expect(revokeEarn).toHaveBeenCalledWith({
      userId: String(buyer._id),
      backoutId: id,
      paymentId: payment.payment_id,
      coins: 10,
      reason: `Backout ${request.backout_no}`,
    });
    expect((await stored(id)).coins_revoked).toBe(4);
    expect(revoked.coins_revoked).toBe(4);
    expect(revoked.pending_refund_parts).toEqual(['CASH']);
    expect(warn).toHaveBeenCalledWith(
      'podMember',
      'revokeEarnForBackout',
      expect.objectContaining({ backout_no: request.backout_no, to_revoke: 10, revoked: 4 })
    );

    const closed = await podMemberService.processBackoutRefund(id, 'CASH');

    expect(closed.refund_status).toBe('PROCESSED');
    expect(closed.pending_refund_parts).toEqual([]);
    const settledPayment = (await PaymentModel.findById(payment._id))!;
    expect(settledPayment.status).toBe('REFUNDED');
    expect((settledPayment.metadata as Record<string, unknown>).refunded_amount).toBe(270);
    expect((await PodMemberModel.findById(member._id))!.refund_status).toBe('PROCESSED');
    expect(refundEmail).toHaveBeenCalledTimes(1);
    expect(refundEmail).toHaveBeenCalledWith(expect.objectContaining({ amount: '₹270' }));
  });

  it('does not warn when the whole earned share is revoked', async () => {
    const { id } = await filledRequest();
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);

    await podMemberService.processBackoutRefund(id, 'COINS');
    await podMemberService.processBackoutRefund(id, 'EARN_REVOKE');

    expect((await stored(id)).coins_revoked).toBe(10);
    expect(warn).not.toHaveBeenCalledWith('podMember', 'revokeEarnForBackout', expect.anything());
  });

  it('releases the claim when the coin movement fails, so Finance can retry the part', async () => {
    const { id } = await filledRequest();
    refundCoins.mockRejectedValueOnce(new Error('ledger down'));

    await expect(podMemberService.processBackoutRefund(id, 'COINS')).rejects.toThrow('ledger down');
    expect((await stored(id)).coins_refund_processed_at).toBeNull();

    const retried = await podMemberService.processBackoutRefund(id, 'COINS');
    expect(refundCoins).toHaveBeenCalledTimes(2);
    expect(retried.pending_refund_parts).toEqual(['CASH', 'EARN_REVOKE']);
    expect((await stored(id)).coins_refund_processed_at).toBeInstanceOf(Date);
  });

  it('runs every outstanding part in order when no part is named', async () => {
    const { id } = await filledRequest();
    const order: string[] = [];
    refundCoins.mockImplementationOnce(async () => {
      order.push('COINS');
      return 45;
    });
    revokeEarn.mockImplementationOnce(async () => {
      order.push('EARN_REVOKE');
      return 10;
    });

    const row = await podMemberService.processBackoutRefund(id);

    expect(order).toEqual(['COINS', 'EARN_REVOKE']);
    expect(row.refund_status).toBe('PROCESSED');
    const after = await stored(id);
    expect(after.cash_refund_processed_at).toBeInstanceOf(Date);
    expect(after.coins_refund_processed_at).toBeInstanceOf(Date);
    expect(after.earn_revoke_processed_at).toBeInstanceOf(Date);
    expect(after.refund_processed_at).toBeInstanceOf(Date);
  });
});
