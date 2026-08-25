import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';

jest.mock('../../emailLog.model', () => ({
  EMAIL_LOG_HTML_LIMIT: 1000,
  EmailLogModel: {
    aggregate: jest.fn(),
    countDocuments: jest.fn(),
    estimatedDocumentCount: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));

import { ADDRESSES_PER_ROW, emailLogService, RECIPIENTS_PER_ROW } from '../../emailLog.service';
import { emailLogResolvers } from '../../emailLog.resolver';
import { EmailLogModel } from '../../emailLog.model';
import { logs } from '@observability/log';

const aggregate = EmailLogModel.aggregate as unknown as jest.Mock;
const countDocuments = EmailLogModel.countDocuments as unknown as jest.Mock;
const estimatedDocumentCount = EmailLogModel.estimatedDocumentCount as unknown as jest.Mock;
const deleteMany = EmailLogModel.deleteMany as unknown as jest.Mock;
const warn = logs.server.warn as unknown as jest.Mock;

const ctx = (roles: string[] | null): GraphQLContext =>
  ({ user: roles ? { id: 'u1', roles, email: 'ops@x.com' } : null }) as unknown as GraphQLContext;

beforeEach(() => {
  aggregate.mockResolvedValue([]);
  countDocuments.mockResolvedValue(0);
  estimatedDocumentCount.mockResolvedValue(0);
  deleteMany.mockResolvedValue({ deletedCount: 0 });
});

/* ------------------------- the recipient rule -------------------------- */

type Doc = Record<string, unknown>;

/**
 * Just enough of the aggregation expression language to run the shipped
 * recipient rule against a row.
 *
 * Mongo executes it in production; this exists so the arithmetic that decides
 * how many PEOPLE a row reached can be proved without a database, against the
 * exact expression the pipeline sends rather than a restatement of it.
 */
function evalExpr(expr: unknown, doc: Doc, vars: Doc): any {
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) return vars[expr.slice(2)];
    if (expr.startsWith('$')) return doc[expr.slice(1)];
    return expr;
  }
  if (expr === null || typeof expr !== 'object' || Array.isArray(expr)) return expr;
  const [[op, raw]] = Object.entries(expr as Doc);
  const ev = (v: unknown) => evalExpr(v, doc, vars);
  const args = Array.isArray(raw) ? raw.map(ev) : [];
  switch (op) {
    case '$let':
      return evalLet(raw as Doc, doc, vars);
    case '$ifNull':
      return args[0] ?? args[1];
    case '$size':
      return (ev(raw) as unknown[]).length;
    case '$trim':
      return String(ev((raw as Doc).input)).trim();
    case '$split':
      return String(args[0]).split(String(args[1]));
    case '$eq':
      return args[0] === args[1];
    case '$gt':
      return args[0] > args[1];
    case '$cond':
      return args[0] ? args[1] : args[2];
    default:
      throw new Error(`unsupported operator ${op}`);
  }
}

function evalLet(raw: Doc, doc: Doc, vars: Doc): unknown {
  const bound: Doc = { ...vars };
  for (const [name, value] of Object.entries(raw.vars as Doc)) {
    bound[name] = evalExpr(value, doc, bound);
  }
  return evalExpr(raw.in, doc, bound);
}

const recipients = (row: Doc): number => evalExpr(RECIPIENTS_PER_ROW, row, {}) as number;
const addresses = (row: Doc): string[] => evalExpr(ADDRESSES_PER_ROW, row, {}) as string[];

describe('emailLog — which people a row was addressed to', () => {
  it('names the bcc audience of a campaign batch, never the sending mailbox', () => {
    // The repeat-failure list groups on these. Grouping on `to` instead would put
    // our own address at the top of a list of people who cannot receive mail.
    expect(addresses({ to: 'campaigns@duncit.com', bcc: ['a@x.com', 'b@x.com'] })).toEqual([
      'a@x.com',
      'b@x.com',
    ]);
  });

  it('splits a multi-recipient transactional send back into its addresses', () => {
    expect(addresses({ to: 'a@x.com, b@x.com', bcc: [] })).toEqual(['a@x.com', 'b@x.com']);
  });

  it('names nobody for a row addressed to nobody', () => {
    expect(addresses({ to: '  ', bcc: [] })).toEqual([]);
  });
});

describe('emailLog — how many people a row reached', () => {
  it('counts the bcc audience of a campaign batch, not the sending mailbox', () => {
    const batch = { to: 'campaigns@duncit.com', bcc: ['a@x.com', 'b@x.com', 'c@x.com'] };
    expect(recipients(batch)).toBe(3);
  });

  it('counts every address of a multi-recipient transactional send', () => {
    expect(recipients({ to: 'a@x.com, b@x.com', bcc: [] })).toBe(2);
  });

  it('contributes nothing for a row addressed to nobody', () => {
    expect(recipients({ to: '   ', bcc: [] })).toBe(0);
    expect(recipients({})).toBe(0);
  });
});

/* ----------------------------- dashboard -------------------------------- */

