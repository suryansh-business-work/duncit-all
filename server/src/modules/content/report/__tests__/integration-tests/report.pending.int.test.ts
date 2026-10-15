/**
 * "One OPEN report per person per thing" against a real database.
 *
 * The rule has three layers, and each is exercised here:
 *  - the friendly read in `submit` (REPORT_ALREADY_PENDING),
 *  - the unique partial index on (reporter, type, target, is_open) that holds
 *    when two submits race past that read, and that refuses a reopen which
 *    would leave one person with two open reports (CONFLICT),
 *  - the boot-time `syncIndexes` that backfills `is_open` on legacy rows and
 *    drops the old all-status unique index.
 * Plus `myOpenReport`, the read that lets the report sheet say "already
 * reported" up front, and the queue's count of PEOPLE rather than rows.
 */
jest.mock('../../report.email', () => ({
  sendReportNotice: jest.fn().mockResolvedValue(undefined),
  sendContentReportMessage: jest.fn().mockResolvedValue(null),
}));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

import { makeContext } from '@test/harness';
import { reportService, type ReportTargetSnapshot } from '../../report.service';
import { reportCategoryService } from '../../reportCategory.service';
import { ContentReportModel, OPEN_REPORT_STATUSES, REPORT_STATUSES } from '../../contentReport.model';
import { contentReportResolvers } from '../../report.resolver';
import { sendReportNotice } from '../../report.email';
import * as pending from '../../report.pending';

const notice = sendReportNotice as jest.Mock;
const oid = () => new Types.ObjectId().toString();
const handler = oid();

const snapshot = (over: Partial<ReportTargetSnapshot> = {}): ReportTargetSnapshot => ({
  target_type: 'POST',
  target_id: oid(),
  target_owner_id: oid(),
  ...over,
});

/** The GraphQL error a promise rejected with; fails the test if it resolved. */
async function rejectionOf(p: Promise<unknown>): Promise<GraphQLError> {
  try {
    await p;
  } catch (error) {
    expect(error).toBeInstanceOf(GraphQLError);
    return error as GraphQLError;
  }
  throw new Error('expected a rejection');
}

interface StoredReport {
  _id: Types.ObjectId;
  status: string;
  is_open?: boolean;
  report_no: string | null;
}

const stored = (id: string) => ContentReportModel.findById(id).lean<StoredReport>();

beforeAll(async () => {
  // The race and reopen cases depend on the partial unique index existing.
  await ContentReportModel.init();
});

