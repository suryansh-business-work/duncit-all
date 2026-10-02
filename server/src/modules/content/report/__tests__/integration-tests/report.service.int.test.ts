/**
 * The Legal reported-content desk (report.service) against a real database:
 * filing and re-filing a report, the queue's derived columns, manual status
 * moves, the two verdicts that close every report on the same content, and
 * mailing the reporter or the owner.
 *
 * The two mail senders are mocked — what is asserted is WHO is written to,
 * with which template, and that a failed send never undoes a verdict.
 */
jest.mock('../../report.email', () => ({
  sendReportNotice: jest.fn().mockResolvedValue(undefined),
  sendContentReportMessage: jest.fn().mockResolvedValue(null),
}));

import { Types } from 'mongoose';

import { reportService } from '../../report.service';
import { reportCategoryService } from '../../reportCategory.service';
import { ReportCategoryModel } from '../../reportCategory.model';
import { ContentReportModel } from '../../contentReport.model';
import { sendContentReportMessage, sendReportNotice } from '../../report.email';
import { PostModel } from '@modules/engagement/post/post.model';
import { UserModel } from '@modules/access/user/user.model';
import { logs } from '@observability/log';

const notice = sendReportNotice as jest.Mock;
const mailer = sendContentReportMessage as jest.Mock;
const oid = () => new Types.ObjectId().toString();

async function insertPost(fields: Record<string, any> = {}) {
  const _id = new Types.ObjectId();
  await PostModel.collection.insertOne({ _id, author_id: new Types.ObjectId(), image_url: 'https://img.example.com/p.jpg', ...fields });
  return String(_id);
}

const snapshot = (over: Record<string, any> = {}) => ({
  target_type: 'POST' as const,
  target_id: oid(),
  target_owner_id: oid(),
  target_preview_url: 'https://img.example.com/p.jpg',
  target_caption: 'caption',
  ...over,
});

const errorOf = (p: Promise<unknown>) => p.then(() => { throw new Error('expected rejection'); }, (e) => e);