describe('emailLog dashboard', () => {
  it('reports zeroes rather than undefined for an empty window', async () => {
    const result = await emailLogService.dashboard(30);
    expect(result).toMatchObject({
      range_days: 30,
      attempts: 0,
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      partially_refused: 0,
      silently_discarded: 0,
      not_delivered_reasons: [],
      not_delivered_templates: [],
      repeat_failures: [],
    });
  });

  it('splits the status totals and carries the recipient count through', async () => {
    aggregate
      .mockResolvedValueOnce([{ _id: null, attempts: 12, recipients: 480 }])
      .mockResolvedValueOnce([
        { _id: 'SENT', count: 9 },
        { _id: 'FAILED', count: 2 },
        { _id: 'SKIPPED', count: 1 },
      ])
      .mockResolvedValueOnce([{ _id: 'Template disabled', count: 2 }])
      .mockResolvedValueOnce([{ _id: 'welcome', count: 2 }])
      .mockResolvedValueOnce([
        { _id: 'bounces@x.com', failures: 4, last_reason: 'No message body', last_failed_at: null },
      ]);
    countDocuments.mockResolvedValueOnce(1).mockResolvedValueOnce(7);

    const result = await emailLogService.dashboard(7);
    expect(result.attempts).toBe(12);
    expect(result.recipients).toBe(480);
    expect(result).toMatchObject({ sent: 9, failed: 2, skipped: 1 });
    expect(result.partially_refused).toBe(1);
    expect(result.silently_discarded).toBe(7);
    expect(result.not_delivered_reasons).toEqual([{ key: 'Template disabled', count: 2 }]);
    expect(result.not_delivered_templates).toEqual([{ key: 'welcome', count: 2 }]);
    expect(result.repeat_failures).toEqual([
      { address: 'bounces@x.com', failures: 4, last_reason: 'No message body', last_failed_at: null },
    ]);
  });

  it('labels a raw-HTML send with an empty template key rather than dropping it', async () => {
    aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _id: null, count: 3 }])
      .mockResolvedValueOnce([]);
    const result = await emailLogService.dashboard(7);
    expect(result.not_delivered_templates).toEqual([{ key: '', count: 3 }]);
  });

  it('renders the last failure time as an ISO string', async () => {
    const at = new Date('2026-08-01T09:30:00.000Z');
    aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _id: 'x@x.com', failures: 3, last_reason: null, last_failed_at: at }]);
    const result = await emailLogService.dashboard(7);
    expect(result.repeat_failures[0]).toEqual({
      address: 'x@x.com',
      failures: 3,
      last_reason: '',
      last_failed_at: '2026-08-01T09:30:00.000Z',
    });
  });

  it('never scans further back than ninety days, whatever the client asks for', async () => {
    expect((await emailLogService.dashboard(5000)).range_days).toBe(90);
    expect((await emailLogService.dashboard(null)).range_days).toBe(7);
    expect((await emailLogService.dashboard(-3)).range_days).toBe(7);
  });
});

/* -------------------------------- stats --------------------------------- */

describe('emailLog stats', () => {
  it('reports the all-time size alongside the window', async () => {
    aggregate.mockResolvedValueOnce([
      { _id: 'SENT', count: 4 },
      { _id: 'FAILED', count: 1 },
    ]);
    estimatedDocumentCount.mockResolvedValueOnce(120_000);
    const result = await emailLogService.stats(7);
    expect(result).toEqual({
      days: 7,
      sent: 4,
      skipped: 0,
      failed: 1,
      total: 5,
      all_time_total: 120_000,
    });
  });
});

/* ------------------------------- deletes -------------------------------- */

