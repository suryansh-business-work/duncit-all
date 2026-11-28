/**
 * Salary account changes against a real database: the proof must be the
 * employee's own private upload, one change waits at a time, HR's check is
 * recorded, nobody decides their own change, and only an approval writes the
 * HR record — keeping the UAN it already held.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [key, typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value])
  );
});
jest.mock('@modules/hr/hr.notify', () => ({
  ...jest.requireActual('@modules/hr/hr.notify'),
  notifyHr: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@modules/platform/upload/privateMedia', () => ({
  ...jest.requireActual('@modules/platform/upload/privateMedia'),
  signedPrivateUrl: jest.fn().mockResolvedValue({ url: 'https://files.test/signed', expiresAt: new Date('2030-01-01T00:00:00.000Z') }),
}));

import { notifyHr } from '@modules/hr/hr.notify';
import { privateFolder } from '@modules/platform/upload/uploadFolder';
import { HrEmployeeModel } from '@modules/hr/employee/employee.model';
import { Q as EQ, person, stubRoleTransactions } from '@modules/hr/employee/__tests__/hr.fixtures';
import { hrBankRequestResolvers } from '../../bankRequest.resolver';
import { HrBankChangeRequestModel } from '../../bankRequest.model';
import { BANK, asRoles, employee } from '../../../__tests__/hr-ops.fixtures';

const Q = hrBankRequestResolvers.Query as Record<string, (...a: any[]) => any>;
const M = hrBankRequestResolvers.Mutation as Record<string, (...a: any[]) => any>;

beforeAll(async () => {
  await Promise.all([HrBankChangeRequestModel.syncIndexes(), HrEmployeeModel.syncIndexes()]);
}, 60_000);

stubRoleTransactions();
beforeEach(() => jest.mocked(notifyHr).mockClear());

const proofFor = (userId: string, file = 'cheque.jpg') => `https://ik.imagekit.io/duncit${privateFolder(userId, 'bank_proof')}/${file}`;
const NEW_ACCOUNT = { account_holder_name: 'Meera Nair', account_number: '987654321098', ifsc: 'ICIC0004321', bank_name: 'ICICI Bank' };

async function setup() {
  const hr = await person('Asha', ['HR_MANAGER']);
  const staff = await employee(hr, 'Meera', { bank: BANK });
  return { hr, staff };
}

describe('asking for a change', () => {
  it('waits for HR without touching the salary account, and only one change waits at a time', async () => {
    const { staff } = await setup();
    const request = await M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, proof_url: proofFor(staff.userId), note: 'Moved banks' } }, staff.ctx);
    expect(request).toMatchObject({ status: 'PENDING', account_number_masked: '•••• 1098', ifsc: 'ICIC0004321', proof_kind: 'IMAGE' });

    const mine = await Q.myBankAccount({}, {}, staff.ctx);
    expect(mine).toMatchObject({ can_request: false, pending: { id: request.id }, current: { account_number_masked: '•••• 9012', ifsc: 'HDFC0001234' } });
    await expect(M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, account_number: '111122223333', proof_url: proofFor(staff.userId) } }, staff.ctx)).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
    expect(jest.mocked(notifyHr).mock.calls[0]?.[0].userIds).not.toContain(staff.userId);
  });

  it('refuses a proof uploaded by someone else, a file that is not an image or PDF, and the account already on record', async () => {
    const { hr, staff } = await setup();
    const other = await employee(hr, 'Ravi');
    const ask = (input: Record<string, unknown>) => M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, ...input } }, staff.ctx);
    await expect(ask({ proof_url: proofFor(other.userId) })).rejects.toThrow('Upload the proof again from this account');
    await expect(ask({ proof_url: proofFor(staff.userId, 'notes.txt') })).rejects.toThrow('Upload the proof again from this account');
    await expect(ask({ ...BANK, proof_url: proofFor(staff.userId, 'cheque.pdf') })).rejects.toThrow('This is already your salary account');
    await expect(ask({ ifsc: 'ICIC04321', proof_url: proofFor(staff.userId) })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});

describe('HR deciding', () => {
  it('shows HR the full number and the proof, records the look, and approving changes the salary account but keeps the UAN', async () => {
    const { hr, staff } = await setup();
    const request = await M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, proof_url: proofFor(staff.userId) } }, staff.ctx);

    const detail = await Q.hrBankChangeRequest({}, { id: request.id }, hr);
    expect(detail).toMatchObject({ account_number: '987654321098', proof_url: 'https://files.test/signed', current: { account_number_masked: '•••• 9012' } });
    expect((await HrBankChangeRequestModel.findById(request.id).lean())?.views).toHaveLength(1);

    const approved = await M.decideHrBankChangeRequest({}, { id: request.id, approve: true }, hr);
    expect(approved.status).toBe('APPROVED');
    const { employee: record } = await EQ.hrEmployee({}, { id: staff.id }, hr);
    expect(record.bank).toMatchObject({ account_number_masked: '•••• 1098', ifsc: 'ICIC0004321', bank_name: 'ICICI Bank', uan: BANK.uan });
    const [latest] = await EQ.hrEmployeeHistory({}, { id: staff.id }, hr);
    expect(latest.kind).toBe('BANK_UPDATED');
    expect(jest.mocked(notifyHr).mock.calls.at(-1)?.[0]).toMatchObject({ userIds: [staff.userId], email: { template: 'hr-bank-change-decided', vars: { decision: 'Approved' } } });
    expect((await Q.myBankAccount({}, {}, staff.ctx)).can_request).toBe(true);
  });

  it('needs a reason to decline, and never lets HR decide their own change', async () => {
    const { hr, staff } = await setup();
    const request = await M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, proof_url: proofFor(staff.userId) } }, staff.ctx);
    await expect(M.decideHrBankChangeRequest({}, { id: request.id, approve: true }, asRoles(staff.ctx, ['HR_MANAGER']))).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(M.decideHrBankChangeRequest({}, { id: request.id, approve: false }, hr)).rejects.toThrow('Say why the change is declined');
    const declined = await M.decideHrBankChangeRequest({}, { id: request.id, approve: false, note: 'The name on the cheque does not match' }, hr);
    expect(declined).toMatchObject({ status: 'REJECTED', decision_note: 'The name on the cheque does not match' });
    const { employee: record } = await EQ.hrEmployee({}, { id: staff.id }, hr);
    expect(record.bank.account_number_masked).toBe('•••• 9012');
  });

  it('lets the employee withdraw a change that is still waiting', async () => {
    const { staff } = await setup();
    const request = await M.requestMyBankChange({}, { input: { ...NEW_ACCOUNT, proof_url: proofFor(staff.userId) } }, staff.ctx);
    await expect(M.cancelMyBankChange({}, { id: request.id }, staff.ctx)).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(M.cancelMyBankChange({}, { id: request.id }, staff.ctx)).rejects.toThrow('Only a change that is still waiting can be cancelled');
  });
});