beforeEach(async () => {
  await reportCategoryService.seedDefaults();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('submit', () => {
  it.each([
    [{ target_type: 'MEME' }, 'SPAM', 'Unknown report target'],
    [{ target_id: 'nope' }, 'SPAM', 'Invalid target id'],
  ])('refuses a bad target %j', async (over, reason, message) => {
    const err = await errorOf(reportService.submit(oid(), snapshot(over) as any, { reason }));
    expect(err.message).toBe(message);
    expect(err.extensions.code).toBe('BAD_USER_INPUT');
  });

  it('refuses a report on your own content', async () => {
    const me = oid();
    const err = await errorOf(reportService.submit(me, snapshot({ target_owner_id: me }), { reason: 'SPAM' }));
    expect(err.message).toBe('You cannot report your own content');
  });

  it('refuses an unknown or switched-off reason', async () => {
    await ReportCategoryModel.updateOne({ key: 'SCAM' }, { $set: { is_active: false } });
    for (const reason of ['NOT_A_REASON', 'scam', undefined]) {
      const err = await errorOf(reportService.submit(oid(), snapshot(), { reason }));
      expect(err.message).toBe('Pick a reason for the report');
    }
    expect(await ContentReportModel.countDocuments()).toBe(0);
  });

  it('refuses details over the limit, and a details-required reason without them', async () => {
    const long = await errorOf(reportService.submit(oid(), snapshot(), { reason: 'SPAM', details: 'x'.repeat(2001) }));
    expect(long.message).toBe('Please shorten your description');
    const bare = await errorOf(reportService.submit(oid(), snapshot(), { reason: 'OTHER', details: '   ' }));
    expect(bare.message).toBe('Tell us what is wrong with this content');
  });

  it('files a first report with a permanent handle and mails the reporter once', async () => {
    const reporter = oid();
    const snap = snapshot({ club_id: 'not-an-id' });
    const res = await reportService.submit(reporter, snap, { reason: 'nudity', details: '  explicit  ' });

    expect(res.report_no).toMatch(/^RPT-\d{6}$/);
    const stored = await ContentReportModel.findById(res.id).lean<any>();
    expect(stored).toMatchObject({
      target_type: 'POST',
      reason: 'NUDITY',
      details: 'explicit',
      status: 'RECEIVED',
      target_caption: 'caption',
      club_id: null,
    });
    expect(String(stored.target_owner_id)).toBe(snap.target_owner_id);
    expect(String(stored.reporter_id)).toBe(reporter);
    expect(notice).toHaveBeenCalledTimes(1);
    expect(notice).toHaveBeenCalledWith({
      template: 'content-report-received',
      userId: stored.reporter_id,
      report_no: res.report_no,
      reason: 'Nudity or sexual content',
    });
  });

  it('treats a repeat report as an edit of the same row, keeping its handle and sending no mail', async () => {
    const reporter = oid();
    const snap = snapshot();
    const first = await reportService.submit(reporter, snap, { reason: 'SPAM' });
    notice.mockClear();

    const again = await reportService.submit(reporter, snap, { reason: 'OTHER', details: 'actually worse' });

    expect(again).toEqual(first);
    expect(await ContentReportModel.countDocuments()).toBe(1);
    const stored = await ContentReportModel.findById(first.id).lean<any>();
    expect(stored.reason).toBe('OTHER');
    expect(stored.details).toBe('actually worse');
    expect(notice).not.toHaveBeenCalled();
  });

  it('logs a failed acknowledgement mail without failing the report', async () => {
    const logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    notice.mockRejectedValueOnce(new Error('smtp down'));
    const res = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    await new Promise((r) => setImmediate(r));
    expect(await ContentReportModel.countDocuments({ _id: res.id })).toBe(1);
    expect(logError).toHaveBeenCalledWith(
      'report.service',
      'notice-failed',
      expect.objectContaining({ template: 'content-report-received', report_no: res.report_no }),
    );
  });
});

describe('queue reads', () => {
  it('table derives report counts, category labels and whether the content is still up', async () => {
    const livePost = await insertPost();
    const goneStory = oid();
    const expiredStory = await insertPost({ expires_at: new Date('2020-01-01T00:00:00.000Z') });
    const pod = oid();
    await reportService.submit(oid(), snapshot({ target_id: livePost }), { reason: 'SPAM' });
    await reportService.submit(oid(), snapshot({ target_id: livePost }), { reason: 'HATE' });
    await reportService.submit(oid(), snapshot({ target_type: 'STORY', target_id: goneStory }), { reason: 'SPAM' });
    await reportService.submit(oid(), snapshot({ target_type: 'STORY', target_id: expiredStory }), { reason: 'SPAM' });
    await reportService.submit(oid(), snapshot({ target_type: 'POD', target_id: pod }), { reason: 'SCAM' });
    await ContentReportModel.collection.insertOne({
      target_type: 'CLUB',
      target_id: new Types.ObjectId(),
      reason: 'RETIRED_KEY',
      reporter_id: new Types.ObjectId(),
      status: 'RECEIVED',
      target_removed_at: new Date('2026-09-01T00:00:00.000Z'),
      history: [],
    });

    const res = await reportService.table({ page: 1, page_size: 50 });

    expect(res.total).toBe(6);
    const byTarget = (id: string) => res.rows.filter((r) => r.target_id === id);
    expect(byTarget(livePost).map((r) => [r.report_count, r.target_live])).toEqual([[2, true], [2, true]]);
    expect(byTarget(livePost).map((r) => r.reason_label).sort()).toEqual(['Hate speech or symbols', 'Spam or misleading']);
    expect(byTarget(goneStory)[0]).toMatchObject({ target_live: false, report_count: 1 });
    expect(byTarget(expiredStory)[0].target_live).toBe(false);
    expect(byTarget(pod)[0]).toMatchObject({ target_live: true, reason_label: 'Scam or fraud' });
    const club = res.rows.find((r) => r.target_type === 'CLUB')!;
    expect(club).toMatchObject({ target_live: false, reason_label: 'RETIRED_KEY', report_no: '', target_removed_at: '2026-09-01T00:00:00.000Z' });
  });

  it('table searches by the report handle', async () => {
    const a = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    const res = await reportService.table({ search: a.report_no });
    expect(res.rows.map((r) => r.report_no)).toEqual([a.report_no]);
  });

  it('getById refuses a malformed id and answers null for an unknown one', async () => {
    expect((await errorOf(reportService.getById('bad'))).extensions.code).toBe('BAD_USER_INPUT');
    expect(await reportService.getById(oid())).toBeNull();
  });

  it('stats counts every status, zeros included', async () => {
    const a = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    await ContentReportModel.updateOne({ _id: a.id }, { $set: { status: 'DISMISSED' } });
    expect(await reportService.stats()).toEqual({
      total: 2,
      by_status: [
        { status: 'RECEIVED', count: 1 },
        { status: 'IN_REVIEW', count: 0 },
        { status: 'ACTIONED', count: 0 },
        { status: 'DISMISSED', count: 1 },
      ],
    });
  });
});

describe('updateStatus', () => {
  const handler = oid();

  it('refuses a malformed id, an unknown report and an unknown status', async () => {
    expect((await errorOf(reportService.updateStatus(handler, 'bad', { status: 'IN_REVIEW' }))).message).toBe('Invalid report id');
    expect((await errorOf(reportService.updateStatus(handler, oid(), { status: 'IN_REVIEW' }))).extensions.code).toBe('NOT_FOUND');
    const { id } = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    expect((await errorOf(reportService.updateStatus(handler, id, { status: 'ESCALATED' }))).message).toBe('Unknown report status');
    expect((await errorOf(reportService.updateStatus(handler, id, { resolution: 'x'.repeat(5001) }))).message).toBe('That note is too long');
  });

  it('logs a change, stamps resolved_at once on close and clears it on reopen', async () => {
    const { id } = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });

    const review = await reportService.updateStatus(handler, id, { status: 'in_review', resolution: '  looking  ' });
    expect(review).toMatchObject({ status: 'IN_REVIEW', resolution: 'looking', resolved_at: null });
    expect(review.history).toEqual([expect.objectContaining({ action: 'STATUS_CHANGED', note: 'IN_REVIEW' })]);
    expect(String(review.handled_by)).toBe(handler);

    const closed = await reportService.updateStatus(handler, id, { status: 'ACTIONED' });
    expect(closed.resolved_at).toEqual(expect.any(String));

    const again = await reportService.updateStatus(handler, id, { status: 'ACTIONED' });
    expect(again.resolved_at).toBe(closed.resolved_at);
    expect(again.history).toHaveLength(2);

    const reopened = await reportService.updateStatus(handler, id, { status: 'RECEIVED' });
    expect(reopened.resolved_at).toBeNull();
    expect(reopened.history.map((h) => h.note)).toEqual(['IN_REVIEW', 'ACTIONED', 'RECEIVED']);
  });

  it('records only the resolution when no status is sent', async () => {
    const { id } = await reportService.submit(oid(), snapshot(), { reason: 'SPAM' });
    const res = await reportService.updateStatus(handler, id, { resolution: 'noted' });
    expect(res).toMatchObject({ status: 'RECEIVED', resolution: 'noted', history: [] });
  });
});