beforeEach(async () => {
  await reportCategoryService.seedDefaults();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('is_open is derived from status on every save', () => {
  it.each(REPORT_STATUSES.map((status) => [status, OPEN_REPORT_STATUSES.includes(status)] as const))(
    'a report moved to %s is_open=%s',
    async (status, open) => {
      const { id } = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
      await reportService.updateStatus(handler, id, { status });
      expect((await stored(id))?.is_open).toBe(open);
    }
  );
});

describe('submit while an earlier report is open', () => {
  it('refuses the same reporter on the same thing with REPORT_ALREADY_PENDING, and only them', async () => {
    const reporter = oid();
    const snap = snapshot();
    await reportService.submit(reporter, snap, { reason: 'SPAM' });

    const err = await rejectionOf(reportService.submit(reporter, snap, { reason: 'HATE' }));
    expect(err.extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
    expect(err.message).toMatch(/already reported this/);

    // A different person, and the same person on a different thing, still file.
    await reportService.submit(oid(), snap, { reason: 'SPAM' });
    await reportService.submit(reporter, snapshot(), { reason: 'SPAM' });
    expect(await ContentReportModel.countDocuments()).toBe(3);
  });

  it('refuses while the earlier report is IN_REVIEW, not only RECEIVED', async () => {
    const reporter = oid();
    const snap = snapshot();
    const { id } = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    await reportService.updateStatus(handler, id, { status: 'IN_REVIEW' });

    const err = await rejectionOf(reportService.submit(reporter, snap, { reason: 'SPAM' }));
    expect(err.extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
  });

  it.each(['ACTIONED', 'DISMISSED'] as const)('allows a new report once the earlier one is %s', async (status) => {
    const reporter = oid();
    const snap = snapshot();
    const first = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    await reportService.updateStatus(handler, first.id, { status });

    const second = await reportService.submit(reporter, snap, { reason: 'SPAM' });

    expect(second.id).not.toBe(first.id);
    expect(second.report_no).toMatch(/^RPT-\d{6}$/);
    expect(second.report_no).not.toBe(first.report_no);
    expect((await stored(second.id))?.is_open).toBe(true);
    // And while that second one is open, a third is refused again.
    const err = await rejectionOf(reportService.submit(reporter, snap, { reason: 'SPAM' }));
    expect(err.extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
  });

  it('counts a legacy open row written before is_open existed', async () => {
    const reporter = oid();
    const target = new Types.ObjectId();
    await ContentReportModel.collection.insertOne({
      target_type: 'POST',
      target_id: target,
      reason: 'SPAM',
      reporter_id: new Types.ObjectId(reporter),
      status: 'IN_REVIEW',
      history: [],
    });

    const err = await rejectionOf(
      reportService.submit(reporter, snapshot({ target_id: target.toString() }), { reason: 'SPAM' })
    );
    expect(err.extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
  });

  it('a second tap that raced past the read collides on the index and gets the same refusal', async () => {
    const reporter = oid();
    const snap = snapshot();
    const first = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    notice.mockClear();
    // The read saw nothing, as it would for a tap whose read ran before the
    // first tap's insert landed.
    jest.spyOn(pending, 'findOpenReport').mockResolvedValueOnce(null);

    const err = await rejectionOf(reportService.submit(reporter, snap, { reason: 'SPAM' }));

    expect(err.extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
    const rows = await ContentReportModel.find({}).lean<StoredReport[]>();
    expect(rows.map((r) => r._id.toString())).toEqual([first.id]);
    expect(notice).not.toHaveBeenCalled();
  });

  it('two simultaneous submits file exactly one report', async () => {
    const reporter = oid();
    const snap = snapshot();

    const results = await Promise.allSettled([
      reportService.submit(reporter, snap, { reason: 'SPAM' }),
      reportService.submit(reporter, snap, { reason: 'SPAM' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0].reason as GraphQLError).extensions.code).toBe(pending.REPORT_ALREADY_PENDING);
    expect(await ContentReportModel.countDocuments()).toBe(1);
  });

  it('rethrows a duplicate-key error on another index instead of calling it a pending report', async () => {
    const collision = { code: 11000, keyPattern: { report_no: 1 }, keyValue: { report_no: 'RPT-000001' } };
    jest.spyOn(ContentReportModel, 'create').mockRejectedValueOnce(collision);

    await expect(reportService.submit(oid(), snapshot(), { reason: 'SPAM' })).rejects.toBe(collision);
  });
});

describe('isOpenReportCollision', () => {
  it.each([
    [{ code: 11000, keyPattern: { reporter_id: 1, target_type: 1, target_id: 1, is_open: 1 } }, true],
    [{ code: 11000, keyValue: { is_open: true } }, true],
    [{ code: 11000, keyPattern: { report_no: 1 } }, false],
    [{ code: 121, keyPattern: { is_open: 1 } }, false],
    [new Error('network'), false],
    [null, false],
  ])('%j -> %s', (error, expected) => {
    expect(pending.isOpenReportCollision(error)).toBe(expected);
  });
});

describe('updateStatus reopening a closed report', () => {
  it('refuses with CONFLICT when the same reporter has since filed a newer open report, and keeps the old one closed', async () => {
    const reporter = oid();
    const snap = snapshot();
    const old = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    await reportService.updateStatus(handler, old.id, { status: 'DISMISSED' });
    await reportService.submit(reporter, snap, { reason: 'SPAM' });

    for (const status of ['RECEIVED', 'IN_REVIEW']) {
      const err = await rejectionOf(reportService.updateStatus(handler, old.id, { status }));
      expect(err.extensions.code).toBe('CONFLICT');
      expect(err.message).toMatch(/newer open report/);
    }
    expect(await stored(old.id)).toMatchObject({ status: 'DISMISSED', is_open: false });
  });

  it('reopens freely when no newer report exists', async () => {
    const { id } = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    await reportService.updateStatus(handler, id, { status: 'ACTIONED' });

    const reopened = await reportService.updateStatus(handler, id, { status: 'IN_REVIEW' });

    expect(reopened.status).toBe('IN_REVIEW');
    expect((await stored(id))?.is_open).toBe(true);
  });

  it('rethrows a save failure that is not the open-report collision', async () => {
    // A hand-edited row with no reason fails schema validation on save.
    const _id = new Types.ObjectId();
    await ContentReportModel.collection.insertOne({
      _id,
      target_type: 'POST',
      target_id: new Types.ObjectId(),
      reporter_id: new Types.ObjectId(),
      status: 'RECEIVED',
      history: [],
    });

    const err = await reportService.updateStatus(handler, _id.toString(), { status: 'IN_REVIEW' }).then(
      () => null,
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(GraphQLError);
    expect((err as Error).message).toMatch(/reason/);
  });
});

describe('the queue counts people, not rows', () => {
  it('a person who reported again after a close is still one reporter', async () => {
    const repeat = oid();
    const snap = snapshot();
    const first = await reportService.submit(repeat, snap, { reason: 'SPAM' });
    await reportService.updateStatus(handler, first.id, { status: 'DISMISSED' });
    await reportService.submit(repeat, snap, { reason: 'SPAM' });
    await reportService.submit(oid(), snap, { reason: 'HATE' });

    const res = await reportService.table({ page: 1, page_size: 50 });

    expect(res.total).toBe(3);
    expect(res.rows.map((r) => r.report_count)).toEqual([2, 2, 2]);
  });
});

describe('myOpenReport', () => {
  it('refuses a malformed target id', async () => {
    const err = await rejectionOf(reportService.myOpenReport(oid(), 'not-an-id'));
    expect(err.extensions.code).toBe('BAD_USER_INPUT');
  });

  it("answers the viewer's own open report as a receipt, and null once it is closed", async () => {
    const reporter = oid();
    const snap = snapshot({ target_type: 'PROFILE' });
    expect(await reportService.myOpenReport(reporter, snap.target_id)).toBeNull();

    const filed = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    expect(await reportService.myOpenReport(reporter, snap.target_id)).toEqual(filed);

    await reportService.updateStatus(handler, filed.id, { status: 'ACTIONED' });
    expect(await reportService.myOpenReport(reporter, snap.target_id)).toBeNull();
  });

  it("never answers with somebody else's report", async () => {
    const snap = snapshot();
    await reportService.submit(oid(), snap, { reason: 'SPAM' });
    expect(await reportService.myOpenReport(oid(), snap.target_id)).toBeNull();
  });

  it('answers an empty handle for a legacy open row without one', async () => {
    const reporter = oid();
    const target = new Types.ObjectId();
    const { insertedId } = await ContentReportModel.collection.insertOne({
      target_type: 'STORY',
      target_id: target,
      reason: 'SPAM',
      reporter_id: new Types.ObjectId(reporter),
      status: 'RECEIVED',
      history: [],
    });
    expect(await reportService.myOpenReport(reporter, target.toString())).toEqual({
      id: insertedId.toString(),
      report_no: '',
    });
  });

  it('the resolver requires a session and reads the reporter from it, never from args', async () => {
    const reporter = oid();
    const snap = snapshot();
    const filed = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    const resolve = contentReportResolvers.Query.myOpenReport;

    const anon = await rejectionOf(Promise.resolve().then(() => resolve(null, { target_id: snap.target_id }, makeContext())));
    expect(anon.extensions.code).toBe('UNAUTHENTICATED');

    expect(await resolve(null, { target_id: snap.target_id }, makeContext({ id: reporter }))).toEqual(filed);
    expect(await resolve(null, { target_id: snap.target_id }, makeContext({ id: oid() }))).toBeNull();
  });
});

describe('syncIndexes (boot)', () => {
  const LEGACY_INDEX = 'reporter_id_1_target_type_1_target_id_1';

  async function seedLegacy() {
    const reporter = new Types.ObjectId();
    const target = new Types.ObjectId();
    const base = { target_type: 'POST', reason: 'SPAM', history: [] };
    const openId = new Types.ObjectId();
    const closedId = new Types.ObjectId();
    const currentId = new Types.ObjectId();
    await ContentReportModel.collection.insertMany([
      { ...base, _id: openId, target_id: new Types.ObjectId(), reporter_id: new Types.ObjectId(), status: 'IN_REVIEW' },
      { ...base, _id: closedId, target_id: target, reporter_id: reporter, status: 'DISMISSED' },
      // Already carries the field: must not be counted or touched.
      { ...base, _id: currentId, target_id: new Types.ObjectId(), reporter_id: new Types.ObjectId(), status: 'RECEIVED', is_open: true },
    ]);
    return { reporter, target, openId, closedId, currentId };
  }

  it('backfills is_open from status on rows without it, idempotently', async () => {
    const { openId, closedId, currentId } = await seedLegacy();

    expect(await reportService.syncIndexes()).toBe(2);

    const raw = (id: Types.ObjectId) => ContentReportModel.collection.findOne({ _id: id });
    expect((await raw(openId))?.is_open).toBe(true);
    expect((await raw(closedId))?.is_open).toBe(false);
    expect((await raw(currentId))?.is_open).toBe(true);
    expect(await reportService.syncIndexes()).toBe(0);
  });

  it('drops the old all-status unique index and lands the partial one, so a closed report no longer blocks a new one', async () => {
    const { reporter, target } = await seedLegacy();
    await ContentReportModel.collection.createIndex(
      { reporter_id: 1, target_type: 1, target_id: 1 },
      { unique: true, name: LEGACY_INDEX }
    );

    await reportService.syncIndexes();

    const indexes = await ContentReportModel.collection.indexes();
    expect(indexes.map((i) => i.name)).not.toContain(LEGACY_INDEX);
    expect(indexes.find((i) => i.name === 'one_open_report_per_reporter')).toMatchObject({
      unique: true,
      partialFilterExpression: { is_open: true },
      key: { reporter_id: 1, target_type: 1, target_id: 1, is_open: 1 },
    });

    const again = await reportService.submit(reporter.toString(), snapshot({ target_id: target.toString() }), {
      reason: 'SPAM',
    });
    expect((await stored(again.id))?.is_open).toBe(true);
  });
});
