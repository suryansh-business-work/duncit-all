import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { checkEmailWithReacher, type EmailCheckResult } from '@modules/crm/emailVerification/emailVerification.client';
import { EmailVerificationModel } from '@modules/crm/emailVerification/emailVerification.model';
import { emailValidationService } from '../../emailValidation.service';

jest.mock('@modules/crm/emailVerification/emailVerification.client', () => ({ checkEmailWithReacher: jest.fn() }));

const reacher = jest.mocked(checkEmailWithReacher);
const financeUser = { id: 'f1', email: 'fin@duncit.com', roles: ['FINANCE_MANAGER'] };
const admin = { id: 'a1', email: 'admin@duncit.com', roles: ['SUPER_ADMIN'] };

const answer = (status: EmailCheckResult['status'], extra: Partial<EmailCheckResult> = {}): EmailCheckResult => ({
  status,
  is_valid_syntax: true,
  accepts_mail: true,
  can_connect_smtp: true,
  is_deliverable: status === 'VERIFIED',
  is_catch_all: status === 'RISKY',
  has_full_inbox: false,
  is_disabled: false,
  is_disposable: false,
  is_role_account: false,
  suggestion: '',
  ...extra,
});

/** A row as the CRM wrote it before checks were stamped with a console. */
const legacyRow = (email: string, status: EmailCheckResult['status']) =>
  EmailVerificationModel.collection.insertOne({
    email,
    ...answer(status),
    source: 'SINGLE',
    job_id: null,
    checked_by: { id: 'c1', email: 'crm@duncit.com' },
    created_at: new Date('2026-10-01T00:00:00.000Z'),
  });

describe('emailValidationService.validate', () => {
  it('checks the address, stamps the console it ran in, and returns the verdict with each test', async () => {
    reacher.mockResolvedValue(answer('RISKY', { suggestion: 'asha@gmail.com' }));

    const result = await emailValidationService.validate(financeUser, ' Asha@Gmial.com ', 'Finance');

    expect(reacher).toHaveBeenCalledWith('asha@gmial.com');
    expect(result).toMatchObject({
      email: 'asha@gmial.com',
      verdict: 'RISKY',
      status: 'RISKY',
      portal: 'finance',
      source: 'SINGLE',
      revalidated_from: null,
      suggestion: 'asha@gmail.com',
      checked_by: 'fin@duncit.com',
    });
    expect(result.checks.find((check) => check.key === 'NOT_CATCH_ALL')).toEqual({ key: 'NOT_CATCH_ALL', passed: false });
    expect(await EmailVerificationModel.countDocuments({ portal: 'finance' })).toBe(1);
  });

  it('refuses a console the person cannot open, and the member and partner apps', async () => {
    for (const portal of ['crm', 'mweb', 'partners', 'no-such-console', '  ']) {
      await expect(emailValidationService.validate(financeUser, 'a@b.co', portal)).rejects.toThrow(
        'You cannot validate emails from this console'
      );
    }
    expect(reacher).not.toHaveBeenCalled();
    expect(await EmailVerificationModel.countDocuments()).toBe(0);
  });

  it('asks for an address when none was given', async () => {
    await expect(emailValidationService.validate(financeUser, '  ', 'finance')).rejects.toThrow('Enter an email address');
  });

  it('logs nothing when the verifier itself is down — that is not a verdict on the address', async () => {
    reacher.mockRejectedValue(new GraphQLError('Email verifier answered 502', { extensions: { code: 'BAD_GATEWAY' } }));
    await expect(emailValidationService.validate(admin, 'a@b.co', 'admin')).rejects.toThrow('answered 502');
    expect(await EmailVerificationModel.countDocuments()).toBe(0);
  });
});

describe('emailValidationService.revalidate', () => {
  it('runs the check again as Admin’s, pointing back at the earlier one, which is kept', async () => {
    reacher.mockResolvedValueOnce(answer('UNKNOWN', { can_connect_smtp: false })).mockResolvedValueOnce(answer('VERIFIED'));
    const first = await emailValidationService.validate(financeUser, 'ravi@example.com', 'finance');

    const again = await emailValidationService.revalidate(admin, first.id);

    expect(again).toMatchObject({
      email: 'ravi@example.com',
      verdict: 'VALID',
      portal: 'admin',
      revalidated_from: first.id,
      checked_by: 'admin@duncit.com',
    });
    const history = await EmailVerificationModel.find({ email: 'ravi@example.com' }).lean();
    expect(history.map((row) => row.status).sort()).toEqual(['UNKNOWN', 'VERIFIED']);
  });

  it('says so when the validation is gone or the id is not one', async () => {
    await expect(emailValidationService.revalidate(admin, new Types.ObjectId().toHexString())).rejects.toThrow(
      'That validation no longer exists'
    );
    await expect(emailValidationService.revalidate(admin, 'nope')).rejects.toThrow('That validation no longer exists');
    expect(reacher).not.toHaveBeenCalled();
  });
});

describe('emailValidationService.table', () => {
  beforeEach(async () => {
    reacher.mockResolvedValueOnce(answer('VERIFIED')).mockResolvedValueOnce(answer('INVALID', { accepts_mail: false }));
    await emailValidationService.validate(financeUser, 'good@example.com', 'finance');
    await emailValidationService.validate(admin, 'bad@example.com', 'support');
    await legacyRow('old@example.com', 'UNKNOWN');
  });

  it('lists every console’s checks newest first, a legacy row reading as the CRM’s', async () => {
    const page = await emailValidationService.table();

    expect(page.total).toBe(3);
    // The two fresh checks can share a millisecond; the month-old legacy row is last either way.
    expect(page.rows.slice(0, 2).map((row) => row.email).sort()).toEqual(['bad@example.com', 'good@example.com']);
    expect(page.rows[2]).toMatchObject({ email: 'old@example.com', portal: 'crm', verdict: 'RISKY' });
  });

  it('filters by verdict through the statuses it covers', async () => {
    const risky = await emailValidationService.table({ filters: [{ field: 'verdict', op: 'eq', value: 'RISKY' }] });
    expect(risky.rows.map((row) => row.email)).toEqual(['old@example.com']);
  });

  it('finds the legacy rows under CRM, and each console’s own under its key', async () => {
    const crm = await emailValidationService.table({ filters: [{ field: 'portal', op: 'eq', value: 'crm' }] });
    const support = await emailValidationService.table({ filters: [{ field: 'portal', op: 'eq', value: 'support' }] });

    expect(crm.rows.map((row) => row.email)).toEqual(['old@example.com']);
    expect(support.rows.map((row) => row.email)).toEqual(['bad@example.com']);
  });

  it('searches by address and by who ran the check', async () => {
    const byChecker = await emailValidationService.table({ search: 'fin@duncit' });
    expect(byChecker.rows.map((row) => row.email)).toEqual(['good@example.com']);
  });
});