describe('verdicts', () => {
  const handler = oid();

  async function threeReportsOn(targetId: string, targetType: 'POST' | 'POD' = 'POST') {
    const owner = oid();
    const reporters = [oid(), oid(), oid()];
    const ids: string[] = [];
    for (const reporter of reporters) {
      const res = await reportService.submit(
        reporter,
        snapshot({ target_type: targetType, target_id: targetId, target_owner_id: owner }),
        { reason: 'SPAM' },
      );
      ids.push(res.id);
    }
    // The third was already dismissed by hand and must keep its own outcome.
    await ContentReportModel.updateOne({ _id: ids[2] }, { $set: { status: 'DISMISSED' } });
    notice.mockClear();
    return { owner, reporters, ids };
  }

  it('takeDown refuses content that is not a post or story', async () => {
    const { ids } = await threeReportsOn(oid(), 'POD');
    const err = await errorOf(reportService.takeDown(handler, ids[0]));
    expect(err.message).toBe('This kind of content cannot be taken down from here');
  });

  it('takeDown refuses content that is already gone and closes nothing', async () => {
    const { ids } = await threeReportsOn(oid());
    const err = await errorOf(reportService.takeDown(handler, ids[0]));
    expect(err.extensions.code).toBe('CONFLICT');
    expect(err.message).toMatch(/already gone/);
    expect((await ContentReportModel.findById(ids[0]).lean<any>()).status).toBe('RECEIVED');
  });

  it('takeDown removes the post, closes the open reports, stamps all of them and mails reporters + owner', async () => {
    const post = await insertPost();
    const { owner, reporters, ids } = await threeReportsOn(post);

    const res = await reportService.takeDown(handler, ids[0], '  nudity confirmed ');

    expect(await PostModel.countDocuments({ _id: post })).toBe(0);
    expect(res).toMatchObject({ status: 'ACTIONED', resolution: 'nudity confirmed', target_live: false });
    const stored = await ContentReportModel.find({ _id: { $in: ids } }).lean<any[]>();
    const byId = new Map(stored.map((d) => [String(d._id), d]));
    expect(byId.get(ids[1]).status).toBe('ACTIONED');
    expect(byId.get(ids[1]).history[0]).toMatchObject({ action: 'TAKEN_DOWN', note: 'nudity confirmed' });
    expect(byId.get(ids[2]).status).toBe('DISMISSED');
    expect(byId.get(ids[2]).history).toHaveLength(0);
    for (const doc of stored) expect(doc.target_removed_at).toBeInstanceOf(Date);

    const sent = notice.mock.calls.map(([n]) => [n.template, String(n.userId)]);
    expect(sent).toEqual(
      expect.arrayContaining([
        ['content-report-actioned', reporters[0]],
        ['content-report-actioned', reporters[1]],
        ['content-removed-owner', owner],
      ]),
    );
    expect(sent).toHaveLength(3);

    // A second take-down of the same content is refused.
    const again = await errorOf(reportService.takeDown(handler, ids[1]));
    expect(again.message).toBe('This content has already been taken down');
  });

  it('markOk dismisses the open reports and writes only to their reporters', async () => {
    const post = await insertPost();
    const { reporters, ids } = await threeReportsOn(post);
    await ContentReportModel.updateOne({ _id: ids[2] }, { $set: { status: 'ACTIONED' } });

    const res = await reportService.markOk(handler, ids[0], 'fine');

    expect(res).toMatchObject({ status: 'DISMISSED', resolution: 'fine', target_live: true });
    expect((await ContentReportModel.findById(ids[1]).lean<any>()).status).toBe('DISMISSED');
    expect((await ContentReportModel.findById(ids[2]).lean<any>()).status).toBe('ACTIONED');
    expect(await PostModel.countDocuments({ _id: post })).toBe(1);
    const sent = notice.mock.calls.map(([n]) => [n.template, String(n.userId)]);
    expect(sent).toHaveLength(2);
    expect(sent).toEqual(
      expect.arrayContaining([
        ['content-report-dismissed', reporters[0]],
        ['content-report-dismissed', reporters[1]],
      ]),
    );
  });

  it('markOk without a note keeps the resolution empty', async () => {
    const { ids } = await threeReportsOn(await insertPost());
    const res = await reportService.markOk(handler, ids[0]);
    expect(res.resolution).toBe('');
    expect(res.history[0]).toMatchObject({ action: 'LOOKS_GOOD', note: '' });
  });

  it('markOk refuses content that was taken down', async () => {
    const { ids } = await threeReportsOn(await insertPost());
    await ContentReportModel.updateMany({}, { $set: { target_removed_at: new Date('2026-09-01T00:00:00.000Z') } });
    const err = await errorOf(reportService.markOk(handler, ids[0]));
    expect(err.message).toBe('This content was taken down, so it cannot be marked as fine');
  });
});

