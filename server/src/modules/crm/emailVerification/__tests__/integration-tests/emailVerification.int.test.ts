import { GraphQLError } from 'graphql';
import { BackgroundJobModel, type LeanBackgroundJob } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { checkEmailWithReacher, type EmailCheckResult } from '../../emailVerification.client';
import { EmailVerificationModel } from '../../emailVerification.model';
import { emailVerificationService } from '../../emailVerification.service';
import { verifyEmailWave } from '../../emailVerification.step';

jest.mock('../../emailVerification.client', () => ({ checkEmailWithReacher: jest.fn() }));
jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));

const reacher = jest.mocked(checkEmailWithReacher);
const schedule = jest.mocked(scheduleJob);
const user = { id: 'u1', email: 'crm@duncit.com', roles: ['CRM_MANAGER'] };

const verdict = (status: EmailCheckResult['status'], extra: Partial<EmailCheckResult> = {}): EmailCheckResult => ({
  status,
  is_valid_syntax: true,
  accepts_mail: status !== 'INVALID',
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

const csv = (text: string) => Buffer.from(text, 'utf8').toString('base64');
const unreachable = () => new GraphQLError('Email verifier is unreachable', { extensions: { code: 'BAD_GATEWAY' } });

const leanJob = async (id: unknown) => {
  const job = await BackgroundJobModel.findById(id).lean<LeanBackgroundJob>();
  if (!job) throw new Error('job missing');
  return job;
};

describe('emailVerificationService.verify', () => {
  it('checks the address with Reacher and keeps the record, normalized, with who ran it', async () => {
    reacher.mockResolvedValue(verdict('VERIFIED', { suggestion: '' }));

    const result = await emailVerificationService.verify(user, '  Asha@Example.com ');

    expect(reacher).toHaveBeenCalledWith('asha@example.com');
    expect(result).toMatchObject({
      email: 'asha@example.com',
      status: 'VERIFIED',
      is_deliverable: true,
      source: 'SINGLE',
      job_id: null,
      checked_by: 'crm@duncit.com',
    });
    expect(result.id).toMatch(/^[a-f0-9]{24}$/);
    expect(Number.isNaN(Date.parse(result.created_at))).toBe(false);
    expect(await EmailVerificationModel.countDocuments()).toBe(1);
  });

  it('records a malformed address as INVALID without asking any mail server', async () => {
    const result = await emailVerificationService.verify(user, 'not-an-email');

    expect(reacher).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: 'INVALID', is_valid_syntax: false });
  });

  it('asks for an address when none was given', async () => {
    await expect(emailVerificationService.verify(user, '   ')).rejects.toThrow('Enter an email address');
    expect(await EmailVerificationModel.countDocuments()).toBe(0);
  });

  it('stores nothing when the verifier itself is down — that is not a verdict on the email', async () => {
    reacher.mockRejectedValue(unreachable());

    await expect(emailVerificationService.verify(user, 'asha@example.com')).rejects.toThrow(/unreachable/);
    expect(await EmailVerificationModel.countDocuments()).toBe(0);
  });
});

describe('emailVerificationService.statuses', () => {
  it('answers the newest verdict per address and leaves never-checked ones out', async () => {
    reacher.mockResolvedValueOnce(verdict('UNKNOWN'));
    await emailVerificationService.verify(user, 'asha@example.com');
    reacher.mockResolvedValueOnce(verdict('VERIFIED'));
    await emailVerificationService.verify(user, 'asha@example.com');
    reacher.mockResolvedValueOnce(verdict('RISKY', { suggestion: 'ravi@gmail.com' }));
    await emailVerificationService.verify(user, 'ravi@gmial.com');

    const rows = await emailVerificationService.statuses(['ASHA@example.com', 'ravi@gmial.com', 'nobody@example.com', '']);

    const byEmail = Object.fromEntries(rows.map((row) => [row.email, row]));
    expect(Object.keys(byEmail).sort((a, b) => a.localeCompare(b))).toEqual(['asha@example.com', 'ravi@gmial.com']);
    expect(byEmail['asha@example.com'].status).toBe('VERIFIED');
    expect(byEmail['ravi@gmial.com']).toMatchObject({ status: 'RISKY', suggestion: 'ravi@gmail.com' });
    expect(Number.isNaN(Date.parse(byEmail['asha@example.com'].checked_at))).toBe(false);
  });

  it('answers nothing for an empty ask and refuses an oversized one', async () => {
    expect(await emailVerificationService.statuses([' '])).toEqual([]);
    const tooMany = Array.from({ length: 201 }, (_, i) => `u${i}@example.com`);
    await expect(emailVerificationService.statuses(tooMany)).rejects.toThrow('Ask for at most 200 emails at once');
  });
});