describe('emailLog deletes', () => {
  it('skips a malformed id instead of failing the whole selection', async () => {
    const good = new Types.ObjectId().toString();
    deleteMany.mockResolvedValueOnce({ deletedCount: 1 });
    const removed = await emailLogService.deleteByIds(['not-an-id', good], { id: 'u1' });
    expect(deleteMany).toHaveBeenCalledWith({ _id: { $in: [good] } });
    expect(removed).toBe(1);
  });

  it('does not go to the database for an empty selection', async () => {
    expect(await emailLogService.deleteByIds([], { id: 'u1' })).toBe(0);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('records who deleted what before the rows are gone', async () => {
    const good = new Types.ObjectId().toString();
    await emailLogService.deleteByIds([good], { id: 'u9' });
    expect(warn).toHaveBeenCalledWith('emailLog', 'deleteMany', { userId: 'u9', requested: 1 });
  });

  it('returns how many rows the clear-everything actually removed', async () => {
    deleteMany.mockResolvedValueOnce({ deletedCount: 4210 });
    expect(await emailLogService.deleteAll({ id: 'u1' })).toBe(4210);
    expect(warn).toHaveBeenCalledWith('emailLog', 'deleteAll', { userId: 'u1' });
  });

  it('reports zero when the driver answers without a count', async () => {
    deleteMany.mockResolvedValue({});
    expect(await emailLogService.deleteAll({ id: 'u1' })).toBe(0);
    expect(await emailLogService.deleteByIds([new Types.ObjectId().toString()], { id: 'u1' })).toBe(
      0
    );
  });
});

/* ---------------------------- template usage ---------------------------- */

describe('emailLog usage by template', () => {
  /** One `$group` row, as the pipeline hands it back. */
  const row = (over: Record<string, unknown> = {}) => ({
    _id: 'pod-backout-spot-filled',
    sent: 128,
    skipped: 2,
    failed: 3,
    total: 133,
    last_sent_at: new Date('2026-08-24T12:30:00.000Z'),
    last_attempt_at: new Date('2026-08-25T09:00:00.000Z'),
    ...over,
  });

  it('reports each slug with its counts and both dates as ISO strings', async () => {
    aggregate.mockResolvedValueOnce([row()]);
    expect(await emailLogService.usageByTemplate()).toEqual([
      {
        slug: 'pod-backout-spot-filled',
        sent: 128,
        skipped: 2,
        failed: 3,
        total: 133,
        last_sent_at: '2026-08-24T12:30:00.000Z',
        last_attempt_at: '2026-08-25T09:00:00.000Z',
      },
    ]);
  });

  it('leaves last_sent_at null for a template that has only ever failed', async () => {
    aggregate.mockResolvedValueOnce([
      row({ sent: 0, skipped: 0, failed: 40, total: 40, last_sent_at: null }),
    ]);
    const [usage] = await emailLogService.usageByTemplate();
    expect(usage.last_sent_at).toBeNull();
    // Still an attempt date — which is what separates "broken" from "unused".
    expect(usage.last_attempt_at).toBe('2026-08-25T09:00:00.000Z');
  });

  it('leaves out the raw-HTML sends, which have no template page to sit on', async () => {
    aggregate.mockResolvedValueOnce([]);
    await emailLogService.usageByTemplate();
    const [pipeline] = aggregate.mock.calls[0];
    expect(pipeline[0]).toEqual({ $match: { template: { $gt: '' } } });
  });

  it('counts each status separately off one pass, not three queries', async () => {
    aggregate.mockResolvedValueOnce([]);
    await emailLogService.usageByTemplate();
    expect(aggregate).toHaveBeenCalledTimes(1);
    const group = aggregate.mock.calls[0][0][1].$group;
    expect(group._id).toBe('$template');
    expect(group.sent).toEqual({ $sum: { $cond: [{ $eq: ['$status', 'SENT'] }, 1, 0] } });
    expect(group.total).toEqual({ $sum: 1 });
  });

  it('is unwindowed — "has this ever been used" cannot be answered by seven days', async () => {
    aggregate.mockResolvedValueOnce([]);
    await emailLogService.usageByTemplate();
    // created_at is read as a MAX, never as a bound: nothing in the pipeline
    // narrows the rows by date.
    const [pipeline] = aggregate.mock.calls[0];
    expect(Object.keys(pipeline[0].$match)).toEqual(['template']);
    expect(pipeline.some((stage: Record<string, unknown>) => '$limit' in stage)).toBe(false);
  });
});

/* --------------------------------- rbac --------------------------------- */

describe('emailLog access', () => {
  it('lets a TECH_MANAGER read the page the Tech portal shows them', async () => {
    await expect(
      emailLogResolvers.Query.emailLogDashboard({}, { range_days: 7 }, ctx(['TECH_MANAGER']))
    ).resolves.toMatchObject({ range_days: 7 });
    await expect(
      emailLogResolvers.Query.emailLogStats({}, { days: 7 }, ctx(['TECH_MANAGER']))
    ).resolves.toMatchObject({ days: 7 });
  });

  it('answers the Templates page its send counts under the same roles as the log', async () => {
    aggregate.mockResolvedValueOnce([]);
    await expect(
      emailLogResolvers.Query.emailTemplateUsage({}, {}, ctx(['CITY_ADMIN']))
    ).resolves.toEqual([]);
    expect(() => emailLogResolvers.Query.emailTemplateUsage({}, {}, ctx(['USER']))).toThrow(
      /access denied/i
    );
  });

  it('keeps everyone else out', () => {
    expect(() => emailLogResolvers.Query.emailLogDashboard({}, {}, ctx(['USER']))).toThrow(
      /access denied/i
    );
    expect(() => emailLogResolvers.Query.emailLog({}, { id: 'x' }, ctx(null))).toThrow(
      /not authenticated/i
    );
  });

  it('passes the actor through to the delete so the audit line names them', async () => {
    const good = new Types.ObjectId().toString();
    await emailLogResolvers.Mutation.deleteEmailLogs({}, { ids: [good] }, ctx(['TECH_MANAGER']));
    expect(warn).toHaveBeenCalledWith('emailLog', 'deleteMany', { userId: 'u1', requested: 1 });
  });

  it('holds clear-everything to SUPER_ADMIN, not to everyone who can read the log', async () => {
    expect(() =>
      emailLogResolvers.Mutation.deleteAllEmailLogs({}, {}, ctx(['TECH_MANAGER']))
    ).toThrow(/access denied/i);
    await emailLogResolvers.Mutation.deleteAllEmailLogs({}, {}, ctx(['SUPER_ADMIN']));
    expect(deleteMany).toHaveBeenCalledWith({});
  });
});
