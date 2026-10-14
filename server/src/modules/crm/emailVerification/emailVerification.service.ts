import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { requestIdentity } from '@observability/requestIdentity';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { actorOf, toJob } from '@modules/platform/backgroundJob/backgroundJob.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { checkAndRecord } from './emailVerification.check';
import { extractEmails } from './emailVerification.csv';
import { EmailVerificationModel, type EmailVerificationDoc } from './emailVerification.model';
import type { EmailVerifyParams } from './emailVerification.step';

/** The most addresses one status lookup answers — a page of CRM rows, not a dump. */
const MAX_STATUS_LOOKUP = 200;

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['email', 'checked_by.email'],
  sortFields: { email: 'email', status: 'status', source: 'source', created_at: 'created_at' },
  filterFields: {
    email: { type: 'string' },
    status: { type: 'enum' },
    source: { type: 'enum' },
    job_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const pub = (doc: EmailVerificationDoc) => ({
  id: doc._id.toHexString(),
  email: doc.email,
  status: doc.status,
  is_valid_syntax: doc.is_valid_syntax,
  accepts_mail: doc.accepts_mail,
  can_connect_smtp: doc.can_connect_smtp,
  is_deliverable: doc.is_deliverable,
  is_catch_all: doc.is_catch_all,
  has_full_inbox: doc.has_full_inbox,
  is_disabled: doc.is_disabled,
  is_disposable: doc.is_disposable,
  is_role_account: doc.is_role_account,
  suggestion: doc.suggestion ?? '',
  source: doc.source,
  job_id: doc.job_id ?? null,
  checked_by: doc.checked_by?.email ?? '',
  created_at: doc.created_at.toISOString(),
});

const actorFor = (user: AuthUser) => ({ id: user.id, email: user.email ?? '' });

export const emailVerificationService = {
  /** Check one address now and keep the record. */
  async verify(user: AuthUser, email: string) {
    if (!email?.trim()) throw badInput('Enter an email address');
    const doc = await checkAndRecord(email, actorFor(user), 'SINGLE');
    return pub(doc.toObject<EmailVerificationDoc>());
  },

  /** The newest status of each address asked about; unchecked ones are simply absent. */
  async statuses(emails: string[]) {
    const wanted = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
    if (wanted.length > MAX_STATUS_LOOKUP) throw badInput(`Ask for at most ${MAX_STATUS_LOOKUP} emails at once`);
    if (wanted.length === 0) return [];
    const rows = await EmailVerificationModel.aggregate<{ _id: string; status: string; checked_at: Date; suggestion: string }>([
      { $match: { email: { $in: wanted } } },
      { $sort: { email: 1, created_at: -1 } },
      {
        $group: {
          _id: '$email',
          status: { $first: '$status' },
          checked_at: { $first: '$created_at' },
          suggestion: { $first: '$suggestion' },
        },
      },
    ]);
    return rows.map((row) => ({
      email: row._id,
      status: row.status,
      checked_at: row.checked_at.toISOString(),
      suggestion: row.suggestion ?? '',
    }));
  },

  /** Every check ever run — the history table on the Email Verifier page. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<EmailVerificationDoc>(
      EmailVerificationModel,
      {},
      input,
      TABLE_CONFIG
    );
    return { rows: docs.map(pub), total, page, page_size };
  },

  /** Read an uploaded CSV/XLSX and check its addresses as a background job. */
  async startBulk(user: AuthUser, contentBase64: string, filename: string, url: string) {
    const emails = extractEmails(contentBase64);
    const actor = actorOf(user);
    const params: EmailVerifyParams = { emails };
    const job = await BackgroundJobModel.create({
      kind: 'EMAIL_VERIFY',
      label: (filename || 'CSV upload').slice(0, 200),
      url: url.slice(0, 2000),
      params,
      total: emails.length,
      cursor: 0,
      actor,
      identity: requestIdentity.current() ?? { user: actor },
    });
    scheduleJob(String(job.id));
    return toJob(job);
  },
};
