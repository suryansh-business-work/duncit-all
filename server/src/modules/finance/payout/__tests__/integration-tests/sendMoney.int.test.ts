const gateway = {
  createContact: jest.fn(),
  createFundAccount: jest.fn(),
  createPayout: jest.fn(),
  isPayoutConfigured: jest.fn(),
};
const notify = jest.fn();

jest.mock('../../razorpayX.gateway', () => ({
  ...jest.requireActual('../../razorpayX.gateway'),
  createContact: (...a: unknown[]) => gateway.createContact(...a),
  createFundAccount: (...a: unknown[]) => gateway.createFundAccount(...a),
  createPayout: (...a: unknown[]) => gateway.createPayout(...a),
  isPayoutConfigured: () => gateway.isPayoutConfigured(),
}));
jest.mock('../../payout.notify', () => ({ notifyMoneyOut: (...a: unknown[]) => notify(...a) }));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { PayoutEventModel, SendMoneyTransferModel } from '../../payout.model';
import { retryTransfer, sendMoney, type SendMoneyInput } from '../../sendMoney.service';
import { settlePayout } from '../../payout.settle';
import { payoutAuditTable, sendMoneyRecipient, sendMoneyRecipients, sendMoneyTransfersTable } from '../../payout.queries';

const actor = { id: String(new Types.ObjectId()), name: 'Finance One', role: 'FINANCE_MANAGER' };
const refusal = new GraphQLError('Insufficient RazorpayX balance', { extensions: { razorpay_status: 400 } });
const queued = (id = 'pout_1') => ({ id, status: 'queued', utr: '', failure_reason: '', reference_id: 'x' });

let seq = 0;
async function seedRecipient(bank: Record<string, string> = { payout_method: 'IMPS', account_number: '123456789012', ifsc_code: 'HDFC0001234' }) {
  const user = await UserModel.create({
    auth: { email: `recipient${++seq}@example.com` },
    profile: { first_name: 'Meera', last_name: 'Nair' },
  });
  const host = await HostModel.create({
    user_id: user._id,
    full_name: 'Meera Nair',
    status: 'APPROVED',
    bank_account: { account_holder_name: 'Meera Nair', upi_id: '', ...bank },
  });
  return { user, accountId: `HOST:${host._id}` };
}

const input = (user: { _id: unknown }, accountId: string, patch: Partial<SendMoneyInput> = {}): SendMoneyInput => ({
  requestId: `req_${Date.now()}_${++seq}`,
  recipientUserId: String(user._id),
  accountId,
  payoutMethod: 'IMPS',
  amount: 15000,
  category: 'SALARY',
  reason: 'October salary',
  actor,
  ...patch,
});

const auditActions = async (id: string) => (await PayoutEventModel.find({ subject_id: id }).sort({ created_at: 1 })).map((e) => e.action);

// The duplicate-request guarantee is a unique index; make sure it exists before any race is run.
beforeAll(async () => {
  await Promise.all([SendMoneyTransferModel.init(), PayoutEventModel.init()]);
});

beforeEach(() => {
  gateway.isPayoutConfigured.mockResolvedValue(true);
  gateway.createContact.mockResolvedValue('cont_1');
  gateway.createFundAccount.mockResolvedValue('fa_1');
  gateway.createPayout.mockResolvedValue(queued());
});