describe('emailVerificationService.table', () => {
  it('pages the history newest first and filters by status', async () => {
    reacher.mockResolvedValueOnce(verdict('VERIFIED'));
    await emailVerificationService.verify(user, 'first@example.com');
    reacher.mockResolvedValueOnce(verdict('INVALID'));
    await emailVerificationService.verify(user, 'second@example.com');

    const all = await emailVerificationService.table();
    expect(all.total).toBe(2);
    expect(all.rows.map((row) => row.email)).toEqual(['second@example.com', 'first@example.com']);

    const invalid = await emailVerificationService.table({ filters: [{ field: 'status', op: 'in', values: ['INVALID'] }] });
    expect(invalid.rows.map((row) => row.email)).toEqual(['second@example.com']);
  });
});

describe('emailVerificationService.startBulk', () => {
  it('queues an EMAIL_VERIFY job over the file’s distinct addresses and starts it', async () => {
    const job = await emailVerificationService.startBulk(
      user,
      csv('email\nA@example.com\nb@example.com\na@example.com\n'),
      'leads.csv',
      '/tools/email-verifier'
    );

    expect(job).toMatchObject({ kind: 'EMAIL_VERIFY', label: 'leads.csv', url: '/tools/email-verifier', total: 2, status: 'RUNNING' });
    expect(schedule).toHaveBeenCalledWith(job.id);
    const stored = await leanJob(job.id);
    expect(stored.params).toEqual({ emails: ['a@example.com', 'b@example.com'] });
    expect(stored.actor).toMatchObject({ id: 'u1', email: 'crm@duncit.com' });
  });

  it('names an unnamed upload and refuses a file without addresses', async () => {
    const job = await emailVerificationService.startBulk(user, csv('email\nx@example.com\n'), '', '');
    expect(job.label).toBe('CSV upload');

    await expect(emailVerificationService.startBulk(user, csv('name\nAsha\n'), 'x.csv', '')).rejects.toThrow(/No email column/);
    expect(await BackgroundJobModel.countDocuments()).toBe(1);
  });
});

describe('verifyEmailWave', () => {
  const startJob = async (emails: string[]) => {
    reacher.mockResolvedValue(verdict('VERIFIED'));
    const job = await emailVerificationService.startBulk(user, csv(`email\n${emails.join('\n')}\n`), 'leads.csv', '');
    return job.id;
  };

  it('checks the file five addresses at a time, moving the cursor, until the list is done', async () => {
    const emails = Array.from({ length: 7 }, (_, i) => `u${i}@example.com`);
    const id = await startJob(emails);

    expect(await verifyEmailWave(await leanJob(id))).toBe(true);
    let job = await leanJob(id);
    expect(job).toMatchObject({ cursor: 5, succeeded: 5, failed: 0 });

    expect(await verifyEmailWave(job)).toBe(false);
    job = await leanJob(id);
    expect(job).toMatchObject({ cursor: 7, succeeded: 7, failed: 0 });

    const records = await EmailVerificationModel.find({ job_id: id }).lean();
    expect(records).toHaveLength(7);
    expect(records.every((record) => record.source === 'BULK' && record.checked_by?.email === 'crm@duncit.com')).toBe(true);
    expect(await verifyEmailWave(job)).toBe(false);
  });

  it('counts an address the verifier could not answer as failed and carries on', async () => {
    const id = await startJob(['ok@example.com', 'slow@example.com']);
    reacher.mockImplementation(async (email) => {
      if (email === 'slow@example.com') throw unreachable();
      return verdict('VERIFIED');
    });

    expect(await verifyEmailWave(await leanJob(id))).toBe(false);

    const job = await leanJob(id);
    expect(job).toMatchObject({ succeeded: 1, failed: 1 });
    expect(job.failures).toEqual([{ id: 'slow@example.com', message: 'Email verifier is unreachable' }]);
  });

  it('stops the job when the whole wave failed — the verifier is down, not the emails bad', async () => {
    const id = await startJob(['a@example.com', 'b@example.com']);
    reacher.mockRejectedValue(unreachable());

    await expect(verifyEmailWave(await leanJob(id))).rejects.toThrow('Email verifier is unreachable');
    expect(await EmailVerificationModel.countDocuments()).toBe(0);
  });

  it('starts from the top when the job carries no numeric cursor', async () => {
    const id = await startJob(['a@example.com']);
    await BackgroundJobModel.updateOne({ _id: id }, { $set: { cursor: null } });

    expect(await verifyEmailWave(await leanJob(id))).toBe(false);
    expect((await leanJob(id)).cursor).toBe(1);
  });
});