describe('sendMail', () => {
  const handler = oid();

  async function reportWithPeople() {
    const reporter = await UserModel.create({ profile: { first_name: ' Ira ' }, auth: { email: 'reporter@example.com' } });
    const ownerId = new Types.ObjectId();
    await UserModel.collection.insertOne({
      _id: ownerId,
      auth: { email: 'owner@example.com' },
      // Legacy-shaped: no first name, so the greeting falls back.
      profile: {},
    });
    const { id, report_no } = await reportService.submit(
      String(reporter._id),
      snapshot({ target_owner_id: String(ownerId) }),
      { reason: 'SPAM' },
    );
    return { id, report_no };
  }

  it.each([
    [{ subject: '  ', message: 'm' }, 'Add a subject'],
    [{ subject: 's'.repeat(151), message: 'm' }, 'Keep the subject under 150 characters'],
    [{ subject: 's', message: ' ' }, 'Write a message'],
    [{ subject: 's', message: 'm'.repeat(5001) }, 'That message is too long'],
  ])('refuses %j', async (input, message) => {
    const { id } = await reportWithPeople();
    const err = await errorOf(reportService.sendMail(handler, id, { recipient: 'REPORTER', ...input }));
    expect(err.message).toBe(message);
    expect(mailer).not.toHaveBeenCalled();
  });

  it('mails the reporter at the address on their account and logs what was said', async () => {
    const { id, report_no } = await reportWithPeople();
    const res = await reportService.sendMail(handler, id, { recipient: 'REPORTER', subject: ' Update ', message: ' We acted. ' });
    expect(mailer).toHaveBeenCalledWith({ to: 'reporter@example.com', name: 'Ira', report_no, subject: 'Update', message: 'We acted.' });
    expect(res.history).toEqual([expect.objectContaining({ action: 'MAIL_REPORTER', note: 'Update\n\nWe acted.' })]);
  });

  it('mails the owner, greeting them as "there" when they have no first name', async () => {
    const { id } = await reportWithPeople();
    const res = await reportService.sendMail(handler, id, { recipient: 'OWNER', subject: 'Notice', message: 'Removed.' });
    expect(mailer).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@example.com', name: 'there' }));
    expect(res.history[0].action).toBe('MAIL_OWNER');
  });

  it('refuses when the recipient has no account or no address', async () => {
    const { id } = await reportService.submit(oid(), snapshot({ target_owner_id: null }), { reason: 'SPAM' });
    const noOwner = await errorOf(reportService.sendMail(handler, id, { recipient: 'OWNER', subject: 's', message: 'm' }));
    expect(noOwner.message).toBe('This person has no email address on their account');
    const noUser = await errorOf(reportService.sendMail(handler, id, { recipient: 'REPORTER', subject: 's', message: 'm' }));
    expect(noUser.message).toBe('This person has no email address on their account');
    expect(mailer).not.toHaveBeenCalled();
  });

  it('surfaces a refused send and records nothing', async () => {
    const { id } = await reportWithPeople();
    mailer.mockResolvedValueOnce('Mail provider refused the address');
    const err = await errorOf(reportService.sendMail(handler, id, { recipient: 'REPORTER', subject: 's', message: 'm' }));
    expect(err.message).toBe('Mail provider refused the address');
    expect(err.extensions.code).toBe('INTERNAL_SERVER_ERROR');
    expect((await ContentReportModel.findById(id).lean<any>()).history).toHaveLength(0);
  });
});