describe('sendMoney', () => {
  it('pays a verified account once, recording who initiated it and waiting for the bank to confirm', async () => {
    const { user, accountId } = await seedRecipient();
    const transfer = await sendMoney(input(user, accountId, { notes: 'Includes bonus', supportingReference: 'INV-9' }));

    expect(transfer).toMatchObject({
      recipient_name: 'Meera Nair',
      amount: 15000,
      category: 'SALARY',
      reason: 'October salary',
      notes: 'Includes bonus',
      supporting_reference: 'INV-9',
      account_source: 'HOST',
      initiated_by_name: 'Finance One',
      approved_by_name: 'Finance One',
      payout_method: 'IMPS',
    });
    expect(transfer.payout).toMatchObject({ status: 'PROCESSING', razorpay_payout_id: 'pout_1', attempt: 1 });
    expect(gateway.createPayout).toHaveBeenCalledTimes(1);
    expect(gateway.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 1500000, purpose: 'salary', reference: transfer.transfer_id, idempotencyKey: `${transfer.transfer_id}:1` })
    );
    expect(await auditActions(transfer.transfer_id)).toEqual(['TRANSFER_CREATED', 'PAYOUT_SENT']);
    expect(notify).not.toHaveBeenCalled();
  });

  it('sends only once for a repeated request id — a double click or a retried request', async () => {
    const { user, accountId } = await seedRecipient();
    const request = input(user, accountId);
    const first = await sendMoney(request);
    const second = await sendMoney(request);
    expect(second.transfer_id).toBe(first.transfer_id);
    expect(gateway.createPayout).toHaveBeenCalledTimes(1);
    expect(await SendMoneyTransferModel.countDocuments()).toBe(1);
  });

  it('sends only once when the same request id arrives twice at the same moment', async () => {
    const { user, accountId } = await seedRecipient();
    const request = input(user, accountId);
    const results = await Promise.allSettled([sendMoney(request), sendMoney(request)]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(await SendMoneyTransferModel.countDocuments()).toBe(1);
    expect(gateway.createPayout).toHaveBeenCalledTimes(1);
  });

  it('refuses a request id that was already used for a different amount', async () => {
    const { user, accountId } = await seedRecipient();
    const request = input(user, accountId);
    await sendMoney(request);
    await expect(sendMoney({ ...request, amount: 99999 })).rejects.toMatchObject({ extensions: { field: 'request_id' } });
    expect(gateway.createPayout).toHaveBeenCalledTimes(1);
  });

  it('refuses an account that is not a verified account of that person, so the destination cannot be swapped', async () => {
    const { user } = await seedRecipient();
    const { accountId: someoneElses } = await seedRecipient({ payout_method: 'IMPS', account_number: '555500005555', ifsc_code: 'ICIC0000001' });
    await expect(sendMoney(input(user, someoneElses))).rejects.toMatchObject({ extensions: { field: 'account_id' } });
    await expect(sendMoney(input(user, 'HOST:000000000000000000000000'))).rejects.toMatchObject({ extensions: { field: 'account_id' } });
    expect(gateway.createPayout).not.toHaveBeenCalled();
    expect(await SendMoneyTransferModel.countDocuments()).toBe(0);
  });

  it('refuses an unknown recipient, a bad amount and a missing reason, without creating anything', async () => {
    const { user, accountId } = await seedRecipient();
    await expect(sendMoney(input({ _id: new Types.ObjectId() }, accountId))).rejects.toMatchObject({ extensions: { field: 'recipient_user_id' } });
    await expect(sendMoney(input(user, accountId, { amount: 0 }))).rejects.toMatchObject({ extensions: { field: 'amount' } });
    await expect(sendMoney(input(user, accountId, { reason: '' }))).rejects.toMatchObject({ extensions: { field: 'reason' } });
    expect(await SendMoneyTransferModel.countDocuments()).toBe(0);
  });

  it('refuses to start when payouts are not set up', async () => {
    gateway.isPayoutConfigured.mockResolvedValue(false);
    const { user, accountId } = await seedRecipient();
    await expect(sendMoney(input(user, accountId))).rejects.toThrow('Payouts are not set up');
    expect(await SendMoneyTransferModel.countDocuments()).toBe(0);
  });

  it('pays a UPI account in UPI mode whatever bank method the form carried', async () => {
    const { user, accountId } = await seedRecipient({ payout_method: 'UPI', upi_id: 'meera@okhdfc', account_number: '', ifsc_code: '' });
    const transfer = await sendMoney(input(user, accountId, { payoutMethod: 'NEFT' }));
    expect(transfer.payout_method).toBe('UPI');
    expect(gateway.createPayout).toHaveBeenCalledWith(expect.objectContaining({ mode: 'UPI' }));
  });

  it('keeps a refused payout FAILED and visible, and does not tell the recipient they were paid', async () => {
    gateway.createPayout.mockRejectedValueOnce(refusal);
    const { user, accountId } = await seedRecipient();
    const transfer = await sendMoney(input(user, accountId));
    expect(transfer.payout).toMatchObject({ status: 'FAILED', failure_reason: 'Insufficient RazorpayX balance' });
    expect(await auditActions(transfer.transfer_id)).toEqual(['TRANSFER_CREATED', 'PAYOUT_FAILED']);
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('a Send Money payout settling and retrying', () => {
  it('marks it PAID once, notifies the recipient once, and ignores a repeat', async () => {
    const { user, accountId } = await seedRecipient();
    const transfer = await sendMoney(input(user, accountId));
    const args = { kind: 'SEND_MONEY' as const, recordId: transfer.transfer_id, outcome: 'PAID' as const, razorpayPayoutId: 'pout_1', utr: 'UTR3' };

    expect(await settlePayout({ ...args, dedupeKey: 'e1' })).toBe('APPLIED');
    expect(await settlePayout({ ...args, dedupeKey: 'e1' })).toBe('IGNORED');

    const paid = await SendMoneyTransferModel.findById(transfer._id);
    expect(paid?.payout).toMatchObject({ status: 'PAID', utr: 'UTR3' });
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ notice: 'SEND_MONEY_PAID', vars: expect.objectContaining({ amount: 15000, reference: 'UTR3', reason: 'October salary' }) })
    );
  });

  it('retries a failed transfer as a new attempt, and refuses to retry a paid one', async () => {
    gateway.createPayout.mockRejectedValueOnce(refusal);
    const { user, accountId } = await seedRecipient();
    const failed = await sendMoney(input(user, accountId));
    gateway.createPayout.mockResolvedValue(queued('pout_2'));

    const retried = await retryTransfer(failed.transfer_id, actor);
    expect(retried.payout).toMatchObject({ status: 'PROCESSING', attempt: 2, razorpay_payout_id: 'pout_2' });
    expect(gateway.createPayout).toHaveBeenLastCalledWith(expect.objectContaining({ idempotencyKey: `${failed.transfer_id}:2` }));

    await settlePayout({ kind: 'SEND_MONEY', recordId: failed.transfer_id, outcome: 'PAID', razorpayPayoutId: 'pout_2', dedupeKey: 'e2' });
    await expect(retryTransfer(failed.transfer_id, actor)).rejects.toThrow('already paid');
  });
});

