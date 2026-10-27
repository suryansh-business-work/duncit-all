import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { employeeExpenseResolvers } from '../../employeeExpense.resolver';
import { EmployeeExpenseModel } from '../../employeeExpense.model';

/**
 * Deciding an employee expense claim, through the resolvers against a real
 * database. SUPER_ADMIN may both file a claim and decide claims, so the one
 * rule that matters here is that nobody decides their own.
 */

const { Mutation } = employeeExpenseResolvers;

async function makeStaff(roles: string[]) {
  const user = await UserModel.create({
    auth: { email: `expense-${new Types.ObjectId().toHexString()}@duncit.com` },
    profile: { first_name: 'Asha', last_name: 'Rao' },
    metadata: { role_keys: roles },
  });
  return makeContext({ id: String(user._id), roles });
}

const CLAIM = { date: '2026-10-01', amount: 1250.5, category: 'TRAVEL', merchant: 'Metro cab' };

describe('reviewEmployeeExpense', () => {
  it('refuses a super admin approving or rejecting their own claim, and writes nothing', async () => {
    const admin = await makeStaff(['USER', 'SUPER_ADMIN']);
    const claim = await Mutation.createEmployeeExpense(null, { input: CLAIM }, admin);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);

    for (const decision of ['APPROVED', 'REJECTED']) {
      await expect(
        Mutation.reviewEmployeeExpense(null, { expense_doc_id: claim.id, decision, note: 'Looks fine' }, admin)
      ).rejects.toMatchObject({
        message: 'You cannot decide your own claim. Another Finance approver has to review it',
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const stored = await EmployeeExpenseModel.findById(claim.id).lean();
    expect(stored).toMatchObject({ status: 'PENDING', reviewed_by: null });
    expect(warn).toHaveBeenCalledWith(
      'employeeExpense',
      'review',
      expect.objectContaining({ msg: 'self-review refused', claimId: claim.claim_id, reviewerId: admin.user?.id })
    );
    warn.mockRestore();
  });

  it('lets a different Finance approver decide the same claim', async () => {
    const admin = await makeStaff(['USER', 'SUPER_ADMIN']);
    const finance = await makeStaff(['USER', 'FINANCE_MANAGER']);
    const claim = await Mutation.createEmployeeExpense(null, { input: CLAIM }, admin);

    const decided = await Mutation.reviewEmployeeExpense(
      null,
      { expense_doc_id: claim.id, decision: 'APPROVED', note: '' },
      finance
    );
    expect(decided).toMatchObject({ status: 'APPROVED', reviewed_by: finance.user?.id, amount: 1250.5 });
  });

  it('still answers a missing claim as not found rather than as a self-review', async () => {
    const finance = await makeStaff(['USER', 'FINANCE_MANAGER']);
    await expect(
      Mutation.reviewEmployeeExpense(
        null,
        { expense_doc_id: new Types.ObjectId().toHexString(), decision: 'APPROVED' },
        finance
      )
    ).rejects.toMatchObject({ message: 'This claim is not awaiting a decision' });
  });
});