describe('Send Money reads', () => {
  it('finds people by every word of a search, and loads their verified accounts only on selection', async () => {
    const { user } = await seedRecipient();
    await UserModel.create({ auth: { email: 'other@example.com' }, profile: { first_name: 'Rohan', last_name: 'Das' } });

    const found = await sendMoneyRecipients('meera nair');
    expect(found.map((r) => r.id)).toEqual([String(user._id)]);
    expect(found[0].verified_accounts).toEqual([]);
    expect(await sendMoneyRecipients('m')).toEqual([]);
    expect(await sendMoneyRecipients('zzzzzz')).toEqual([]);

    const detail = await sendMoneyRecipient(String(user._id));
    expect(detail.name).toBe('Meera Nair');
    expect(detail.verified_accounts).toHaveLength(1);
    expect(detail.verified_accounts[0]).toMatchObject({ source: 'HOST', payout_method: 'IMPS', ifsc_code: 'HDFC0001234' });
  });

  it('lists transfers newest first and filters them by status', async () => {
    gateway.createPayout.mockRejectedValueOnce(refusal);
    const { user, accountId } = await seedRecipient();
    await sendMoney(input(user, accountId));
    await sendMoney(input(user, accountId));

    const all = await sendMoneyTransfersTable({});
    expect(all.total).toBe(2);
    expect(all.rows.map((r) => r.status).sort()).toEqual(['FAILED', 'PROCESSING']);
    const failed = await sendMoneyTransfersTable({ filters: [{ field: 'status', op: 'eq', value: 'FAILED' }] });
    expect(failed.rows).toHaveLength(1);
    expect(failed.rows[0]).toMatchObject({ status: 'FAILED', recipient_name: 'Meera Nair', initiated_by_name: 'Finance One' });
  });

  it('keeps Send Money events out of the Withdrawal Logs', async () => {
    const { user, accountId } = await seedRecipient();
    await sendMoney(input(user, accountId));
    expect((await payoutAuditTable('WITHDRAWAL', {})).total).toBe(0);
    expect((await payoutAuditTable('SEND_MONEY', {})).total).toBe(2);
  });
});
